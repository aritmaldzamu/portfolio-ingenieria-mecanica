#include <Arduino.h>
#include "BluetoothSerial.h"

BluetoothSerial SerialBT;

// === Buffer para lectura BT no bloqueante ===
String btBuffer;

// === Pines de los servos ===
#define SERVO_IZQ   25
#define SERVO_DER   15
#define SERVO_VERT  33

// === PWM ===
const uint32_t FREQ_HZ = 50;
const uint8_t  RES_BITS = 12;
const uint16_t DUTY_MIN = 205;   // ~1.0 ms
const uint16_t DUTY_MAX = 410;   // ~2.0 ms

// Convierte grados fisicos 0..180 a duty
uint16_t dutyFromDeg(int deg){
  deg = constrain(deg,0,180);
  return map(deg,0,180,DUTY_MIN,DUTY_MAX);
}

// Convierte de angulo logico (0..180, centro 90) a fisico (invertido)
int logicalToPhysical(int logicalDeg){
  logicalDeg = constrain(logicalDeg, 0, 180);
  // 0 logico -> 180 fisico, 180 logico -> 0 fisico
  return 180 - logicalDeg;
}

// Escribe usando grados logicos
void writeServoLogical(int pin, int logicalDeg){
  int fisico = logicalToPhysical(logicalDeg);
  ledcWrite(pin, dutyFromDeg(fisico));
}

// Configurar servo con angulo logico inicial
void configServo(int pin, int initialLogical){
  pinMode(pin,OUTPUT);
  ledcAttach(pin,FREQ_HZ,RES_BITS);   // usa el pin como canal
  writeServoLogical(pin,initialLogical);
}

// === Rango y rampa ===
const int LIM_MIN = 0;
const int LIM_MAX = 180;
const int PASO_RAMPA = 45;          // tamano de paso en rampa
const uint32_t DT_RAMP_MS = 2;
const uint32_t TIMEOUT_MS = 700;

// Estado en grados LOGICOS
int posIzq = 90;
int posDer = 90;
int posVert= 60;

int tgtIzq = 90;
int tgtDer = 90;
int tgtVert= 60;

uint32_t tPrevRamp = 0;
uint32_t tLastCmd  = 0;

// Rampa suave hacia el objetivo
void aplicarRampa(){
  uint32_t now = millis();
  if(now - tPrevRamp < DT_RAMP_MS) return;
  tPrevRamp = now;

  auto go = [&](int actual,int target){
    if(actual < target) return min(actual + PASO_RAMPA, target);
    if(actual > target) return max(actual - PASO_RAMPA, target);
    return actual;
  };

  posIzq = go(posIzq, tgtIzq);
  posDer = go(posDer, tgtDer);
  posVert= go(posVert,tgtVert);

  // Escribimos usando grados LOGICOS, se invierten adentro
  writeServoLogical(SERVO_IZQ, posIzq);
  writeServoLogical(SERVO_DER, posDer);
  writeServoLogical(SERVO_VERT,posVert);
}

// Parsea "ANG:izq,der,vert"
bool parseAngulos(const String &msg, int &aIzq, int &aDer, int &aVert){
  if (!msg.startsWith("ANG:")) return false;
  String data = msg.substring(4);  // despues de "ANG:"

  int c1 = data.indexOf(',');
  if (c1 < 0) return false;
  int c2 = data.indexOf(',', c1 + 1);
  if (c2 < 0) return false;

  String sIzq  = data.substring(0, c1);
  String sDer  = data.substring(c1 + 1, c2);
  String sVert = data.substring(c2 + 1);

  sIzq.trim();
  sDer.trim();
  sVert.trim();

  aIzq  = sIzq.toInt();
  aDer  = sDer.toInt();
  aVert = sVert.toInt();

  return true;
}

// ======== SETUP ========
void setup(){
  Serial.begin(115200);
  SerialBT.begin("ESP32-BallPlatform");

  configServo(SERVO_IZQ, posIzq);
  configServo(SERVO_DER, posDer);
  configServo(SERVO_VERT,posVert);

  Serial.println("ESP32 listo");
  tLastCmd = millis();
}

// ======== LOOP ========
void loop(){

  // --- Lectura Bluetooth no bloqueante ---
  while (SerialBT.available()) {
    char c = (char)SerialBT.read();

    if (c == '\n') {
      // Tenemos una linea completa en btBuffer
      String msg = btBuffer;
      btBuffer = "";        // limpiar para el siguiente mensaje

      msg.trim();
      if (msg.length() > 0) {
        tLastCmd = millis();

        if (msg == "LOST") {
          // PC perdio mano/objetivo -> "centro"
          tgtIzq  = 90;
          tgtDer  = 90;
          tgtVert = 60;
          Serial.println("Comando LOST: centro.");

        } else if (msg == "ZERO") {
          // TODOS los servos a 180 fisicos
          // => 0 logico por el mapeo invertido
          tgtIzq  = 0;
          tgtDer  = 0;
          tgtVert = 0;
          Serial.println("Comando ZERO: servos -> 180 fisico");

        } else {
          int aIzq, aDer, aVert;
          if (parseAngulos(msg, aIzq, aDer, aVert)) {
            tgtIzq  = constrain(aIzq,  LIM_MIN, LIM_MAX);
            tgtDer  = constrain(aDer,  LIM_MIN, LIM_MAX);
            tgtVert = constrain(aVert, LIM_MIN, LIM_MAX);
            Serial.printf("ANG -> IZQ:%d DER:%d VERT:%d\n", tgtIzq, tgtDer, tgtVert);
          } else {
            Serial.print("Comando desconocido: ");
            Serial.println(msg);
          }
        }
      }
    } else if (c != '\r') {
      // Acumulamos caracteres, ignorando CR
      btBuffer += c;
    }
  }

  // Si pasa mucho tiempo sin recibir comandos, vuelve al centro
  if(millis() - tLastCmd > TIMEOUT_MS){
    tgtIzq = 90;
    tgtDer = 90;
    tgtVert= 60;
  }

  aplicarRampa();
  delay(1);
}
