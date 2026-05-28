// ================================================================
//   BALL & BEAM — PID MÉTODO 5
//   PID con Integración Trapezoidal
//
//   FÓRMULAS:
//     W[k] = W[k-1] + (T/2)·(e[k] + e[k-1])            (integral TRAPEZOIDAL)
//     U[k] = kp·e[k] + ki·W[k] + kd·(e[k]-e[k-1])/T   (control)
//
//   Diferencia clave respecto al Método 1:
//   La integral usa la REGLA TRAPEZOIDAL en lugar de
//   diferencias hacia atrás (Euler hacia atrás).
//   La trapezoidal promedia el error actual y el anterior,
//   siendo más precisa (error O(T²) vs O(T) del Euler).
//   Mejor aproximación de la integral continua, especialmente
//   con períodos de muestreo T más grandes.
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

// ---------- VARIABLES DE ESTADO ----------
float e_prev = 0.0f;   // error anterior e[k-1]
float W      = 0.0f;   // acumulador integral trapezoidal W[k]

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
  Serial.println("=== PID Metodo 5: Integracion Trapezoidal ===");
  Serial.println("Comandos: s:<cm>  kp:<v>  ki:<v>  kd:<v>");
}

// ================================================================
void loop() {
  leerSerial();

  if (millis() - tAnt < T_MS) return;
  tAnt = millis();

  // 1. Medir posición
  float y = leerDistancia();
  if (y < 2.0f || y > 60.0f) return;

  // 2. Error actual
  float e = setpoint - y;

  // 3. ─── MÉTODO 5: Integración Trapezoidal ────────────────────

  // Integral TRAPEZOIDAL: promedio de e[k] y e[k-1]
  // W[k] = W[k-1] + (T/2)·(e[k] + e[k-1])
  W = W + (T / 2.0f) * (e + e_prev);
  W = constrain(W, -500.0f, 500.0f);   // anti-windup

  // Derivada: diferencias hacia atrás (igual que Método 1)
  // kd·(e[k] - e[k-1])/T
  float U = Kp * e + Ki * W + Kd * (e - e_prev) / T;
  // ────────────────────────────────────────────────────────────

  e_prev = e;   // guardar e[k] para siguiente ciclo

  U = constrain(U, -ANGULO_MAX, ANGULO_MAX);
  moverHacia((long)(U * STEPS_PER_DEG));

  // Debug
  Serial.print("y="); Serial.print(y, 1);
  Serial.print(" e="); Serial.print(e, 2);
  Serial.print(" W="); Serial.print(W, 2);
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
      else if (buf == "home")     { centrarBeam(); W = 0; e_prev = 0; }
      buf = "";
    } else { buf += c; }
  }
}
