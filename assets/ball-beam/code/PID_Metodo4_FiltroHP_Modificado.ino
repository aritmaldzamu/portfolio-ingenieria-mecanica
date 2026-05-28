// ================================================================
//   BALL & BEAM — PID MÉTODO 4
//   Algoritmo PID Modificado con Filtro Pasa-Altas de Posición
//
//   FÓRMULAS:
//     W[k] = W[k-1] + T * e[k]                          (integral)
//     V[k] = 1/(1+α·T) · (V[k-1] - α²·T·y[k])          (filtro interno)
//     Z[k] = V[k] + α·y[k]                              (salida filtro HPF)
//     U[k] = kp·e[k] + ki·W[k] - kd·Z[k] - kp·y[k]    (control)
//
//   Diferencia clave respecto al Método 3:
//   Se agrega el término  -kp·y[k]  en la ley de control.
//   Esto separa la acción proporcional sobre el ERROR de la
//   acción proporcional sobre la POSICIÓN absoluta, reduciendo
//   el sobrepaso en sistemas tipo Ball & Beam donde el set-point
//   R es constante (Ṙ = 0) y sE(s) = s(R-Y) = -sY.
//
//   Hardware: Arduino UNO + DRV8825 + NEMA17 + HC-SR04
// ================================================================

// ---------- PINES ----------
#define PIN_STEP  2
#define PIN_DIR   3
#define PIN_EN    4
#define PIN_TRIG  9
#define PIN_ECHO  11

// ---------- MOTOR ----------
#define STEPS_PER_REV  200
#define MICROSTEP      8
#define STEPS_PER_DEG  ((STEPS_PER_REV * MICROSTEP) / 360.0f)
#define ANGULO_MAX     15.0f

// ---------- PID ----------
float Kp = 1.8f;
float Ki = 0.02f;
float Kd = 1.2f;

float setpoint = 30.0f;

// ---------- FILTRO PASA-ALTAS ----------
float alpha_hpf = 5.0f;   // frecuencia de corte (rad/s)

// Variables de estado
float V_prev = 0.0f;
float W      = 0.0f;

// ---------- MOTOR ----------
long pasoActual = 0;

// ---------- TIMING ----------
const unsigned long T_MS = 50;
const float         T    = T_MS / 1000.0f;
unsigned long tAnt = 0;

// ================================================================
void setup() {
  Serial.begin(115200);
  pinMode(PIN_STEP, OUTPUT);
  pinMode(PIN_DIR,  OUTPUT);
  pinMode(PIN_EN,   OUTPUT);
  pinMode(PIN_TRIG, OUTPUT);
  pinMode(PIN_ECHO, INPUT);
  digitalWrite(PIN_EN, LOW);
  centrarBeam();
  Serial.println("=== PID Metodo 4: PID Modificado con Filtro HP Posicion ===");
  Serial.println("Comandos: s:<cm>  kp:<v>  ki:<v>  kd:<v>  a:<v>");
}

// ================================================================
void loop() {
  leerSerial();

  if (millis() - tAnt < T_MS) return;
  tAnt = millis();

  // 1. Medir posición
  float y = leerDistancia();
  if (y < 2.0f || y > 60.0f) return;

  // 2. Error
  float e = setpoint - y;

  // 3. ─── MÉTODO 4: PID Modificado con Filtro Pasa-Altas ───────

  // Integral (diferencias hacia atrás)
  W = W + T * e;
  W = constrain(W, -500.0f, 500.0f);

  // Filtro pasa-altas de la posición
  float V = (1.0f / (1.0f + alpha_hpf * T)) * (V_prev - alpha_hpf * alpha_hpf * T * y);
  float Z = V + alpha_hpf * y;   // ≈ velocidad de y

  // Ley de control MODIFICADA: se agrega -kp·y[k]
  // Esto equivale a que la acción proporcional actúa sobre
  // la posición directamente, no sobre el error completo,
  // eliminando el kick cuando cambia el setpoint.
  float U = Kp * e + Ki * W - Kd * Z - Kp * y;
  // ────────────────────────────────────────────────────────────

  V_prev = V;

  U = constrain(U, -ANGULO_MAX, ANGULO_MAX);
  moverHacia((long)(U * STEPS_PER_DEG));

  // Debug
  Serial.print("y="); Serial.print(y, 1);
  Serial.print(" e="); Serial.print(e, 2);
  Serial.print(" Z="); Serial.print(Z, 3);
  Serial.print(" U="); Serial.println(U, 2);
}

// ================================================================
float leerDistancia() {
  digitalWrite(PIN_TRIG, LOW);  delayMicroseconds(2);
  digitalWrite(PIN_TRIG, HIGH); delayMicroseconds(10);
  digitalWrite(PIN_TRIG, LOW);
  long dur = pulseIn(PIN_ECHO, HIGH, 30000);
  return (dur == 0) ? -1.0f : (dur * 0.0343f / 2.0f);
}

void moverHacia(long target) {
  target = constrain(target, -200L, 200L);
  long diff = target - pasoActual;
  if (diff == 0) return;
  digitalWrite(PIN_DIR, diff > 0 ? HIGH : LOW);
  long pasos = min(abs(diff), 8L);
  for (long i = 0; i < pasos; i++) {
    digitalWrite(PIN_STEP, HIGH); delayMicroseconds(400);
    digitalWrite(PIN_STEP, LOW);  delayMicroseconds(400);
    pasoActual += (diff > 0) ? 1 : -1;
  }
}

void centrarBeam() {
  long diff = -pasoActual;
  if (diff == 0) return;
  digitalWrite(PIN_DIR, diff > 0 ? HIGH : LOW);
  for (long i = 0; i < abs(diff); i++) {
    digitalWrite(PIN_STEP, HIGH); delayMicroseconds(800);
    digitalWrite(PIN_STEP, LOW);  delayMicroseconds(800);
  }
  pasoActual = 0;
}

String buf = "";
void leerSerial() {
  while (Serial.available()) {
    char c = Serial.read();
    if (c == '\n') {
      buf.trim();
      if (buf.startsWith("s:"))   { setpoint = buf.substring(2).toFloat(); }
      else if (buf.startsWith("kp:")) { Kp = buf.substring(3).toFloat(); }
      else if (buf.startsWith("ki:")) { Ki = buf.substring(3).toFloat(); }
      else if (buf.startsWith("kd:")) { Kd = buf.substring(3).toFloat(); }
      else if (buf.startsWith("a:"))  { alpha_hpf = buf.substring(2).toFloat(); Serial.print("alpha_hpf="); Serial.println(alpha_hpf); }
      else if (buf == "home")     { centrarBeam(); W = 0; V_prev = 0; }
      buf = "";
    } else { buf += c; }
  }
}
