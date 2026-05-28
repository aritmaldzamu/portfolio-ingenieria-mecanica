# -*- coding: utf-8 -*-
"""
hardware_real.py - Controlador de hardware fisico para Raspberry Pi 5
====================================================================

Sensores:
  - PIR HC-SR501             (GPIO 24, pin 18) -> Movimiento digital

Actuadores:
  - Rele IN1                 (GPIO 17, pin 11) -> Ventilador 1
  - Rele IN2                 (GPIO 27, pin 13) -> Ventilador 2
  - LED movimiento           (GPIO 12, pin 32)
  - L298N IN1                (GPIO 5,  pin 29) -> Motor cortina
  - L298N IN2                (GPIO 6,  pin 31) -> Motor cortina
  - L298N ENA                (GPIO 13, pin 33) -> PWM motor cortina

La temperatura ya no viene de un sensor fisico. El dashboard la consulta por
internet con Open-Meteo y desde ahi decide si prender o apagar ventiladores.
"""

import threading
import time

try:
    import RPi.GPIO as GPIO
    _HW_AVAILABLE = True
except ImportError:
    _HW_AVAILABLE = False
    print("[hardware_real] AVISO: RPi.GPIO no disponible; probando gpiozero/lgpio.")

try:
    from gpiozero import MotionSensor, OutputDevice, PWMOutputDevice
    from gpiozero.pins.lgpio import LGPIOFactory
    _GPIOZERO_AVAILABLE = True
except ImportError:
    _GPIOZERO_AVAILABLE = False
    print("[hardware_real] AVISO: gpiozero/lgpio no disponible para Raspberry Pi 5.")


# Pines BCM
PIN_PIR = 24
PIN_RELAY_1 = 17
PIN_RELAY_2 = 27
PIN_LED_MOV = 12
PIN_CURTAIN_A = 5
PIN_CURTAIN_B = 6
PIN_CURTAIN_EN = 13

# Ajuste final que se probo bien para mover la cortina lento.
CURTAIN_SPEED = 0.03
CURTAIN_TRAVEL_SECONDS = 8
FAN_SPEED_DEFAULT = 100


