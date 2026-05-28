import cv2
import numpy as np
import bluetooth
import time

# ========= BLUETOOTH =========
device_mac = "F0:24:F9:0C:4C:DE"   # MISMA MAC DEL ESP32
port = 1

# ========= PARAMETROS SERVOS =========
NEUT_IZQ  = 90
NEUT_DER  = 90
NEUT_VERT = 60

# ----- MODO TEST (para exagerar el movimiento) -----
TEST_MODE = True   # Cambia a False cuando ya quieras algo mas fino

if TEST_MODE:
    # Mucho mas movimiento de servos
    MAX_SERVO_OFFSET_X = 50.0   # antes 40
    MAX_SERVO_OFFSET_Y = 35.0   # antes 30

    # Control mas agresivo y SIN derivada (mas facil ver el sentido)
    KpX = 2.0
    KdX = 0.0

    KpY = 2.0
    KdY = 0.0
else:
    # Valores mas tranquilos para uso normal
    MAX_SERVO_OFFSET_X = 40.0
    MAX_SERVO_OFFSET_Y = 30.0

    KpX = 0.8
    KdX = 0.2

    KpY = 0.8
    KdY = 0.2

# ====== FLAGS DE ORIENTACION (LOS VAS CAMBIANDO EN VIVO) ======
INVERT_X = False   # lo puedes cambiar con la tecla 'x'
INVERT_Y = False   # lo puedes cambiar con la tecla 'y'
SWAP_AXES = False  # si True, intercambia X<->Y (tecla 's')

alpha = 0.8          # filtro para derivada
MIN_DT_CMD = 0.015   # 15 ms (~66 Hz max)

last_cmd_time = 0.0
last_time = time.time()

last_errx = 0.0
last_erry = 0.0
dxf = 0.0
dyf = 0.0

# Centro calibrado de la plataforma (en pixeles de la imagen)
centerX = None
centerY = None

# Ultima posicion conocida de la pelota (para la tecla 'b')
last_ball_x = None
last_ball_y = None

# ========= CONEXION BLUETOOTH =========
sock = None
print("Intentando conectar al ESP32 por Bluetooth...", device_mac)
while True:
    try:
        sock = bluetooth.BluetoothSocket()
        sock.settimeout(10)
        sock.connect((device_mac, port))
        print("Conectado al ESP32!")
        break
    except Exception as e:
        print("Error de conexion, reintentando:", e)
        time.sleep(1)

# ========= CAMARA (LA QUE VE LA PLATAFORMA) =========
# Cambia 1 a 0 si tu otra camara es la que ve la plataforma
video = cv2.VideoCapture(1)

# ========= RANGO HSV PARA LA PELOTA (EJEMPLO: NARANJA) =========
LOWER = np.array([10, 150, 120], np.uint8)
UPPER = np.array([25, 255, 255], np.uint8)

kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))

