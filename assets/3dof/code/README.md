# Codigo del proyecto 3DOF

Esta carpeta contiene los dos programas usados para la plataforma 3DOF de balanceo de pelota:

- `esp32_ball_platform.ino`: firmware del ESP32. Recibe comandos Bluetooth, limita los angulos, aplica una rampa de movimiento y controla tres servos por PWM.
- `ball_pid_vision_control.py`: programa en Python. Detecta la pelota con OpenCV, calcula el error visual y envia angulos objetivo al ESP32.

## Flujo de ejecucion

1. Cargar `esp32_ball_platform.ino` en el ESP32 desde Arduino IDE.
2. Emparejar la computadora con el ESP32 por Bluetooth.
3. Verificar o actualizar la MAC en `device_mac`.
4. Instalar las dependencias de Python.
5. Ejecutar `ball_pid_vision_control.py`.
6. Calibrar el centro con la tecla `b` cuando la pelota este en el centro fisico.

## Controles en vivo

- `q`: salir del programa.
- `c`: enviar `LOST` y nivelar la plataforma.
- `x`: invertir el eje X.
- `y`: invertir el eje Y.
- `s`: intercambiar ejes X/Y.
- `b`: calibrar el centro usando la ultima posicion detectada de la pelota.

## Dependencias

```bash
pip install opencv-python numpy pybluez
```

Nota: `pybluez` puede requerir configuracion adicional segun Windows, adaptador Bluetooth y version de Python.

## Nota tecnica

El proyecto se puede describir como una plataforma de control PID por su arquitectura de control realimentado. El script compartido implementa una version PD experimental: usa ganancia proporcional y derivada filtrada (`Kp`, `Kd`), sin termino integral activo.
