# Guia de Conexiones - Sleep Monitor (Raspberry Pi 5)

Esta es la conexion final del proyecto con el dashboard nuevo:

- Temperatura: por internet con Open-Meteo, sin sensor fisico.
- Movimiento: PIR HC-SR501.
- Ventiladores: 2 ventiladores con modulo de relevadores.
- Indicador: LED comun para movimiento.
- Cortina: 1 motor DC con puente H L298N.

## 1. Temperatura online

No conectes DHT11, LM35 ni MCP3008. El dashboard toma la temperatura actual desde Open-Meteo usando latitud/longitud en la pestana de configuracion.

Si no hay internet, el dashboard puede seguir abriendo, pero la temperatura aparecera sin lectura y el modo automatico de ventiladores no tendra dato nuevo.

## 2. PIR HC-SR501

| PIR | Raspberry Pi |
| :--- | :--- |
| VCC | 5V |
| GND | GND |
| OUT | GPIO 24 / pin fisico 18 |

El PIR entrega HIGH cuando detecta movimiento. El dashboard lo muestra en tiempo real y prende el LED de movimiento.

## 3. LED de movimiento

Usa un LED comun con resistencia de 220 a 330 ohm.

| LED | Raspberry Pi |
| :--- | :--- |
| Anodo (+), con resistencia en serie | GPIO 12 / pin fisico 32 |
| Catodo (-) | GND |

## 4. Ventiladores con relevadores

El modulo de relevadores se usa en modo active-low. Los ventiladores van al contacto NO para que queden apagados cuando el sistema arranca.

| Modulo rele | Raspberry Pi |
| :--- | :--- |
| IN1 | GPIO 17 / pin fisico 11 |
| IN2 | GPIO 27 / pin fisico 13 |
| VCC | 5V |
| GND | GND comun |

Conexion de potencia para cada ventilador:

| Cable | Conexion |
| :--- | :--- |
| Positivo fuente motor | COM del rele |
| NO del rele | Positivo del ventilador |
| Negativo ventilador | Negativo fuente motor |
| Negativo fuente motor | GND comun con Raspberry |

## 5. Motor DC de cortina con L298N

Usa solo el canal A del L298N. Quita el jumper de ENA para que la Raspberry pueda controlar velocidad por PWM.

| L298N | Raspberry Pi / Motor |
| :--- | :--- |
| IN1 | GPIO 5 / pin fisico 29 |
| IN2 | GPIO 6 / pin fisico 31 |
| ENA | GPIO 13 / pin fisico 33 |
| OUT1 / OUT2 | Dos cables del motor DC |
| +12V | Positivo de la fuente del motor, o el voltaje real del motor |
| GND | GND de fuente motor y GND comun con Raspberry |
| +5V | Sin conectar si el jumper POWER/5V-EN esta puesto |

Si la cortina abre cuando deberia cerrar, intercambia los cables del motor en OUT1/OUT2 o invierte IN1/IN2 en el codigo.

## 6. Comandos de prueba

Desde la carpeta del proyecto:

```bash
.venv/bin/python -u test_hardware/test_pir.py
.venv/bin/python -u test_hardware/test_led.py
.venv/bin/python -u test_hardware/test_fans.py
.venv/bin/python -u test_hardware/test_curtain_motors.py
```

Para abrir el dashboard:

```bash
.venv/bin/python -u dashboard.py
```