while True:
    ok, frame = video.read()
    if not ok:
        break

    # Si la camara te da la imagen al reves y quieres voltearla:
    # frame = cv2.flip(frame, 1)

    h, w = frame.shape[:2]

    # Si aun no hay centro calibrado, por defecto usa el centro de la imagen
    if centerX is None or centerY is None:
        centerX = w // 2
        centerY = h // 2

    now = time.time()
    dt = now - last_time if now > last_time else 0.01
    send_allowed = (now - last_cmd_time) >= MIN_DT_CMD

    # --- Deteccion de pelota por color ---
    hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
    mask = cv2.inRange(hsv, LOWER, UPPER)
    mask = cv2.erode(mask, kernel, iterations=2)
    mask = cv2.dilate(mask, kernel, iterations=2)

    contornos, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    tiene_pelota = False

    if len(contornos) > 0:
        c = max(contornos, key=cv2.contourArea)
        (x, y), radio = cv2.minEnclosingCircle(c)

        if radio > 5:  # umbral minimo para ruido
            tiene_pelota = True

            x = int(x)
            y = int(y)
            radio = int(radio)

            # Guardamos ultima posicion de la pelota
            last_ball_x = x
            last_ball_y = y

            # Dibujar pelota
            cv2.circle(frame, (x, y), radio, (255, 0, 0), 2)
            cv2.circle(frame, (x, y), 3, (255, 0, 0), -1)

            # Dibujar lineas del centro calibrado
            cx = int(centerX)
            cy = int(centerY)
            cv2.line(frame, (cx, 0), (cx, h), (0, 255, 255), 1)
            cv2.line(frame, (0, cy), (w, cy), (0, 255, 255), 1)
            cv2.circle(frame, (cx, cy), 5, (0, 255, 0), -1)  # centro calibrado

            # Errores normalizados respecto al centro calibrado
            errx_img = (x - cx) / (w / 2)   # derecha +, izquierda -
            erry_img = (y - cy) / (h / 2)   # abajo +, arriba -

            # Posible intercambio de ejes
            if SWAP_AXES:
                errx_raw = erry_img
                erry_raw = errx_img
            else:
                errx_raw = errx_img
                erry_raw = erry_img

            # Mostrar errores crudos para debug
            cv2.putText(frame, f"Ex_raw:{errx_raw:+.2f} Ey_raw:{erry_raw:+.2f}",
                        (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (255, 255, 255), 2)

            # --- Control PD ---
            derx = (errx_raw - last_errx) / dt
            dery = (erry_raw - last_erry) / dt

            dxf = alpha * dxf + (1 - alpha) * derx
            dyf = alpha * dyf + (1 - alpha) * dery

            uX = KpX * errx_raw + KdX * dxf
            uY = KpY * erry_raw + KdY * dyf

            # Limitamos uX, uY a [-1,1]
            uX = float(np.clip(uX, -1.0, 1.0))
            uY = float(np.clip(uY, -1.0, 1.0))

            # Invertir si hace falta (lo cambias en vivo con 'x' y 'y')
            if INVERT_X:
                uX = -uX
            if INVERT_Y:
                uY = -uY

            # Offset de servos en grados
            servo_off_X = uX * MAX_SERVO_OFFSET_X
            servo_off_Y = uY * MAX_SERVO_OFFSET_Y

            # Angulos logicos absolutos
            ang_izq  = NEUT_IZQ  - servo_off_X
            ang_der  = NEUT_DER  + servo_off_X
            ang_vert = NEUT_VERT - servo_off_Y

            # Limitar a 0..180
            ang_izq  = int(np.clip(ang_izq,  0, 180))
            ang_der  = int(np.clip(ang_der,  0, 180))
            ang_vert = int(np.clip(ang_vert, 0, 180))

            cv2.putText(frame,
                        f"IZQ:{ang_izq} DER:{ang_der} VERT:{ang_vert}",
                        (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                        (0, 255, 255), 2)

            # --- Enviar comando ANG: ---
            if send_allowed:
                try:
                    cmd = f"ANG:{ang_izq},{ang_der},{ang_vert}\n"
                    sock.send(cmd.encode())
                    # print("CMD ->", cmd.strip())
                    last_cmd_time = now
                except Exception as e:
                    print("Error al enviar ANG:", e)

            last_errx = errx_raw
            last_erry = erry_raw
            last_time = now

    if not tiene_pelota:
        cv2.putText(frame, "PELOTA NO DETECTADA", (10, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7,
                    (0, 0, 255), 2)
        # Opcional: si pierdes la pelota, manda LOST para nivelar
        if send_allowed:
            try:
                sock.send(b"LOST\n")
                last_cmd_time = now
            except Exception as e:
                print("Error al enviar LOST:", e)

    # Mostrar estado de flags
    status = f"invX:{INVERT_X}  invY:{INVERT_Y}  swap:{SWAP_AXES}  TEST:{TEST_MODE}"
    cv2.putText(frame, status, (10, h - 10),
                cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)

    cv2.imshow("Ball Balancing Control", frame)
    cv2.imshow("Mascara", mask)

    key = cv2.waitKey(1) & 0xFF
    if key == ord('q'):
        break
    elif key == ord('c'):
        # Tecla 'c' para nivelar manualmente (centro por firmware)
        try:
            sock.send(b"LOST\n")
            last_cmd_time = time.time()
            print("Comando LOST enviado (plataforma al centro).")
        except Exception as e:
            print("Error al enviar LOST:", e)
    elif key == ord('x'):
        INVERT_X = not INVERT_X
        print("INVERT_X ->", INVERT_X)
    elif key == ord('y'):
        INVERT_Y = not INVERT_Y
        print("INVERT_Y ->", INVERT_Y)
    elif key == ord('s'):
        SWAP_AXES = not SWAP_AXES
        print("SWAP_AXES ->", SWAP_AXES)
    elif key == ord('b'):
        # Calibrar centro con la pelota en el centro fisico
        if last_ball_x is not None and last_ball_y is not None:
            centerX = last_ball_x
            centerY = last_ball_y
            print(f"Centro calibrado en ({centerX}, {centerY})")

video.release()
sock.close()
cv2.destroyAllWindows()
