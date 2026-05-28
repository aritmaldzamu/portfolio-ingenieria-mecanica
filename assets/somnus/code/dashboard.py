# -*- coding: utf-8 -*-
import csv
import json
import math
import socket
import sys
import threading
import time
import urllib.parse
import urllib.request
from collections import deque
from datetime import datetime

import openpyxl
import pyqtgraph as pg
from PyQt5.QtCore import QDateTime, QObject, QThread, QTimer, Qt, pyqtSignal
from PyQt5.QtGui import QColor, QFont, QPainter, QPen
from PyQt5.QtWidgets import QApplication, QFileDialog, QFrame, QLabel, QMainWindow, QMessageBox, QVBoxLayout

from frontend import Ui_MainWindow
from firestore_crud import FirestoreManager
from hardware_real import HardwareReal

try:
    from detector_vision_mediapipe import VisionDetector
    VISION_IMPORT_ERROR = None
    VISION_BACKEND = "MediaPipe Face Mesh"
except Exception as exc:
    VISION_IMPORT_ERROR = str(exc)
    try:
        from detector_vision_opencv import VisionDetector
        VISION_BACKEND = "OpenCV fallback"
    except Exception as fallback_exc:
        VisionDetector = None
        VISION_BACKEND = "No disponible"
        VISION_IMPORT_ERROR = f"{VISION_IMPORT_ERROR}; fallback: {fallback_exc}"


class ScoreRing(QLabel):
    def __init__(self, parent=None):
        super().__init__(parent)
        self.score = 0
        self.setMinimumSize(140, 140)
        self.setMaximumSize(140, 140)

    def set_score(self, value):
        self.score = max(0, min(100, int(value)))
        self.update()

    def paintEvent(self, event):
        painter = QPainter(self)
        painter.setRenderHint(QPainter.Antialiasing)
        size = min(self.width(), self.height())
        cx, cy = self.width() // 2, self.height() // 2
        radius = size // 2 - 14
        painter.setPen(QPen(QColor("#242428"), 10, Qt.SolidLine, Qt.RoundCap))
        painter.drawArc(cx - radius, cy - radius, radius * 2, radius * 2, 225 * 16, -270 * 16)
        color = QColor("#b8f2b8") if self.score >= 70 else QColor("#e6d28e") if self.score >= 40 else QColor("#f28e8e")
        painter.setPen(QPen(color, 10, Qt.SolidLine, Qt.RoundCap))
        painter.drawArc(cx - radius, cy - radius, radius * 2, radius * 2, 225 * 16, int(-270 * self.score / 100 * 16))
        painter.setPen(QColor("#ededf0"))
        painter.setFont(QFont("DejaVu Sans", 24, QFont.Bold))
        painter.drawText(self.rect().adjusted(0, -8, 0, -8), Qt.AlignCenter, str(self.score))
        painter.setPen(QColor("#8a8a93"))
        painter.setFont(QFont("DejaVu Sans", 8))
        painter.drawText(self.rect().adjusted(0, 34, 0, 34), Qt.AlignCenter, "SCORE")


class WeatherWorker(QObject):
    finished = pyqtSignal(dict)
    failed = pyqtSignal(str)

    def __init__(self, lat, lon, timeout=8):
        super().__init__()
        self.lat = lat
        self.lon = lon
        self.timeout = timeout

    def run(self):
        params = urllib.parse.urlencode({
            "latitude": self.lat,
            "longitude": self.lon,
            "current": "temperature_2m",
            "timezone": "auto",
        })
        url = f"https://api.open-meteo.com/v1/forecast?{params}"
        try:
            with urllib.request.urlopen(url, timeout=self.timeout) as response:
                data = json.loads(response.read().decode("utf-8"))
            current = data.get("current") or {}
            temp = current.get("temperature_2m")
            if temp is None:
                raise ValueError("Respuesta sin temperature_2m")
            self.finished.emit({
                "temperature": float(temp),
                "time": current.get("time") or datetime.now().isoformat(timespec="minutes"),
                "source": "api.open-meteo.com",
            })
        except Exception as exc:
            self.failed.emit(str(exc))


