# -*- coding: utf-8 -*-
"""
Detector de vision de respaldo con OpenCV.

Se usa cuando MediaPipe no esta disponible en Raspberry/Python. Detecta cara y
ojos con Haar Cascade para estimar despierto/dormido de forma sencilla.
"""

import time

import cv2

from PyQt5.QtCore import QThread, pyqtSignal
from PyQt5.QtGui import QImage, QPixmap


class VisionDetector(QThread):
    frame_ready = pyqtSignal(QPixmap)
    status_ready = pyqtSignal(dict)

    def __init__(self, camera_index=0):
        super().__init__()
        self.camera_index = camera_index
        self.running = True
        self._closed_eye_counter = 0
        self._face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        self._eye_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_eye_tree_eyeglasses.xml"
        )

    def run(self):
        cap = cv2.VideoCapture(self.camera_index)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 15)
        time.sleep(0.5)

        if not cap.isOpened():
            self.status_ready.emit({
                "sleeping": False,
                "snoring_risk": False,
                "head_moving": False,
                "ear": 0.0,
                "mar": 0.0,
                "head_delta": 0.0,
                "sleep_quality": "CAMARA NO DISPONIBLE",
                "ear_counter": 0,
            })
            cap.release()
            return

        while self.running:
            ok, frame = cap.read()
            if not ok:
                time.sleep(0.05)
                continue

            gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
            faces = self._face_cascade.detectMultiScale(gray, 1.2, 5, minSize=(80, 80))

            sleeping = False
            quality = "SIN DATOS"
            face_detected = len(faces) > 0

            if face_detected:
                x, y, w, h = max(faces, key=lambda item: item[2] * item[3])
                cv2.rectangle(frame, (x, y), (x + w, y + h), (139, 92, 246), 2)
                upper_face = gray[y:y + h // 2, x:x + w]
                eyes = self._eye_cascade.detectMultiScale(upper_face, 1.15, 4, minSize=(18, 18))

                for ex, ey, ew, eh in eyes[:2]:
                    cv2.rectangle(frame, (x + ex, y + ey), (x + ex + ew, y + ey + eh), (80, 220, 100), 1)

                if len(eyes) == 0:
                    self._closed_eye_counter += 1
                else:
                    self._closed_eye_counter = max(0, self._closed_eye_counter - 3)

                sleeping = self._closed_eye_counter >= 18
                quality = "DORMIDO" if sleeping else "DESPIERTO"
                text = f"{quality} · ojos detectados: {len(eyes)}"
                color = (80, 220, 100) if sleeping else (230, 230, 230)
            else:
                self._closed_eye_counter = max(0, self._closed_eye_counter - 1)
                text = "Sin cara detectada"
                color = (120, 120, 120)

            cv2.rectangle(frame, (8, 8), (360, 42), (20, 20, 20), -1)
            cv2.putText(frame, text, (14, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.65, color, 2, cv2.LINE_AA)

            self.status_ready.emit({
                "sleeping": sleeping,
                "snoring_risk": False,
                "head_moving": False,
                "ear": 0.0,
                "mar": 0.0,
                "head_delta": 0.0,
                "sleep_quality": quality,
                "ear_counter": self._closed_eye_counter,
            })

            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            hh, ww, ch = rgb.shape
            qt_img = QImage(rgb.data, ww, hh, ch * ww, QImage.Format_RGB888)
            self.frame_ready.emit(QPixmap.fromImage(qt_img))
            time.sleep(0.06)

        cap.release()

    def stop(self):
        self.running = False
        self.wait()
