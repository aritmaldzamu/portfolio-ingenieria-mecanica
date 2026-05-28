// ================================================================
//   BALL & BEAM — PID MÉTODO 2
//   PID Básico + Filtro Media Móvil Exponencial (EMA)
//
//   FÓRMULAS:
//     y_filt[k] = alpha*y[k] + (1-alpha)*y_filt[k-1]  (EMA)
//     W[k] = W[k-1] + T * e[k]                        (integral)
//     U[k] = kp*e[k] + ki*W[k] + kd*(e[k]-e[k-1])/T  (control)
//
//   La diferencia respecto al Método 1 es que la medición
//   y[k] pasa por el filtro EMA antes de calcular el error.
//   Esto reduce el ruido del sensor sin retardo significativo.
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
#define STEPS_PER_REV   200
#define MICROSTEP       8
#define STEPS_PER_DEG   ((STEPS_PER_REV * MICROSTEP) / 360.0f)
#define ANGULO_MAX      15.0f

// ---------- PID — PARÁMETROS ----------
float Kp = 1.8f;
float Ki = 0.02f;
float Kd = 1.2f;

float setpoint = 30.0f;

// ---------- FILTRO EMA ----------
// alpha cercano a 1 → menos filtro (responde rápido)
// alpha cercano a 0 → más filtro (más suave, más lento)
float alpha     = 0.3f;
float y_filt    = 30.0f;   // valor filtrado inicial

// ---------- VARIABLES DE ESTADO ----------
float e_prev = 0.0f;
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
  Serial.println("=== PID Metodo 2: Diferencias atras + Filtro EMA ===");
  Serial.println("Comandos: s:<cm>  kp:<v>  ki:<v>  kd:<v>  al:<v>");
}

// ================================================================
void loop() {
  leerSerial();

  if (millis() - tAnt < T_MS) return;
  tAnt = millis();

  // 1. Medir posición cruda
  float y_raw = leerDistancia();
  if (y_raw < 2.0f || y_raw > 60.0f) return;

  // 2. ─── FILTRO EMA ───────────────────────────────────────────
  y_filt = alpha * y_raw + (1.0f - alpha) * y_filt;
  // ────────────────────────────────────────────────────────────

  // 3. Error sobre señal filtrada
  float e = setpoint - y_filt;

  // 4. ─── MÉTODO 2: PID con diferencias hacia atrás ────────────
  W = W + T * e;
  W = constrain(W, -500.0f, 500.0f);

  float U = Kp * e + Ki * W + Kd * (e - e_prev) / T;
  // ────────────────────────────────────────────────────────────

  e_prev = e;

  U = constrain(U, -ANGULO_MAX, ANGULO_MAX);
  moverHacia((long)(U * STEPS_PER_DEG));

  // 5. Debug
  Serial.print("y_raw="); Serial.print(y_raw, 1);
  Serial.print(" y_f=");  Serial.print(y_filt, 1);
  Serial.print(" e=");    Serial.print(e, 2);
  Serial.print(" U=");    Serial.println(U, 2);
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
      else if (buf.startsWith("al:")) { alpha = constrain(buf.substring(3).toFloat(), 0.01f, 1.0f); Serial.print("alpha="); Serial.println(alpha); }
      else if (buf == "home")     { centrarBeam(); W = 0; e_prev = 0; y_filt = setpoint; }
      buf = "";
    } else { buf += c; }
  }
}