class SleepMonitorApp(QMainWindow):
    command_received = pyqtSignal(str, str, object)
    PULSE_ON = 40
    PULSE_PERIOD = 400

    def __init__(self):
        super().__init__()
        self.ui = Ui_MainWindow()
        self.ui.setupUi(self)

        self.hardware = HardwareReal()
        self.session_start = datetime.now()
        self.sample_count = 0
        self.session_active = True
        self.temperature = None
        self.weather_updated_at = None
        self.weather_time = None
        self.fan_auto = True
        self.fan_on = False
        self.curtain_position = 0
        self.curtain_direction = 0
        self.curtain_started_at = None
        self.curtain_duration = self.ui.cfgCurtainSec.value()
        self.motion_window = deque(maxlen=20)
        self.history = {"ts": [], "temp": [], "mov": [], "activity": []}
        self.active_chart = "all"
        self.weather_thread = None
        self.weather_worker = None
        self.firestore = FirestoreManager()
        self.firestore_busy = False
        self.command_busy = False
        self.last_command_signature = None
        self.last_motion = 0.0
        self.last_activity = 0
        self.vision_detector = None
        self.vision_status = {
            "available": False,
            "face_detected": False,
            "sleeping": False,
            "sleep_state_label": "VISION OFF",
            "sleep_quality": "SIN VISION",
            "ear": 0.0,
            "mar": 0.0,
            "head_delta": 0.0,
            "snoring_risk": False,
            "head_moving": False,
            "ear_counter": 0,
        }

        self._setup_score_ring()
        self._setup_chart()
        self._setup_vision_panel()
        self._connect_ui()
        self.command_received.connect(self._apply_firestore_commands)
        self._apply_defaults()

        self.clock_timer = QTimer(self)
        self.clock_timer.timeout.connect(self._tick_clock)
        self.clock_timer.start(1000)

        self.sample_timer = QTimer(self)
        self.sample_timer.timeout.connect(self._sample)
        self.sample_timer.start(self.ui.cfgInterval.value() * 1000)

        self.motion_timer = QTimer(self)
        self.motion_timer.timeout.connect(self._poll_motion)
        self.motion_timer.start(250)

        self.command_timer = QTimer(self)
        self.command_timer.timeout.connect(self._poll_firestore_commands)
        self.command_timer.start(1500)

        self.weather_timer = QTimer(self)
        self.weather_timer.timeout.connect(self.refresh_weather)
        self.weather_timer.start(self.ui.spnWeatherRefresh.value() * 1000)

        self.curtain_timer = QTimer(self)
        self.curtain_timer.timeout.connect(self._curtain_pulse)

        self.refresh_weather()
        self._start_vision()
        self.firestore.ensure_command_defaults()
        self._poll_firestore_commands()
        self._poll_motion()
        self._sample()

    def _setup_score_ring(self):
        old = self.ui.scoreRing
        self.score_ring = ScoreRing(self.ui.cardHero)
        self.ui.heroLayout.replaceWidget(old, self.score_ring)
        old.deleteLater()

    def _setup_chart(self):
        pg.setConfigOption("background", "#0e0e10")
        pg.setConfigOption("foreground", "#8a8a93")
        self.plot = pg.PlotWidget()
        self.plot.setMinimumHeight(180)
        self.plot.showGrid(x=True, y=True, alpha=0.15)
        self.plot.setYRange(0, 100, padding=0.05)
        self.plot.getAxis("left").setLabel("Valor")
        self.plot.getAxis("bottom").setLabel("Muestra")
        self.curves = {
            "temp": self.plot.plot(pen=pg.mkPen("#c7c7cc", width=2), name="Temp"),
            "mov": self.plot.plot(pen=pg.mkPen("#f28e8e", width=2), name="Mov"),
            "activity": self.plot.plot(pen=pg.mkPen("#9ecbff", width=2), name="Actividad"),
        }
        self.ui.chartPlaceholder.hide()
        self.ui.chartArea.layout().addWidget(self.plot)

    def _setup_vision_panel(self):
        self.vision_card = QFrame(self.ui.pageDashboard)
        self.vision_card.setObjectName("cardVision")
        self.vision_card.setProperty("role", "page-card")
        self.vision_card.setStyleSheet(
            "QFrame#cardVision { background:#131315; border:1px solid #242428; border-radius:16px; }"
        )
        layout = QVBoxLayout(self.vision_card)
        layout.setContentsMargins(18, 16, 18, 16)
        layout.setSpacing(10)

        self.lblVisionTitle = QLabel("Vision Face Mesh", self.vision_card)
        self.lblVisionTitle.setStyleSheet("color:#ededf0; font-size:16px; font-weight:700;")
        layout.addWidget(self.lblVisionTitle)

        self.lblVisionStatus = QLabel("Inicializando camara...", self.vision_card)
        self.lblVisionStatus.setStyleSheet("color:#c7c7cc; font-size:13px;")
        self.lblVisionStatus.setWordWrap(True)
        layout.addWidget(self.lblVisionStatus)

        self.lblVisionFrame = QLabel(self.vision_card)
        self.lblVisionFrame.setMinimumHeight(220)
        self.lblVisionFrame.setAlignment(Qt.AlignCenter)
        self.lblVisionFrame.setStyleSheet(
            "background:#0e0e10; border:1px solid #1f1f22; border-radius:12px; color:#8a8a93;"
        )
        self.lblVisionFrame.setText("Sin imagen")
        layout.addWidget(self.lblVisionFrame)

        self.ui.dashLayout.insertWidget(1, self.vision_card)

    def _start_vision(self):
        if VisionDetector is None:
            self.vision_status.update({
                "available": False,
                "sleep_state_label": "VISION OFF",
                "sleep_quality": "MEDIAPIPE NO INSTALADO",
            })
            self.lblVisionStatus.setText(f"Vision no disponible: {VISION_IMPORT_ERROR}")
            return
        try:
            self.vision_detector = VisionDetector(camera_index=0)
            self.vision_detector.frame_ready.connect(self._vision_frame_ready)
            self.vision_detector.status_ready.connect(self._vision_status_ready)
            self.vision_detector.start()
            self.vision_status["available"] = True
            self.lblVisionStatus.setText(f"{VISION_BACKEND} activo. Buscando cara...")
        except Exception as exc:
            self.vision_detector = None
            self.vision_status.update({
                "available": False,
                "sleep_state_label": "VISION OFF",
                "sleep_quality": "CAMARA NO DISPONIBLE",
            })
            self.lblVisionStatus.setText(f"No se pudo iniciar vision: {exc}")

    def _vision_frame_ready(self, pixmap):
        if pixmap is None:
            return
        scaled = pixmap.scaled(
            self.lblVisionFrame.size(),
            Qt.KeepAspectRatio,
            Qt.SmoothTransformation,
        )
        self.lblVisionFrame.setPixmap(scaled)

    def _vision_status_ready(self, status):
        camera_available = status.get("sleep_quality") != "CAMARA NO DISPONIBLE"
        face_detected = status.get("sleep_quality") not in {"SIN DATOS", "CAMARA NO DISPONIBLE"}
        sleeping = bool(status.get("sleeping", False))
        label = "DORMIDO" if sleeping else "DESPIERTO" if face_detected else "SIN CARA" if camera_available else "CAMARA OFF"
        self.vision_status.update({
            "available": camera_available,
            "face_detected": face_detected,
            "sleeping": sleeping,
            "sleep_state_label": label,
            "sleep_quality": status.get("sleep_quality", "SIN DATOS"),
            "ear": status.get("ear", 0.0),
            "mar": status.get("mar", 0.0),
            "head_delta": status.get("head_delta", 0.0),
            "snoring_risk": bool(status.get("snoring_risk", False)),
            "head_moving": bool(status.get("head_moving", False)),
            "ear_counter": int(status.get("ear_counter", 0)),
        })
        self.lblVisionStatus.setText(
            f"{label} · {self.vision_status['sleep_quality']} · "
            f"EAR {self.vision_status['ear']:.3f} · MAR {self.vision_status['mar']:.3f}"
        )

    def _connect_ui(self):
        self.ui.btnWeatherRefresh.clicked.connect(self.refresh_weather)
        self.ui.btnFanToggle.clicked.connect(self._toggle_fan_manual)
        self.ui.chkFanAuto.toggled.connect(self._set_fan_auto)
        self.ui.spnFanTempThreshold.valueChanged.connect(self.ui.cfgFanThreshold.setValue)
        self.ui.cfgFanThreshold.valueChanged.connect(self.ui.spnFanTempThreshold.setValue)
        self.ui.btnCurtainOpen.clicked.connect(lambda: self._start_curtain(-1))
        self.ui.btnCurtainClose.clicked.connect(lambda: self._start_curtain(1))
        self.ui.btnCurtainStop.clicked.connect(self._stop_curtain)
        self.ui.btnSessionToggle.clicked.connect(self._toggle_session)
        self.ui.btnChartAll.clicked.connect(lambda: self._set_chart("all"))
        self.ui.btnChartTemp.clicked.connect(lambda: self._set_chart("temp"))
        self.ui.btnChartMov.clicked.connect(lambda: self._set_chart("mov"))
        self.ui.btnChartActivity.clicked.connect(lambda: self._set_chart("activity"))
        self.ui.btnExportExcel.clicked.connect(self._export_excel)
        self.ui.btnHistExportar.clicked.connect(self._export_excel)
        self.ui.btnRepExcel.clicked.connect(self._export_excel)
        self.ui.btnRepCsv.clicked.connect(self._export_csv)
        self.ui.btnHistRefresh.clicked.connect(self._refresh_history_page)
        self.ui.btnCfgGuardar.clicked.connect(self._save_config)
        self.ui.btnCfgRestore.clicked.connect(self._restore_defaults)
        self.ui.btnNavDashboard.clicked.connect(lambda: self._nav(0, "dashboard"))
        self.ui.btnNavHistorico.clicked.connect(lambda: self._nav(1, "historico"))
        self.ui.btnNavConfig.clicked.connect(lambda: self._nav(2, "config"))
        self.ui.btnNavReporte.clicked.connect(lambda: self._nav(3, "reporte"))

    def _apply_defaults(self):
        self.ui.lblTempValue.setText("---")
        self.ui.lblTempSource.setText("Open-Meteo")
        self.ui.lblTempUpdated.setText("sin lectura")
        self.ui.lblFanState.setText("FAN OFF")
        self.ui.btnFanToggle.setChecked(False)
        self.ui.chkFanAuto.setChecked(True)
        self.ui.lblMovValue.setText("Sin movimiento")
        self.ui.lblMovActivity.setText("0 %")
        self.ui.barMovActivity.setValue(0)
        self.ui.lblMovLast.setText("Sin eventos")
        self.ui.lblCurtainState.setText("Detenida")
        self.ui.lblCurtainBadge.setText("DETENIDA")
        self.ui.lblCurtainPos.setText("0 %")
        self.ui.barCurtainPos.setValue(0)
        self.ui.lblCurtainLast.setText("Sin acciones")
        self.ui.txtEndpoint.setText("api.open-meteo.com/v1/forecast")
        self._set_badge(self.ui.lblTempBadge, "SIN DATOS", "badgeOff")
        self._set_badge(self.ui.lblFanState, "FAN OFF", "badgeOff")
        self._set_badge(self.ui.lblMovBadge, "QUIETO", "badgeOff")
        self._set_badge(self.ui.lblCurtainBadge, "DETENIDA", "badgeOff")
        self._set_led_indicator(False)
        self._update_chips()
        self._update_report()

    def refresh_weather(self):
        if self.weather_thread and self.weather_thread.isRunning():
            return
        self.ui.lblTempUpdated.setText("actualizando...")
        self._set_badge(self.ui.lblTempBadge, "CONSULTANDO", "badgeWarn")
        self.weather_thread = QThread(self)
        self.weather_worker = WeatherWorker(self.ui.spnLat.value(), self.ui.spnLon.value())
        self.weather_worker.moveToThread(self.weather_thread)
        self.weather_thread.started.connect(self.weather_worker.run)
        self.weather_worker.finished.connect(self._weather_ok)
        self.weather_worker.failed.connect(self._weather_error)
        self.weather_worker.finished.connect(self.weather_thread.quit)
        self.weather_worker.failed.connect(self.weather_thread.quit)
        self.weather_thread.finished.connect(self.weather_worker.deleteLater)
        self.weather_thread.finished.connect(self.weather_thread.deleteLater)
        self.weather_thread.start()

    def _weather_ok(self, data):
        self.temperature = data["temperature"]
        self.weather_time = data["time"]
        self.weather_updated_at = datetime.now()
        self.ui.lblTempValue.setText(f"{self.temperature:.1f}")
        self.ui.lblTempSource.setText(f"{data['source']} · {self.ui.txtCiudad.text()}")
        self.ui.lblTempUpdated.setText(self.weather_updated_at.strftime("%H:%M:%S"))
        self._set_badge(self.ui.lblTempBadge, "EN LINEA", "badgeOn")
        self._apply_fan_policy()
        self._sample()

    def _weather_error(self, message):
        self._set_badge(self.ui.lblTempBadge, "SIN CONEXION", "badgeWarn")
        self.ui.lblTempUpdated.setText(message[:48])
        self.ui.statusText.setText("Clima · sin conexion")

    def _apply_fan_policy(self):
        if self.temperature is None or not self.fan_auto:
            return
        threshold = self.ui.spnFanTempThreshold.value()
        hysteresis = self.ui.cfgFanHysteresis.value()
        if self.temperature >= threshold:
            self._set_fan(True)
        elif self.temperature <= threshold - hysteresis:
            self._set_fan(False)

    def _set_fan_auto(self, active):
        self.fan_auto = active
        self._apply_fan_policy()

    def _toggle_fan_manual(self):
        self.ui.chkFanAuto.setChecked(False)
        self._set_fan(not self.fan_on)

    def _set_fan(self, state):
        self.fan_on = bool(state)
        self.hardware.set_fan(self.fan_on)
        self.ui.btnFanToggle.setChecked(self.fan_on)
        self._set_badge(self.ui.lblFanState, "FAN ON" if self.fan_on else "FAN OFF", "badgeOn" if self.fan_on else "badgeOff")

    def _sample(self):
        if not self.session_active:
            return
        self._poll_motion()
        moving = self.last_motion >= 1.0

        self.history["ts"].append(datetime.now().strftime("%H:%M:%S"))
        self.history["temp"].append(self.temperature if self.temperature is not None else math.nan)
        self.history["mov"].append(100.0 if moving else 0.0)
        self.history["activity"].append(float(self.last_activity))
        self.sample_count += 1
        for key in self.history:
            if len(self.history[key]) > 28800:
                self.history[key] = self.history[key][-28800:]
        self._apply_fan_policy()
        self._refresh_chart()
        self._update_score(self.last_activity)
        self._update_chips()
        if self.ui.pages.currentWidget() == self.ui.pageHistorico:
            self._refresh_history_page()
        if self.ui.pages.currentWidget() == self.ui.pageReporte:
            self._update_report()
        self._sync_firestore()

    def _poll_motion(self):
        mov = float(self.hardware.get_movement() or 0.0)
        self.motion_window.append(mov)
        activity = int(round((sum(self.motion_window) / len(self.motion_window)) * 100)) if self.motion_window else 0
        self.last_motion = mov
        self.last_activity = activity
        moving = mov >= 1.0

        if moving:
            self.ui.lblMovValue.setText("Movimiento")
            self.ui.lblMovLast.setText(datetime.now().strftime("%H:%M:%S"))
        else:
            self.ui.lblMovValue.setText("Sin movimiento")

        self.ui.lblMovActivity.setText(f"{activity} %")
        self.ui.barMovActivity.setValue(activity)
        self._set_badge(self.ui.lblMovBadge, "MOV" if moving else "QUIETO", "badgeWarn" if moving else "badgeOff")
        self._set_led_indicator(moving)

    def _build_firestore_payload(self):
        now = datetime.now()
        temp_label = f"{self.temperature:.1f} C" if self.temperature is not None else "---"
        motion_on = self.last_motion >= 1.0
        motion_label = "MOV" if motion_on else "QUIETO"
        fan_label = "ON" if self.fan_on else "OFF"
        curtain_label = self.ui.lblCurtainState.text()
        score_label = f"{self.score_ring.score}/100"
        local_time = now.isoformat(timespec="seconds")
        return {
            "temperature_c": self.temperature,
            "temp_label": temp_label,
            "city": self.ui.txtCiudad.text(),
            "latitude": self.ui.spnLat.value(),
            "longitude": self.ui.spnLon.value(),
            "pir_motion": motion_on,
            "motion_label": motion_label,
            "movement_activity_percent": self.last_activity,
            "activity_label": f"{self.last_activity} %",
            "fan_on": self.fan_on,
            "fan_auto": self.fan_auto,
            "fan_label": fan_label,
            "curtain_position_percent": self.curtain_position,
            "curtain_position_label": f"{self.curtain_position} %",
            "curtain_state": curtain_label,
            "score": self.score_ring.score,
            "score_label": score_label,
            "sleeping": bool(self.vision_status.get("sleeping", False)),
            "sleep_state_label": self.vision_status.get("sleep_state_label", "VISION OFF"),
            "sleep_quality": self.vision_status.get("sleep_quality", "SIN VISION"),
            "face_detected": bool(self.vision_status.get("face_detected", False)),
            "ear": float(self.vision_status.get("ear", 0.0) or 0.0),
            "mar": float(self.vision_status.get("mar", 0.0) or 0.0),
            "head_delta": float(self.vision_status.get("head_delta", 0.0) or 0.0),
            "snoring_risk": bool(self.vision_status.get("snoring_risk", False)),
            "head_moving": bool(self.vision_status.get("head_moving", False)),
            "session_active": self.session_active,
            "duration_text": self._duration_text(),
            "sample_count": self.sample_count,
            "time_label": now.strftime("%H:%M:%S"),
            "date_label": now.strftime("%d/%m/%Y"),
            "device": {
                "hostname": socket.gethostname(),
                "app": "Somnus Sleep Monitor",
            },
            "session": {
                "active": self.session_active,
                "started_at": self.session_start.isoformat(timespec="seconds"),
                "duration_text": self._duration_text(),
                "sample_count": self.sample_count,
                "score": self.score_ring.score,
            },
            "weather": {
                "temperature_c": self.temperature,
                "source": "api.open-meteo.com",
                "city": self.ui.txtCiudad.text(),
                "latitude": self.ui.spnLat.value(),
                "longitude": self.ui.spnLon.value(),
                "weather_time": self.weather_time,
                "updated_at_local": self.weather_updated_at.isoformat(timespec="seconds") if self.weather_updated_at else None,
            },
            "sensors": {
                "pir_motion": motion_on,
                "pir_value": self.last_motion,
                "movement_activity_percent": self.last_activity,
                "humidity": None,
                "physical_temperature_c": None,
            },
            "vision": {
                "available": bool(self.vision_status.get("available", False)),
                "backend": VISION_BACKEND,
                "face_detected": bool(self.vision_status.get("face_detected", False)),
                "sleeping": bool(self.vision_status.get("sleeping", False)),
                "sleep_state_label": self.vision_status.get("sleep_state_label", "VISION OFF"),
                "sleep_quality": self.vision_status.get("sleep_quality", "SIN VISION"),
                "ear": float(self.vision_status.get("ear", 0.0) or 0.0),
                "mar": float(self.vision_status.get("mar", 0.0) or 0.0),
                "head_delta": float(self.vision_status.get("head_delta", 0.0) or 0.0),
                "ear_counter": int(self.vision_status.get("ear_counter", 0) or 0),
                "snoring_risk": bool(self.vision_status.get("snoring_risk", False)),
                "head_moving": bool(self.vision_status.get("head_moving", False)),
            },
            "actuators": {
                "fan_on": self.fan_on,
                "fan_auto": self.fan_auto,
                "fan_threshold_c": self.ui.spnFanTempThreshold.value(),
                "movement_led_on": self.last_motion >= 1.0,
                "curtain_position_percent": self.curtain_position,
                "curtain_state": curtain_label,
                "curtain_direction": self.curtain_direction,
            },
            "local_time": local_time,
        }

    def _sync_firestore(self):
        if not self.firestore.connected or self.firestore_busy:
            return

        payload = self._build_firestore_payload()
        self.firestore_busy = True

        def worker():
            try:
                self.firestore.update_state(payload)
                self.firestore.log_history(payload)
            finally:
                self.firestore_busy = False

        threading.Thread(target=worker, daemon=True).start()

    def _poll_firestore_commands(self):
        if not self.firestore.connected or self.command_busy:
            return
        self.command_busy = True

        def worker():
            try:
                commands = self.firestore.get_commands()
            finally:
                self.command_busy = False

            fan_command = str(commands.get("fan_command", "none")).lower()
            curtain_command = str(commands.get("curtain_command", "none")).lower()
            signature = (
                str(commands.get("_doc_id", "")),
                fan_command,
                curtain_command,
                str(commands.get("updated_at", "")),
                str(commands.get("created_at", "")),
            )
            if signature == self.last_command_signature:
                return
            self.last_command_signature = signature
            doc_id = commands.get("_doc_id")
            self.command_received.emit(fan_command, curtain_command, doc_id)

        threading.Thread(target=worker, daemon=True).start()

    def _apply_firestore_commands(self, fan_command, curtain_command, doc_id=None):
        acknowledged = {}
        if doc_id:
            acknowledged["_doc_id"] = doc_id

        if fan_command == "on":
            self.ui.chkFanAuto.setChecked(False)
            self._set_fan(True)
            acknowledged["fan_command"] = "none"
            acknowledged["last_fan_ack"] = "on"
        elif fan_command == "off":
            self.ui.chkFanAuto.setChecked(False)
            self._set_fan(False)
            acknowledged["fan_command"] = "none"
            acknowledged["last_fan_ack"] = "off"
        elif fan_command == "auto":
            self.ui.chkFanAuto.setChecked(True)
            self._apply_fan_policy()
            acknowledged["fan_command"] = "none"
            acknowledged["last_fan_ack"] = "auto"

        if curtain_command == "open":
            self._start_curtain(-1)
            acknowledged["curtain_command"] = "none"
            acknowledged["last_curtain_ack"] = "open"
        elif curtain_command == "close":
            self._start_curtain(1)
            acknowledged["curtain_command"] = "none"
            acknowledged["last_curtain_ack"] = "close"
        elif curtain_command == "stop":
            self._stop_curtain()
            acknowledged["curtain_command"] = "none"
            acknowledged["last_curtain_ack"] = "stop"

        if acknowledged:
            threading.Thread(target=lambda: self.firestore.update_commands(acknowledged), daemon=True).start()

    def _start_curtain(self, direction):
        self._stop_curtain()
        self.curtain_direction = direction
        self.curtain_started_at = time.monotonic()
        self.curtain_duration = max(1, self.ui.cfgCurtainSec.value())
        self.curtain_timer.start(self.PULSE_PERIOD)
        self._set_badge(self.ui.lblCurtainBadge, "ABRIENDO" if direction < 0 else "CERRANDO", "badgeWarn")
        self.ui.lblCurtainState.setText("Abriendo" if direction < 0 else "Cerrando")
        self.ui.lblCurtainLast.setText(datetime.now().strftime("%H:%M:%S"))
        self._curtain_pulse()

    def _curtain_pulse(self):
        if self.curtain_direction == 0:
            return
        elapsed = time.monotonic() - self.curtain_started_at
        progress = max(0, min(100, int(elapsed / self.curtain_duration * 100)))
        if self.curtain_direction < 0:
            self.curtain_position = progress
        else:
            self.curtain_position = 100 - progress
        self.ui.barCurtainPos.setValue(self.curtain_position)
        self.ui.lblCurtainPos.setText(f"{self.curtain_position} %")
        if elapsed >= self.curtain_duration:
            self._stop_curtain(final=True)
            return
        self.hardware.set_curtain_motor(self.curtain_direction)
        QTimer.singleShot(self.PULSE_ON, self.hardware.stop_curtain_motors)

    def _stop_curtain(self, final=False):
        self.curtain_timer.stop()
        self.hardware.stop_curtain_motors()
        if self.curtain_direction != 0 or final:
            if final:
                self.curtain_position = 100 if self.curtain_direction < 0 else 0
                self.ui.barCurtainPos.setValue(self.curtain_position)
                self.ui.lblCurtainPos.setText(f"{self.curtain_position} %")
            self.ui.lblCurtainState.setText("Abierta" if self.curtain_position >= 95 else "Cerrada" if self.curtain_position <= 5 else "Detenida")
            self.ui.lblCurtainLast.setText(datetime.now().strftime("%H:%M:%S"))
        self.curtain_direction = 0
        self._set_badge(self.ui.lblCurtainBadge, "DETENIDA", "badgeOff")

    def _set_chart(self, name):
        self.active_chart = name
        self._refresh_chart()

    def _refresh_chart(self):
        n = len(self.history["ts"])
        xs = list(range(n))
        visible = {
            "all": {"temp", "mov", "activity"},
            "temp": {"temp"},
            "mov": {"mov"},
            "activity": {"activity"},
        }.get(self.active_chart, {"temp", "mov", "activity"})
        for key, curve in self.curves.items():
            if key in visible:
                curve.setData(xs, self.history[key])
                curve.show()
            else:
                curve.hide()

    def _update_score(self, activity):
        score = 100
        if self.temperature is not None:
            threshold = self.ui.spnFanTempThreshold.value()
            if self.temperature >= threshold:
                score -= min(25, int((self.temperature - threshold + 1) * 5))
        score -= min(35, int(activity * 0.35))
        if self.vision_status.get("available"):
            if self.vision_status.get("sleeping"):
                score += 8
            elif self.vision_status.get("face_detected"):
                score -= 12
            if self.vision_status.get("head_moving"):
                score -= 8
            if self.vision_status.get("snoring_risk"):
                score -= 6
        if self.fan_on:
            score += 3
        self.score_ring.set_score(score)
        quality = "Reparador" if score >= 70 else "Regular" if score >= 40 else "Deficiente"
        sleep_label = self.vision_status.get("sleep_state_label", "SIN VISION")
        self.ui.lblHeroBig.setText(
            f"{quality} · {sleep_label} · temp {self.temperature:.1f} °C"
            if self.temperature is not None else
            f"{quality} · {sleep_label} · esperando clima"
        )

    def _update_chips(self):
        now = datetime.now()
        dur = now - self.session_start
        h, rem = divmod(int(dur.total_seconds()), 3600)
        m, s = divmod(rem, 60)
        self.ui.chipInicioTxt.setText(f"Inicio  {self.session_start:%H:%M}")
        self.ui.chipMuestraTxt.setText(f"Muestras  {self.sample_count}")
        self.ui.chipIntervaloTxt.setText(f"Intervalo  {self.ui.cfgInterval.value()} s")
        self.ui.chipRecTxt.setText("Monitoreando" if self.session_active else "Pausado")
        self.ui.chipHostTxt.setText(socket.gethostname())
        self.ui.chipRecDot.setStyleSheet("background:#b8f2b8; border-radius:4px;" if self.session_active else "background:#e6d28e; border-radius:4px;")
        self.ui.clockLbl.setText(QDateTime.currentDateTime().toString("HH:mm:ss"))
        self.ui.statusText.setText(f"Sesion {h:02d}:{m:02d}:{s:02d}")

    def _tick_clock(self):
        self._update_chips()
        if self.weather_updated_at:
            age = int((datetime.now() - self.weather_updated_at).total_seconds())
            self.ui.lblTempUpdated.setText(f"hace {age}s")

    def _toggle_session(self):
        self.session_active = not self.session_active
        self.ui.btnSessionToggle.setText("PAUSAR SESION" if self.session_active else "REANUDAR SESION")
        self._update_chips()

    def _save_config(self):
        self.ui.spnFanTempThreshold.setValue(self.ui.cfgFanThreshold.value())
        self.sample_timer.setInterval(self.ui.cfgInterval.value() * 1000)
        self.weather_timer.setInterval(self.ui.spnWeatherRefresh.value() * 1000)
        self.curtain_duration = self.ui.cfgCurtainSec.value()
        QMessageBox.information(self, "Configuracion", "Cambios aplicados.")

    def _restore_defaults(self):
        self.ui.spnLat.setValue(19.0414)
        self.ui.spnLon.setValue(-98.2063)
        self.ui.txtCiudad.setText("Puebla de Zaragoza")
        self.ui.spnWeatherRefresh.setValue(300)
        self.ui.cfgFanThreshold.setValue(23.0)
        self.ui.cfgFanHysteresis.setValue(0.5)
        self.ui.cfgCurtainSec.setValue(8)
        self.ui.cfgInterval.setValue(5)
        self._save_config()

    def _nav(self, index, key):
        self.ui.pages.setCurrentIndex(index)
        buttons = {
            "dashboard": self.ui.btnNavDashboard,
            "historico": self.ui.btnNavHistorico,
            "config": self.ui.btnNavConfig,
            "reporte": self.ui.btnNavReporte,
        }
        for name, button in buttons.items():
            button.setChecked(name == key)
            button.setProperty("active", "true" if name == key else "false")
            self._repolish(button)
        if index == 1:
            self._refresh_history_page()
        elif index == 3:
            self._update_report()

    def _refresh_history_page(self):
        table = self.ui.tblHistorico
        n = len(self.history["ts"])
        table.setRowCount(min(n, 100))
        for row, idx in enumerate(range(max(0, n - 100), n)):
            values = [
                str(idx + 1),
                self.history["ts"][idx],
                "---" if math.isnan(self.history["temp"][idx]) else f"{self.history['temp'][idx]:.1f} C",
                "MOV" if self.history["mov"][idx] > 0 else "---",
                f"{self.history['activity'][idx]:.0f} %",
            ]
            for col, value in enumerate(values[:table.columnCount()]):
                from PyQt5.QtWidgets import QTableWidgetItem
                item = QTableWidgetItem(value)
                item.setTextAlignment(Qt.AlignCenter)
                table.setItem(row, col, item)
        self.ui.lblKpiSesiones.setText("1" if n else "---")
        self.ui.lblKpiPromedio.setText(str(self.score_ring.score))
        self.ui.lblKpiHoras.setText(self._duration_text())
        self.ui.lblKpiActividad.setText(f"{self.history['activity'][-1]:.0f}%" if n else "---")

    def _update_report(self):
        temps = [v for v in self.history["temp"] if not math.isnan(v)]
        avg_temp = sum(temps) / len(temps) if temps else None
        fan_minutes = 0
        score = self.score_ring.score
        self.ui.lblRepScore.setText(f"{score} / 100")
        self.ui.lblRepFecha.setText(f"{datetime.now():%d/%m/%Y %H:%M} · duracion {self._duration_text()}")
        self.ui.lblRepDest.setText(
            f"Temp ext. media {avg_temp:.1f} C · Fan {'ON' if self.fan_on else 'OFF'} · actividad {self.history['activity'][-1]:.0f}%"
            if avg_temp is not None and self.history["activity"] else
            "Esperando datos de clima y movimiento"
        )

    def _duration_text(self):
        dur = datetime.now() - self.session_start
        h, rem = divmod(int(dur.total_seconds()), 3600)
        m = rem // 60
        return f"{h}h {m:02d}m"

    def _export_excel(self):
        if not self.history["ts"]:
            QMessageBox.warning(self, "Sin datos", "Aun no hay datos para exportar.")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Guardar Excel", f"somnus_{datetime.now():%Y%m%d_%H%M}.xlsx", "Excel (*.xlsx)")
        if not path:
            return
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Muestra", "Hora", "Temp exterior C", "Movimiento", "Actividad %", "Fan"])
        for i, ts in enumerate(self.history["ts"]):
            ws.append([i + 1, ts, None if math.isnan(self.history["temp"][i]) else self.history["temp"][i], self.history["mov"][i], self.history["activity"][i], self.fan_on])
        wb.save(path)
        QMessageBox.information(self, "Exportado", path)

    def _export_csv(self):
        if not self.history["ts"]:
            QMessageBox.warning(self, "Sin datos", "Aun no hay datos para exportar.")
            return
        path, _ = QFileDialog.getSaveFileName(self, "Guardar CSV", f"somnus_{datetime.now():%Y%m%d_%H%M}.csv", "CSV (*.csv)")
        if not path:
            return
        with open(path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(["Muestra", "Hora", "Temp exterior C", "Movimiento", "Actividad %", "Fan"])
            for i, ts in enumerate(self.history["ts"]):
                writer.writerow([i + 1, ts, "" if math.isnan(self.history["temp"][i]) else self.history["temp"][i], self.history["mov"][i], self.history["activity"][i], self.fan_on])
        QMessageBox.information(self, "Exportado", path)

    def _set_led_indicator(self, on):
        self.ui.lblMovLed.setProperty("role", "ledOn" if on else "ledOff")
        self.ui.lblMovLedTxt.setText("ENCENDIDO" if on else "APAGADO")
        self._repolish(self.ui.lblMovLed)

    def _set_badge(self, label, text, role):
        label.setText(text)
        label.setProperty("role", role)
        self._repolish(label)

    def _repolish(self, widget):
        widget.style().unpolish(widget)
        widget.style().polish(widget)

    def closeEvent(self, event):
        self.weather_timer.stop()
        self.sample_timer.stop()
        self.motion_timer.stop()
        self.command_timer.stop()
        self.clock_timer.stop()
        self.curtain_timer.stop()
        if self.vision_detector is not None:
            self.vision_detector.stop()
        self.hardware.stop()
        event.accept()


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = SleepMonitorApp()
    window.show()
    sys.exit(app.exec_())