class HardwareReal:
    """Interfaz de hardware real compatible con el dashboard."""

    def __init__(self, btn_calor_callback=None, btn_frio_callback=None):
        self._temp = None
        self._hum = None
        self._lux = None
        self._mov = 0.0

        self.fan_on = False
        self._fan_speed = FAN_SPEED_DEFAULT
        self.humidifier_on = False
        self.led_on = False
        self.curtain_state = "stopped"
        self.running = True

        self._btn_calor_cb = btn_calor_callback
        self._btn_frio_cb = btn_frio_callback

        self._hw_active = False
        self._relay_factory = None
        self._relay_1 = None
        self._relay_2 = None
        self._pir_factory = None
        self._pir_sensor = None
        self._led_factory = None
        self._led = None
        self._curtain_factory = None
        self._curtain_outputs = {}

        if _HW_AVAILABLE:
            try:
                self._init_gpio()
                self._hw_active = True
            except Exception as exc:
                self._hw_active = False
                print(f"[hardware_real] RPi.GPIO no usable en Pi 5; usando gpiozero/lgpio: {exc}")
                try:
                    GPIO.cleanup()
                except Exception:
                    pass

        if not self._hw_active:
            self._init_relays_gpiozero()
            self._init_pir_gpiozero()
            self._init_led_gpiozero()
            self._init_curtain_gpiozero()

        self._read_thread = threading.Thread(target=self._sensor_loop, daemon=True)
        self._read_thread.start()

    # Inicializacion

    def _init_gpio(self):
        GPIO.setmode(GPIO.BCM)
        GPIO.setwarnings(False)

        # Relevadores active-low: HIGH apagado, LOW encendido.
        GPIO.setup(PIN_RELAY_1, GPIO.OUT, initial=GPIO.HIGH)
        GPIO.setup(PIN_RELAY_2, GPIO.OUT, initial=GPIO.HIGH)
        GPIO.setup(PIN_LED_MOV, GPIO.OUT, initial=GPIO.LOW)
        GPIO.setup(PIN_CURTAIN_A, GPIO.OUT, initial=GPIO.LOW)
        GPIO.setup(PIN_CURTAIN_B, GPIO.OUT, initial=GPIO.LOW)
        GPIO.setup(PIN_CURTAIN_EN, GPIO.OUT, initial=GPIO.LOW)
        GPIO.setup(PIN_PIR, GPIO.IN)
        GPIO.add_event_detect(PIN_PIR, GPIO.BOTH, callback=self._on_pir_change, bouncetime=200)
        print("[hardware_real] GPIO inicializado con RPi.GPIO.")

    def _init_relays_gpiozero(self):
        if not _GPIOZERO_AVAILABLE:
            return
        try:
            self._relay_factory = LGPIOFactory()
            self._relay_1 = OutputDevice(
                PIN_RELAY_1, active_high=False, initial_value=False,
                pin_factory=self._relay_factory,
            )
            self._relay_2 = OutputDevice(
                PIN_RELAY_2, active_high=False, initial_value=False,
                pin_factory=self._relay_factory,
            )
            print("[hardware_real] Reles OK via gpiozero/lgpio (active LOW).")
        except Exception as exc:
            self._relay_1 = None
            self._relay_2 = None
            self._close_factory("_relay_factory")
            print(f"[hardware_real] Reles gpiozero error: {exc}")

    def _init_pir_gpiozero(self):
        if not _GPIOZERO_AVAILABLE:
            return
        try:
            self._pir_factory = LGPIOFactory()
            self._pir_sensor = MotionSensor(PIN_PIR, pin_factory=self._pir_factory)
            self._pir_sensor.when_motion = self._on_pir_gpiozero_motion
            self._pir_sensor.when_no_motion = self._on_pir_gpiozero_no_motion
            print(f"[hardware_real] PIR OK via gpiozero/lgpio (GPIO {PIN_PIR}).")
        except Exception as exc:
            self._pir_sensor = None
            self._close_factory("_pir_factory")
            print(f"[hardware_real] PIR gpiozero error: {exc}")

    def _init_led_gpiozero(self):
        if not _GPIOZERO_AVAILABLE:
            return
        try:
            self._led_factory = LGPIOFactory()
            self._led = OutputDevice(
                PIN_LED_MOV, active_high=True, initial_value=False,
                pin_factory=self._led_factory,
            )
            print(f"[hardware_real] LED movimiento OK via gpiozero/lgpio (GPIO {PIN_LED_MOV}).")
        except Exception as exc:
            self._led = None
            self._close_factory("_led_factory")
            print(f"[hardware_real] LED gpiozero error: {exc}")

    def _init_curtain_gpiozero(self):
        if not _GPIOZERO_AVAILABLE:
            return
        try:
            self._curtain_factory = LGPIOFactory()
            self._curtain_outputs = {
                "a": OutputDevice(PIN_CURTAIN_A, initial_value=False, pin_factory=self._curtain_factory),
                "b": OutputDevice(PIN_CURTAIN_B, initial_value=False, pin_factory=self._curtain_factory),
                "en": PWMOutputDevice(
                    PIN_CURTAIN_EN, initial_value=0.0, frequency=100,
                    pin_factory=self._curtain_factory,
                ),
            }
            print("[hardware_real] Motor cortina OK via gpiozero/lgpio (L298N canal A).")
        except Exception as exc:
            self._curtain_outputs = {}
            self._close_factory("_curtain_factory")
            print(f"[hardware_real] Motor cortina gpiozero error: {exc}")

    # Sensores

    def _sensor_loop(self):
        while self.running:
            self.get_movement()
            time.sleep(0.25)

    def _on_pir_change(self, channel):
        try:
            self._mov = 1.0 if GPIO.input(PIN_PIR) else 0.0
            self.set_led(bool(self._mov))
        except Exception:
            pass

    def _on_pir_gpiozero_motion(self):
        self._mov = 1.0
        self.set_led(True)

    def _on_pir_gpiozero_no_motion(self):
        self._mov = 0.0
        self.set_led(False)

    def get_temperature(self):
        """La temperatura fisica esta deshabilitada; usar clima online del dashboard."""
        return self._temp

    def get_humidity(self):
        return self._hum

    def get_light(self):
        return self._lux

    def get_movement(self):
        if self._pir_sensor is not None:
            try:
                self._mov = 1.0 if self._pir_sensor.motion_detected else 0.0
                self.set_led(bool(self._mov))
            except Exception:
                pass
        elif self._hw_active:
            try:
                self._mov = 1.0 if GPIO.input(PIN_PIR) else 0.0
                self.set_led(bool(self._mov))
            except Exception:
                pass
        return self._mov

    # Actuadores

    def set_led(self, state: bool):
        self.led_on = bool(state)
        try:
            if self._led is not None:
                self._led.on() if self.led_on else self._led.off()
            elif self._hw_active:
                GPIO.output(PIN_LED_MOV, GPIO.HIGH if self.led_on else GPIO.LOW)
        except Exception as exc:
            print(f"[hardware_real] Error LED: {exc}")

    def set_fan(self, state: bool, speed=None):
        previous = self.fan_on
        self.fan_on = bool(state)
        if speed is not None:
            self._fan_speed = max(0, min(100, int(speed)))

        try:
            if self._relay_1 is not None and self._relay_2 is not None:
                if self.fan_on:
                    self._relay_1.on()
                    self._relay_2.on()
                else:
                    self._relay_1.off()
                    self._relay_2.off()
            elif self._hw_active:
                level = GPIO.LOW if self.fan_on else GPIO.HIGH
                GPIO.output(PIN_RELAY_1, level)
                GPIO.output(PIN_RELAY_2, level)
        except Exception as exc:
            print(f"[hardware_real] Error ventiladores: {exc}")

        if previous != self.fan_on:
            print(f"[hardware_real] Ventiladores {'ON' if self.fan_on else 'OFF'}")

    def set_fan_speed(self, percent: int):
        self._fan_speed = max(0, min(100, int(percent)))
        if self._fan_speed <= 0:
            self.set_fan(False)
        else:
            self.set_fan(True)

    def set_humidifier(self, state: bool):
        self.humidifier_on = bool(state)
        print("[hardware_real] Humidificador no instalado en este pinout.")

    def set_curtain_motor(self, direction: int):
        if direction > 0:
            a_on, b_on, label = True, False, "closing"
        elif direction < 0:
            a_on, b_on, label = False, True, "opening"
        else:
            self.stop_curtain_motors()
            return

        self.curtain_state = label
        try:
            if self._curtain_outputs:
                self._curtain_outputs["en"].value = CURTAIN_SPEED
                self._curtain_outputs["a"].on() if a_on else self._curtain_outputs["a"].off()
                self._curtain_outputs["b"].on() if b_on else self._curtain_outputs["b"].off()
            elif self._hw_active:
                GPIO.output(PIN_CURTAIN_A, GPIO.HIGH if a_on else GPIO.LOW)
                GPIO.output(PIN_CURTAIN_B, GPIO.HIGH if b_on else GPIO.LOW)
                GPIO.output(PIN_CURTAIN_EN, GPIO.HIGH)
        except Exception as exc:
            print(f"[hardware_real] Error motor cortina: {exc}")

    def stop_curtain_motors(self):
        self.curtain_state = "stopped"
        try:
            if self._curtain_outputs:
                self._curtain_outputs["en"].value = 0.0
                self._curtain_outputs["a"].off()
                self._curtain_outputs["b"].off()
            elif self._hw_active:
                GPIO.output(PIN_CURTAIN_EN, GPIO.LOW)
                GPIO.output(PIN_CURTAIN_A, GPIO.LOW)
                GPIO.output(PIN_CURTAIN_B, GPIO.LOW)
        except Exception as exc:
            print(f"[hardware_real] Error deteniendo cortina: {exc}")

    def set_curtain_motors(self, left_direction=0, right_direction=0):
        # Compatibilidad con versiones anteriores: ahora solo hay un motor.
        direction = left_direction if left_direction else right_direction
        self.set_curtain_motor(direction)

    def open_curtain(self, seconds: float = CURTAIN_TRAVEL_SECONDS):
        self.set_curtain_motor(-1)
        time.sleep(seconds)
        self.stop_curtain_motors()

    def close_curtain(self, seconds: float = CURTAIN_TRAVEL_SECONDS):
        self.set_curtain_motor(1)
        time.sleep(seconds)
        self.stop_curtain_motors()

    # Compatibilidad con dashboard anterior

    def force_temperature(self, temp: float):
        self._temp = temp

    def clear_override(self):
        self._temp = None

    def stop(self):
        self.running = False
        self.set_fan(False)
        self.set_led(False)
        self.stop_curtain_motors()

        for device in (
            self._relay_1,
            self._relay_2,
            self._pir_sensor,
            self._led,
            *self._curtain_outputs.values(),
        ):
            try:
                if device is not None:
                    device.close()
            except Exception:
                pass

        for attr in (
            "_relay_factory",
            "_pir_factory",
            "_led_factory",
            "_curtain_factory",
        ):
            self._close_factory(attr)

        if self._hw_active:
            try:
                GPIO.cleanup()
            except Exception:
                pass

        print("[hardware_real] Hardware detenido.")

    def _close_factory(self, attr):
        factory = getattr(self, attr, None)
        if factory is None:
            return
        try:
            factory.close()
        except Exception:
            pass
        setattr(self, attr, None)
