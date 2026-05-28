# -*- coding: utf-8 -*-
import glob
import os
import threading
import time

import firebase_admin
from firebase_admin import credentials, firestore


def _find_service_account_key():
    """Prefiere la llave Firebase Admin SDK nueva si esta en la carpeta."""
    candidates = []
    candidates.extend(glob.glob("*firebase-adminsdk*.json"))
    candidates.extend(glob.glob("serviceAccountKey.json"))
    candidates = [path for path in candidates if os.path.isfile(path)]
    if not candidates:
        return "serviceAccountKey.json"
    return max(candidates, key=os.path.getmtime)


class FirestoreManager:
    def __init__(self, key_path=None):
        self.key_path = key_path or _find_service_account_key()
        self.collection_name = "sleep_monitor"
        self.doc_id = "current_state"
        self.commands_collection = "control_commands"
        self.commands_doc_id = "current"
        self.connected = False
        self.project_id = None
        self.db = None

        try:
            cred = credentials.Certificate(self.key_path)
            self.project_id = cred.project_id

            if firebase_admin._apps:
                app = firebase_admin.get_app()
            else:
                app = firebase_admin.initialize_app(cred)

            self.db = firestore.client(app)
            self.connected = True
            print(f"[firestore] Conectado a proyecto: {self.project_id}")
        except Exception as exc:
            self.connected = False
            print(f"[firestore] No se pudo conectar: {exc}")

    def update_state(self, data):
        """Actualiza el documento vivo sleep_monitor/current_state."""
        if not self.connected:
            return False

        payload = dict(data)
        payload["last_updated"] = firestore.SERVER_TIMESTAMP
        try:
            doc_ref = self.db.collection(self.collection_name).document(self.doc_id)
            doc_ref.set(payload, merge=True)
            return True
        except Exception as exc:
            print(f"[firestore] Error actualizando estado: {exc}")
            return False

    def log_history(self, data):
        """Agrega una lectura historica en subcoleccion y coleccion plana."""
        if not self.connected:
            return False

        payload = dict(data)
        payload["timestamp"] = firestore.SERVER_TIMESTAMP
        try:
            nested_history_ref = (
                self.db.collection(self.collection_name)
                .document(self.doc_id)
                .collection("history")
            )
            nested_history_ref.add(payload)
            self.db.collection("sleep_history").add(payload)
            return True
        except Exception as exc:
            print(f"[firestore] Error guardando historial: {exc}")
            return False

    def ensure_command_defaults(self):
        if not self.connected:
            return False
        try:
            self.db.collection(self.commands_collection).document(self.commands_doc_id).set({
                "fan_command": "none",
                "curtain_command": "none",
                "updated_by": "raspberry",
            }, merge=True)
            return True
        except Exception as exc:
            print(f"[firestore] Error inicializando comandos: {exc}")
            return False

    def get_commands(self):
        if not self.connected:
            return {}
        try:
            latest_docs = list(
                self.db.collection(self.commands_collection)
                .order_by("created_at", direction=firestore.Query.DESCENDING)
                .limit(1)
                .stream()
            )
            if latest_docs:
                data = latest_docs[0].to_dict() or {}
                data["_doc_id"] = latest_docs[0].id
                return data
            doc = self.db.collection(self.commands_collection).document(self.commands_doc_id).get()
            data = doc.to_dict() or {}
            data["_doc_id"] = self.commands_doc_id
            return data
        except Exception as exc:
            print(f"[firestore] Error leyendo comandos: {exc}")
            return {}

    def update_commands(self, data):
        if not self.connected:
            return False
        payload = dict(data)
        payload["last_ack"] = firestore.SERVER_TIMESTAMP
        try:
            doc_id = payload.pop("_doc_id", None) or self.commands_doc_id
            self.db.collection(self.commands_collection).document(doc_id).set(payload, merge=True)
            return True
        except Exception as exc:
            print(f"[firestore] Error actualizando comandos: {exc}")
            return False


class FirebaseSyncThread(threading.Thread):
    """Compatibilidad con codigo anterior."""

    def __init__(self, firestore_manager, hardware, vision=None, sync_interval=5):
        super().__init__(daemon=True)
        self.db = firestore_manager
        self.hardware = hardware
        self.vision = vision
        self.sync_interval = sync_interval
        self.running = True
        self.is_awake = False

    def set_awake_status(self, status):
        self.is_awake = status

    def run(self):
        while self.running:
            data = {
                "temperature_c": self.hardware.get_temperature(),
                "humidity": self.hardware.get_humidity(),
                "light_lux": self.hardware.get_light(),
                "movement": self.hardware.get_movement(),
                "actuators": {
                    "fan_on": self.hardware.fan_on,
                    "humidifier_on": self.hardware.humidifier_on,
                    "led_on": self.hardware.led_on,
                },
                "status": "awake" if self.is_awake else "asleep",
            }
            self.db.update_state(data)
            for _ in range(self.sync_interval):
                if not self.running:
                    break
                time.sleep(1)

    def stop(self):
        self.running = False
