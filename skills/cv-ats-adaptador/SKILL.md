---
name: cv-ats-adaptador
description: Adapta el CV de Arith Maldonado Zamudio a una vacante para pasar filtros ATS. Úsalo SIEMPRE que el usuario pegue el texto de una vacante, oferta de trabajo, job description o link a un puesto (aunque no escriba ninguna instrucción), o cuando pida adaptar su CV, calcular su % de match ATS o saber si le conviene aplicar. Elige el mejor CV base, calcula el match, da un veredicto y entrega el CV completo adaptado, sin inventar experiencia.
---

# Adaptador de CV para ATS

## Regla principal (léela primero)

El usuario solo va a pegar el texto de la vacante, sin instrucciones. Eso basta para ejecutar TODO el flujo.
- No pidas el CV: usa los **CVs BASE** incluidos al final de este archivo.
- No pidas confirmación ni preguntes "¿quieres que lo adapte?". No te detengas después del análisis.
- Aunque el match sea bajo o falten requisitos, igual entrega el CV adaptado y reporta las brechas aparte.
- Si el usuario pega otro CV junto con la vacante, ese tiene prioridad.

## Paso 1. Leer la vacante

Extrae:
- Puesto, empresa, ubicación/modalidad, idioma de la vacante.
- Palabras clave, cada una marcada como **obligatoria** (requisitos, "must have", "indispensable") o **deseable** ("nice to have", "plus", "deseable"):
  habilidades técnicas, software/herramientas, metodologías/normas, habilidades blandas.
- **Filtros eliminatorios**: carrera exigida, años de experiencia, idioma y nivel, ubicación/reubicación, visa/permiso, disponibilidad/fecha de inicio.

## Paso 2. Elegir el CV base

Los CVs BASE (al final) son los CVs finales y pulidos de Arith, cada uno enfocado en un tipo de puesto: Automation & Controls, Graduate/Trainee Program, Maintenance & Field Service, Manufacturing & Process, Mechanical & Product Design, Medical Devices, Test/Verification & Validation, más versiones hechas para GE (Development Program), GE HealthCare (QA Engineer I) y Schneider (Global Supply Chain).

- Elige el CV BASE cuyo enfoque y palabras clave se parezcan más a la vacante. **Parte de ese CV y respeta su redacción, estructura y orden**: son CVs ya pulidos. Cambia solo lo necesario para meter las palabras clave de la vacante; no reescribas bullets que ya funcionan.
- **Inventario de hechos reales** = todo lo que aparece en CUALQUIERA de los CVs BASE (experiencia, proyectos, cifras, herramientas, certificaciones, idiomas). Puedes traer un bullet o un proyecto de otro CV BASE si encaja mejor con la vacante (por ejemplo el Two-Link Robotic Arm o el Fastener-Free Laser-Cut Assembly). Indica en la tabla "tomado de <CV>".
- Si la vacante está en español, traduce el CV al español manteniendo nombres propios, software y certificaciones en su forma original.
- Los CVs hechos para una empresa (GE, GE HealthCare, Schneider) sirven como base, pero **nunca dejes el nombre de otra empresa o programa** en el título o el perfil.

**Ubicación en el encabezado:**
- Si la vacante es en Monterrey o su área metropolitana (Nuevo León: San Nicolás, Apodaca, Escobedo, Guadalupe, Santa Catarina, San Pedro, etc.) → `San Nicolás de los Garza, N.L., Mexico · Open to relocation`.
- En cualquier otro caso → `Puebla, Mexico · Open to relocation (Mexico & abroad)`.

## Paso 3. Calcular el match (siempre con esta fórmula)

```
Match % = (2 × obligatorias presentes + deseables presentes) / (2 × total obligatorias + total deseables) × 100
```

Una palabra clave está "presente" solo si el inventario tiene respaldo real (el término exacto, un sinónimo directo o una experiencia que claramente lo demuestra).
- **Match inicial**: contra el CV base elegido, tal como está.
- **Match tras adaptación**: contra el CV adaptado. Solo sube por palabras clave que ya eran reales pero no estaban escritas con el término exacto, o que venían de otro CV base. Nunca por agregar cosas falsas.

## Paso 4. Veredicto

- **≥ 75 % y sin filtros eliminatorios fallidos → APLICA YA.**
- **55–74 %, o un filtro eliminatorio dudoso → APLICA CON EL CV ADAPTADO** (explica qué reforzar en la carta o la entrevista).
- **< 55 %, o un filtro eliminatorio claramente no cumplido → MATCH BAJO** (dilo claro y explica por qué; aun así entrega el CV).

## Paso 5. Adaptar el CV

- Título profesional (la línea bajo el nombre): usa el nombre del puesto de la vacante si es honesto (por ejemplo "Mechatronics Engineering Student | Automation & Controls").
- Perfil: 3–4 líneas con las palabras clave obligatorias que sí están respaldadas.
- Bullets de experiencia y proyectos: reformula con la terminología exacta del empleador. Mantén cifras, fechas y empresas iguales.
- Proyectos: ordénalos por relevancia. Puedes cambiar uno por otro del inventario si encaja mejor.
- Habilidades: pon primero las que pide la vacante; quita o baja las irrelevantes.
- Formato ATS: texto plano, sin tablas, sin columnas, sin iconos, sin gráficos. Encabezados estándar (Profile/Perfil, Education/Educación, Experience/Experiencia, Projects/Proyectos, Certifications/Certificaciones, Skills/Habilidades). Fechas con el mismo formato en todo el CV.
- Extensión: 1 página (máximo ~550 palabras).

## Regla estricta

NUNCA inventes experiencia, empresas, puestos, fechas, cifras, herramientas, certificaciones, idiomas ni niveles. Si una palabra clave no tiene respaldo en el inventario, NO va en el CV: va en "Brechas".

## Formato de salida (obligatorio, en español, en este orden)

```
## Veredicto: <APLICA YA | APLICA CON EL CV ADAPTADO | MATCH BAJO>
**<Puesto> — <Empresa>**
- CV base usado: <nombre del CV>
- Match ATS inicial: XX %  →  tras adaptación: YY %
- Si el match inicial ya es ≥ 80 %: "Puedes mandar tu CV tal cual: <ruta del archivo SIN foto de ese CV BASE>" (y aun así da el adaptado)
- Filtros eliminatorios: <cumple / dudoso / no cumple, con detalle>

## Palabras clave
| Palabra clave | Obligatoria/Deseable | ¿Respaldada? | Dónde quedó en el CV |

## Brechas
- <requisito no cubierto> → qué hacer (mencionarlo en entrevista, curso/certificación corto, proyecto del portafolio relacionado, etc.)

## Cambios principales
- 3 a 6 bullets con qué cambió respecto al CV base y por qué

## CV adaptado
<CV COMPLETO en un solo bloque de código, en el idioma de la vacante, listo para copiar a Word>

Nombre de archivo sugerido: CV_Arith_Maldonado_<Empresa>_<Puesto>.pdf
Foto: sin foto si aplicas por portal/ATS o a empresa de EE. UU./Canadá; con foto solo si la vacante la pide o la envías directo a un reclutador en México.
```

La sección "CV adaptado" es obligatoria y debe contener el CV entero (encabezado, perfil, educación, experiencia, proyectos, certificaciones y habilidades), no fragmentos.

---

# CVs BASE

## CV BASE: EN_Automation_Controls/CV_Arith_Maldonado.pdf

Archivos con este mismo CV:
- EN_Automation_Controls/CV_Arith_Maldonado.pdf
- EN_CON_FOTO/EN_Automation_Controls_PHOTO.pdf
- EN_CON_FOTO/EN_Automation_Controls/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/CON_FOTO/EN_Automation_Controls/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/SIN_FOTO/EN_Automation_Controls/CV_Arith_Maldonado.pdf

```
Arith Maldonado Zamudio
Automation & Controls Engineer | Closed-Loop Control · PLC · Embedded Systems
Puebla, Mexico · Open to relocation (Mexico & abroad) | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
linkedin.com/in/arith-maldonado-zamudio-4038262b5 | Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
PROFILE
Mechatronics Engineer (B.Eng. Dec 2026) and Biomedical Engineer with Honors who builds working control systems end to
end: sensors, controller, firmware, and actuators. Designed and tuned closed-loop PID/PD controllers on real hardware, and
brings 6 months of field experience installing and troubleshooting electromechanical equipment. Ready to support integration,
commissioning, and troubleshooting of automated lines.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Biomechanics, finite element analysis, device design and prototyping
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla Jul 2024 – Dec 2024
Performed preventive and corrective maintenance, installation, and fault diagnosis on ultrasound systems, X-ray units, flat-
panel detectors, and triggering devices at client sites.
Root-caused a failed power supply and qualified a functionally equivalent replacement, cutting the client's part cost by 90%
(MXN $15,000 → $1,500).
Resolved 15+ service cases end-to-end: troubleshooting, technical reports, warranty/ticket processing, and customer follow-
up.
Trained physicians and technicians on equipment operation and first-level troubleshooting.
ENGINEERING PROJECTS
Ball & Beam Digital Control Prototype | Arduino · NEMA 17/DRV8825 · MATLAB Expo Ibero 2026
Modeled an open-loop-unstable system (Euler-Lagrange), discretized it with ZOH, and tuned a digital PID via Ziegler-Nichols
and ISE (simulated: 2.8 s settling, 12% overshoot).
Implemented and compared PID variants on Arduino at Ts = 50 ms: EMA sensor filtering, high-pass derivative, setpoint-kick
reduction, and trapezoidal integration with anti-windup.
Integrated a NEMA 17 stepper (DRV8825, 1/8 microstepping), position sensor, and ±15° actuation limits on a CAD-designed,
3D-printed structure.
3-DOF Ball-Balancing Platform | ESP32 · Python/OpenCV · Bluetooth · SolidWorks
Built a vision-guided closed-loop system: OpenCV (HSV) ball tracking, PD controller, and Bluetooth commands to an ESP32
driving 3 servos at up to 66 Hz.
Wrote fail-safe firmware: non-blocking command parser, motion ramping, angle limits, and a 700 ms timeout that returns
the platform to a safe center.
Somnus Smart-Room Monitor | Raspberry Pi 5 · Python/PyQt5 · Firestore
Integrated PIR sensing, relay-driven fans, and an L298N curtain motor on a Raspberry Pi 5; built a PyQt5 dashboard with live
plots and CSV/Excel export, synced to a mobile app.
SKILLS & CERTIFICATIONS
Automation & Controls: PID/PD tuning (Ziegler-Nichols, ISE), discrete control (ZOH), Siemens S7-1200 PLC and relay control
(project-based), sensors, servo/stepper drives, industrial automation coursework
Embedded & Software: ESP32/Arduino, Raspberry Pi (GPIO), C/C++, Python (OpenCV, PyQt5), MATLAB/Simulink,
Bluetooth/serial communication, Firebase
Hardware & Design: Wiring and electrical diagnostics, Altium Designer, SolidWorks (CSWA), pneumatic/hydraulic components,
rapid prototyping
Certifications: CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing Associate; Siemens Basics of
Robotics; Siemens Industry Foundations; Google Project Management
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```

## CV BASE: EN_Graduate_Trainee_Program/CV_Arith_Maldonado.pdf

Archivos con este mismo CV:
- EN_Graduate_Trainee_Program/CV_Arith_Maldonado.pdf
- EN_CON_FOTO/EN_Graduate_Trainee_Program_PHOTO.pdf
- EN_CON_FOTO/EN_Graduate_Trainee_Program/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/CON_FOTO/EN_Graduate_Trainee_Program/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/SIN_FOTO/EN_Graduate_Trainee_Program/CV_Arith_Maldonado.pdf

```
Arith Maldonado Zamudio
Mechatronics & Biomedical Engineer | Graduate / Trainee Engineering Programs
Puebla, Mexico · Open to relocation (Mexico & abroad) | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
linkedin.com/in/arith-maldonado-zamudio-4038262b5 | Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
PROFILE
Two engineering degrees (Mechatronics, Dec 2026; Biomedical with Honors), GPA 9.1/10, and 6 months of field service experience.
Has designed and built 7 working prototypes across control, embedded systems, IoT, and mechanical design, presented research at
the ISPO World Congress 2025, and worked with DIF Puebla and Autismo Puebla during social service. Fast learner, open to
rotations, shifts, and relocation in Mexico or abroad.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Biomechanics, finite element analysis, device design and prototyping
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla Jul 2024 – Dec 2024
Performed preventive and corrective maintenance, installation, and fault diagnosis on ultrasound systems, X-ray units, flat-panel
detectors, and triggering devices at client sites.
Root-caused a failed power supply and qualified a functionally equivalent replacement, cutting the client's part cost by 90% (MXN
$15,000 → $1,500).
Resolved 15+ service cases end-to-end: troubleshooting, technical reports, warranty/ticket processing, and customer follow-up.
Trained physicians and technicians on equipment operation and first-level troubleshooting.
ENGINEERING PROJECTS
3-DOF Ball-Balancing Platform | ESP32 · Python/OpenCV · Bluetooth · SolidWorks
Built a vision-guided closed-loop system: OpenCV (HSV) ball tracking, PD controller, and Bluetooth commands to an ESP32 driving
3 servos at up to 66 Hz.
Wrote fail-safe firmware: non-blocking command parser, motion ramping, angle limits, and a 700 ms timeout that returns the
platform to a safe center.
Transradial Prosthesis Tool Holder | SolidWorks Simulation · AISI 304 · PETG ISPO World Congress 2025
Redesigned a dental-tool holder for a prosthesis user; FEA under a 50 N load confirmed a minimum safety factor of 2.88 and
checked stress, deformation, and fatigue on critical parts.
Selected materials, iterated CAD for assembly, and reached 4.8/5 device satisfaction (QUEST 2.0); poster accepted at the ISPO
20th World Congress, Stockholm.
XGIO Smart-Cane GPS Ecosystem | ESP32 · Python · Firebase · React Native · SolidWorks Social service · DIF Puebla
Built a 7-module IoT system: ESP32/T-Beam firmware (GPS, MPU6050 fall detection, SOS), Firebase backend, caregiver mobile
app, and web dashboard.
Therapeutic Games for Children with Autism | SolidWorks · User-centered design Social service · Autismo Puebla
Designed in SolidWorks a series of games to build motor skills; supported therapy sessions and improved session scheduling and
learning materials.
Ball & Beam Digital Control Prototype | Arduino · NEMA 17/DRV8825 · MATLAB Expo Ibero 2026
Modeled an open-loop-unstable system (Euler-Lagrange), discretized it with ZOH, and tuned a digital PID via Ziegler-Nichols and
ISE (simulated: 2.8 s settling, 12% overshoot).
SKILLS & CERTIFICATIONS
Technical: SolidWorks (CSWA), FEA, PID control, ESP32/Arduino, Raspberry Pi, Python (OpenCV), MATLAB, Siemens S7-1200 PLC
(project-based), CNC and 3D printing
Professional: Project management (Google certificate), technical reporting, customer training, Excel, Power BI
Certifications: CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing Associate; Siemens Basics of
Robotics; Siemens Industry Foundations; Google Project Management
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```

## CV BASE: EN_Maintenance_Field_Service/CV_Arith_Maldonado.pdf

Archivos con este mismo CV:
- EN_Maintenance_Field_Service/CV_Arith_Maldonado.pdf
- EN_CON_FOTO/EN_Maintenance_Field_Service_PHOTO.pdf
- EN_CON_FOTO/EN_Maintenance_Field_Service/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/CON_FOTO/EN_Maintenance_Field_Service/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/SIN_FOTO/EN_Maintenance_Field_Service/CV_Arith_Maldonado.pdf

```
Arith Maldonado Zamudio
Maintenance & Field Service Engineer | Troubleshooting · Electromechanical Systems
Puebla, Mexico · Open to relocation (Mexico & abroad) | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
linkedin.com/in/arith-maldonado-zamudio-4038262b5 | Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
PROFILE
Mechatronics Engineer (B.Eng. Dec 2026) and Biomedical Engineer with Honors with 6 months of on-site service experience:
installation, preventive and corrective maintenance, and fault diagnosis of imaging and electromechanical equipment. Cut a
client's repair cost by 90% by finding an equivalent replacement part. Comfortable training users and working directly with
customers, in English and Spanish.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Biomechanics, finite element analysis, device design and prototyping
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla Jul 2024 – Dec 2024
Performed preventive and corrective maintenance, installation, and fault diagnosis on ultrasound systems, X-ray units,
flat-panel detectors, and triggering devices at client sites.
Resolved 15+ service cases end-to-end: troubleshooting, technical reports, warranty/ticket processing, and customer
follow-up.
Root-caused a failed power supply and qualified a functionally equivalent replacement, cutting the client's part cost by
90% (MXN $15,000 → $1,500).
Trained physicians and technicians on equipment operation and first-level troubleshooting.
ENGINEERING PROJECTS
Two-Link Articulated Robotic Arm | SolidWorks · NEMA 17 · DRV8825 · 3D printing
Diagnosed stepper-driver failures: calibrated DRV8825 current limit (VREF), traced thermal shutdown, and checked STEP-
signal integrity.
Designed two compact 3D-printed planetary gearboxes (4.36:1 and 6:1) and verified concentricity, interference, torque
capacity, and ratios (Willis equation) before printing.
3-DOF Ball-Balancing Platform | ESP32 · Python/OpenCV · Bluetooth · SolidWorks
Wrote fail-safe firmware: non-blocking command parser, motion ramping, angle limits, and a 700 ms timeout that returns
the platform to a safe center.
Validated on hardware with manual-response tests and autonomous balancing runs; tuned gains, axis mapping, and
center calibration iteratively.
Somnus Smart-Room Monitor | Raspberry Pi 5 · Python/PyQt5 · Firestore
Integrated PIR sensing, relay-driven fans, and an L298N curtain motor on a Raspberry Pi 5; built a PyQt5 dashboard with
live plots and CSV/Excel export, synced to a mobile app.
SKILLS & CERTIFICATIONS
Maintenance & Service: Preventive/corrective maintenance, installation and start-up, electrical and electromechanical
troubleshooting, root-cause analysis, service reports, customer training
Technical: Sensors, motors and drivers (servo, stepper, DC/L298N), relays, power supplies, Siemens S7-1200 PLC (project-
based), pneumatic/hydraulic components, blueprint and diagram reading
Tools: SolidWorks (CSWA), ESP32/Arduino, Raspberry Pi, Python, MATLAB, Excel; availability for travel and shift work
Certifications: CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing Associate; Siemens Basics of
Robotics; Siemens Industry Foundations; Google Project Management
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```

## CV BASE: EN_Manufacturing_Process/CV_Arith_Maldonado.pdf

Archivos con este mismo CV:
- EN_Manufacturing_Process/CV_Arith_Maldonado.pdf
- EN_CON_FOTO/EN_Manufacturing_Process_PHOTO.pdf
- EN_CON_FOTO/EN_Manufacturing_Process/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/CON_FOTO/EN_Manufacturing_Process/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/SIN_FOTO/EN_Manufacturing_Process/CV_Arith_Maldonado.pdf

```
Arith Maldonado Zamudio
Manufacturing & Process Engineer | DFM · Prototyping · Technical Documentation
Puebla, Mexico · Open to relocation (Mexico & abroad) | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
linkedin.com/in/arith-maldonado-zamudio-4038262b5 | Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
PROFILE
Mechatronics Engineer (B.Eng. Dec 2026) and Biomedical Engineer with Honors who takes parts from CAD to the shop floor:
engineering drawings, BOMs, tolerance decisions, and hands-on fabrication with CNC, laser cutting, and 3D printing. Brings 6
months of field experience with a strong cost focus (90% part-cost reduction) and a structured, documented approach to
solving problems.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Biomechanics, finite element analysis, device design and prototyping
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla Jul 2024 – Dec 2024
Root-caused a failed power supply and qualified a functionally equivalent replacement, cutting the client's part cost by
90% (MXN $15,000 → $1,500).
Performed preventive and corrective maintenance, installation, and fault diagnosis on ultrasound systems, X-ray units,
flat-panel detectors, and triggering devices at client sites.
Documented 15+ service cases with technical reports, warranty/ticket records, and customer follow-up, keeping full
traceability of each intervention.
ENGINEERING PROJECTS
Fastener-Free Laser-Cut Assembly | SolidWorks · DXF · Laser cutting
Designed an MDF structure assembled only with slot-and-tab joints, sizing slots to material thickness and laser-kerf
tolerances (zero screws or adhesive).
Two-Link Articulated Robotic Arm | SolidWorks · NEMA 17 · DRV8825 · 3D printing
Designed two compact 3D-printed planetary gearboxes (4.36:1 and 6:1) and verified concentricity, interference, torque
capacity, and ratios (Willis equation) before printing.
Transradial Prosthesis Tool Holder | SolidWorks Simulation · AISI 304 · PETG ISPO World Congress 2025
Redesigned a dental-tool holder for a prosthesis user; FEA under a 50 N load confirmed a minimum safety factor of 2.88
and checked stress, deformation, and fatigue on critical parts.
Selected materials, iterated CAD for assembly, and reached 4.8/5 device satisfaction (QUEST 2.0); poster accepted at the
ISPO 20th World Congress, Stockholm.
3-DOF Ball-Balancing Platform | ESP32 · Python/OpenCV · Bluetooth · SolidWorks
Modeled the platform and 3-arm linkage in SolidWorks and fabricated the prototype.
Validated on hardware with manual-response tests and autonomous balancing runs; tuned gains, axis mapping, and
center calibration iteratively.
SKILLS & CERTIFICATIONS
Manufacturing: DFM, rapid prototyping, CNC router, lathe, milling, laser cutting, 3D printing (FDM/resin), additive
manufacturing (certified), blueprint interpretation
Design & Documentation: SolidWorks (CSWA), SolidWorks Simulation, CATIA V5 (self-taught), engineering drawings,
assemblies, BOMs, GD&T, metrology, technical reports
Analysis & Tools: Project management (Google certificate), Excel, Power BI, Python, MATLAB
Certifications: CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing Associate; Siemens Basics of
Robotics; Siemens Industry Foundations; Google Project Management
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```

## CV BASE: EN_Mechanical_Product_Design/CV_Arith_Maldonado.pdf

Archivos con este mismo CV:
- EN_Mechanical_Product_Design/CV_Arith_Maldonado.pdf
- EN_CON_FOTO/EN_Mechanical_Product_Design_PHOTO.pdf
- EN_CON_FOTO/EN_Mechanical_Product_Design/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/CON_FOTO/EN_Mechanical_Product_Design/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/SIN_FOTO/EN_Mechanical_Product_Design/CV_Arith_Maldonado.pdf

```
Arith Maldonado Zamudio
Mechanical / Product Design Engineer | SolidWorks (CSWA) · FEA · GD&T
Puebla, Mexico · Open to relocation (Mexico & abroad) | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
linkedin.com/in/arith-maldonado-zamudio-4038262b5 | Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
PROFILE
Mechatronics Engineer (B.Eng. Dec 2026) and Biomedical Engineer with Honors, triple SOLIDWORKS certified, with 7 designed
and built prototypes. Designs parts that are validated before they are made: FEA with a 2.88 minimum safety factor on a medical
device, verified planetary gearboxes, and fastener-free DFM assemblies. Work presented at the ISPO World Congress 2025.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Biomechanics, finite element analysis, device design and prototyping
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla Jul 2024 – Dec 2024
Root-caused a failed power supply and qualified a functionally equivalent replacement, cutting the client's part cost by 90%
(MXN $15,000 → $1,500).
Performed preventive and corrective maintenance, installation, and fault diagnosis on ultrasound systems, X-ray units, flat-
panel detectors, and triggering devices at client sites.
Trained physicians and technicians on equipment operation and first-level troubleshooting.
ENGINEERING PROJECTS
Transradial Prosthesis Tool Holder | SolidWorks Simulation · AISI 304 · PETG ISPO World Congress 2025
Redesigned a dental-tool holder for a prosthesis user; FEA under a 50 N load confirmed a minimum safety factor of 2.88 and
checked stress, deformation, and fatigue on critical parts.
Selected materials, iterated CAD for assembly, and reached 4.8/5 device satisfaction (QUEST 2.0); poster accepted at the ISPO
20th World Congress, Stockholm.
Two-Link Articulated Robotic Arm | SolidWorks · NEMA 17 · DRV8825 · 3D printing
Designed two compact 3D-printed planetary gearboxes (4.36:1 and 6:1) and verified concentricity, interference, torque
capacity, and ratios (Willis equation) before printing.
Diagnosed stepper-driver failures: calibrated DRV8825 current limit (VREF), traced thermal shutdown, and checked STEP-signal
integrity.
Fastener-Free Laser-Cut Assembly | SolidWorks · DXF · Laser cutting
Designed an MDF structure assembled only with slot-and-tab joints, sizing slots to material thickness and laser-kerf tolerances
(zero screws or adhesive).
XGIO Smart-Cane GPS Ecosystem | ESP32 · Python · Firebase · React Native · SolidWorks Social service · DIF Puebla
Wrote Python geospatial filters (Haversine, 2.5 m/s pedestrian threshold) to remove GPS noise; designed and 3D-printed the
enclosure in SolidWorks.
Therapeutic Games for Children with Autism | SolidWorks · User-centered design Social service · Autismo Puebla
Designed in SolidWorks a series of games to develop motor skills and other developmental areas in children with autism (Jan –
May 2024).
SKILLS & CERTIFICATIONS
CAD & Analysis: SolidWorks (CSWA), SolidWorks Simulation (static, fatigue, safety factor), CATIA V5 (self-taught), GD&T, tolerance
analysis, engineering drawings, BOMs
Product Development: DFM, material selection, rapid prototyping (3D printing, laser cutting, CNC), design iteration from user
requirements, technical documentation
Mechatronics: Motors and gear trains, ESP32/Arduino, sensors, MATLAB, Python
Certifications: CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing Associate; Siemens Basics of
Robotics; Siemens Industry Foundations; Google Project Management
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```

## CV BASE: EN_Medical_Devices/CV_Arith_Maldonado.pdf

Archivos con este mismo CV:
- EN_Medical_Devices/CV_Arith_Maldonado.pdf
- EN_CON_FOTO/EN_Medical_Devices_PHOTO.pdf
- EN_CON_FOTO/EN_Medical_Devices/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/CON_FOTO/EN_Medical_Devices/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/SIN_FOTO/EN_Medical_Devices/CV_Arith_Maldonado.pdf

```
Arith Maldonado Zamudio
Medical Device Engineer | Manufacturing · Quality · Service · Design Validation
Puebla, Mexico · Open to relocation (Mexico & abroad) | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
linkedin.com/in/arith-maldonado-zamudio-4038262b5 | Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
PROFILE
Biomedical Engineer with Honors and Mechatronics Engineer (B.Eng. Dec 2026) with 6 months of hands-on service on ultrasound
and X-ray equipment. Combines device knowledge with engineering rigor: FEA and user validation of a prosthetic device presented
at ISPO 2025, traceable service documentation, and a 90% cost reduction on a replacement part. Social service with DIF Puebla and
Autismo Puebla.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Biomechanics, finite element analysis, device design and prototyping
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla Jul 2024 – Dec 2024
Performed preventive and corrective maintenance, installation, and fault diagnosis on ultrasound systems, X-ray units, flat-panel
detectors, and triggering devices at client sites.
Documented 15+ service cases with technical reports, warranty/ticket records, and customer follow-up, keeping full traceability
of each intervention.
Root-caused a failed power supply and qualified a functionally equivalent replacement, cutting the client's part cost by 90% (MXN
$15,000 → $1,500).
Trained physicians and technicians on equipment operation and first-level troubleshooting.
ENGINEERING PROJECTS
Transradial Prosthesis Tool Holder | SolidWorks Simulation · AISI 304 · PETG ISPO World Congress 2025
Redesigned a dental-tool holder for a prosthesis user; FEA under a 50 N load confirmed a minimum safety factor of 2.88 and
checked stress, deformation, and fatigue on critical parts.
Selected materials, iterated CAD for assembly, and reached 4.8/5 device satisfaction (QUEST 2.0); poster accepted at the ISPO
20th World Congress, Stockholm.
XGIO Smart-Cane GPS Ecosystem | ESP32 · Python · Firebase · React Native · SolidWorks Social service · DIF Puebla
Built a 7-module IoT system: ESP32/T-Beam firmware (GPS, MPU6050 fall detection, SOS), Firebase backend, caregiver mobile
app, and web dashboard.
Wrote Python geospatial filters (Haversine, 2.5 m/s pedestrian threshold) to remove GPS noise; designed and 3D-printed the
enclosure in SolidWorks.
Therapeutic Games for Children with Autism | SolidWorks · User-centered design Social service · Autismo Puebla
Designed in SolidWorks a series of games to develop motor skills and other developmental areas in children with autism (Jan –
May 2024).
Supported therapy sessions and improved time management and the therapy-scheduling process, as well as the children's
learning materials.
3-DOF Ball-Balancing Platform | ESP32 · Python/OpenCV · Bluetooth · SolidWorks
Built a vision-guided closed-loop system: OpenCV (HSV) ball tracking, PD controller, and Bluetooth commands to an ESP32 driving
3 servos at up to 66 Hz.
SKILLS & CERTIFICATIONS
Medical Devices: Ultrasound, X-ray and flat-panel systems, installation and service, user training, biomechanics, device design and
validation, user-satisfaction assessment (QUEST 2.0, PIADS)
Engineering: SolidWorks (CSWA), FEA, GD&T, technical reports and traceability, ESP32/Arduino, Python, MATLAB
Manufacturing: Rapid prototyping, additive manufacturing (certified), material selection, DFM
Certifications: CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing Associate; Siemens Basics of
Robotics; Siemens Industry Foundations; Google Project Management
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```

## CV BASE: EN_Test_Verification_Validation/CV_Arith_Maldonado.pdf

Archivos con este mismo CV:
- EN_Test_Verification_Validation/CV_Arith_Maldonado.pdf
- EN_CON_FOTO/EN_Test_Verification_Validation_PHOTO.pdf
- EN_CON_FOTO/EN_Test_Verification_Validation/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/CON_FOTO/EN_Test_Verification_Validation/CV_Arith_Maldonado.pdf
- MTY_San_Nicolas/SIN_FOTO/EN_Test_Verification_Validation/CV_Arith_Maldonado.pdf

```
Arith Maldonado Zamudio
Test, Verification & Validation Engineer | Root-Cause Analysis · Embedded Systems · FEA
Puebla, Mexico · Open to relocation (Mexico & abroad) | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
linkedin.com/in/arith-maldonado-zamudio-4038262b5 | Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
PROFILE
Mechatronics Engineer (B.Eng. Dec 2026) and Biomedical Engineer with Honors, with 6 months of field experience diagnosing
electromechanical and imaging equipment. Brings a verify-before-release mindset: FEA-validated a medical device (min. FOS
2.88), verified gearbox designs before fabrication, and root-caused hardware faults on embedded control systems. Clear,
traceable test documentation in English and Spanish.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Biomechanics, finite element analysis, device design and prototyping
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla Jul 2024 – Dec 2024
Installed, tested, and diagnosed ultrasound systems, X-ray units, flat-panel detectors, and triggering devices; verified correct
operation before handover to the client.
Resolved 15+ service cases by structured fault isolation (symptom → subsystem → component), documenting findings,
corrective actions, and results in technical reports.
Root-caused a failed power supply and qualified a functionally equivalent replacement, cutting the client's part cost by 90%
(MXN $15,000 → $1,500).
Trained physicians and technicians on equipment operation and first-level troubleshooting.
ENGINEERING PROJECTS
Transradial Prosthesis Tool Holder | SolidWorks Simulation · AISI 304 · PETG ISPO World Congress 2025
Redesigned a dental-tool holder for a prosthesis user; FEA under a 50 N load confirmed a minimum safety factor of 2.88 and
checked stress, deformation, and fatigue on critical parts.
Selected materials, iterated CAD for assembly, and reached 4.8/5 device satisfaction (QUEST 2.0); poster accepted at the
ISPO 20th World Congress, Stockholm.
Two-Link Articulated Robotic Arm | SolidWorks · NEMA 17 · DRV8825 · 3D printing
Designed two compact 3D-printed planetary gearboxes (4.36:1 and 6:1) and verified concentricity, interference, torque
capacity, and ratios (Willis equation) before printing.
Diagnosed stepper-driver failures: calibrated DRV8825 current limit (VREF), traced thermal shutdown, and checked STEP-
signal integrity.
3-DOF Ball-Balancing Platform | ESP32 · Python/OpenCV · Bluetooth · SolidWorks
Built a vision-guided closed-loop system: OpenCV (HSV) ball tracking, PD controller, and Bluetooth commands to an ESP32
driving 3 servos at up to 66 Hz.
Validated on hardware with manual-response tests and autonomous balancing runs; tuned gains, axis mapping, and center
calibration iteratively.
SKILLS & CERTIFICATIONS
Test & Validation: Test planning and execution, functional and integration testing, fault isolation, root-cause analysis,
calibration, test reports and traceability
Analysis & CAD: SolidWorks (CSWA), SolidWorks Simulation (FEA: stress, safety factor, fatigue), GD&T, tolerance analysis,
MATLAB/Simulink
Embedded & Data: ESP32/Arduino, Raspberry Pi, Python (OpenCV, Pandas), C/C++, sensors and actuators, stepper/servo
drivers, Excel, Power BI
Certifications: CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing Associate; Siemens Basics of
Robotics; Siemens Industry Foundations; Google Project Management
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```

## CV BASE: GE_Development_Program_CON_FOTO/Arith_Maldonado_Zamudio_CV_GE.pdf

Archivos con este mismo CV:
- GE_Development_Program_CON_FOTO/Arith_Maldonado_Zamudio_CV_GE.pdf

```
Arith Maldonado Zamudio
Mechatronics & Biomedical Engineer | Field Service · Controls · Technical Support
Puebla, Mexico · Open to relocation | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
LinkedIn: linkedin.com/in/arith-maldonado-zamudio-4038262b5
Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
SUMMARY
Early-career engineer with two engineering degrees (Mechatronics, Dec 2026; Biomedical with Honors, GPA 9.1/10) and 6
months of customer-facing field service on ultrasound and X-ray equipment: installation, preventive and corrective maintenance,
troubleshooting, and user training. Designed and built 7 working prototypes in control systems, embedded systems, IoT, and
mechanical design (CAD/FEA), and presented research at the ISPO World Congress 2025. Clear technical communicator in English
(C2) and Spanish; open to rotational assignments, travel, shifts, and relocation in Mexico or abroad.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Biomechanics, finite element analysis, medical device design and prototyping
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla, Mexico Jul 2024 – Dec 2024
Performed installation, preventive and corrective maintenance, and fault diagnosis on ultrasound systems, X-ray units, flat-
panel detectors, and triggering devices at hospital and clinic sites.
Resolved 15+ service cases end-to-end: troubleshooting, root-cause analysis, technical reports, warranty/ticket processing,
and customer follow-up.
Root-caused a failed power supply and qualified a functionally equivalent replacement, cutting the customer's part cost by
90% (MXN $15,000 to $1,500).
Trained physicians and technicians on equipment operation, safe use, and first-level troubleshooting.
ENGINEERING PROJECTS
3-DOF Ball-Balancing Platform | ESP32 · Python/OpenCV · Bluetooth · SolidWorks
Built a vision-guided closed-loop control system: OpenCV ball tracking, PD controller, and Bluetooth commands to an ESP32
driving 3 servos at up to 66 Hz.
Wrote fail-safe firmware (motion ramping, angle limits, 700 ms timeout to a safe position) and validated it with hardware tests
and gain tuning.
Ball & Beam Digital Control Prototype | Arduino · NEMA 17/DRV8825 · MATLAB Expo Ibero 2026
Modeled an open-loop-unstable system, discretized it (ZOH), and tuned a digital PID (Ziegler-Nichols, ISE) implemented on
Arduino with anti-windup and sensor filtering.
Transradial Prosthesis Tool Holder | SolidWorks Simulation · AISI 304 · PETG ISPO World Congress 2025
Redesigned a tool holder for a prosthesis user; FEA under a 50 N load confirmed a minimum safety factor of 2.88; reached
4.8/5 user satisfaction (QUEST 2.0).
XGIO Smart-Cane GPS Ecosystem | ESP32 · Python · Firebase · React Native Social service
Built a 7-module IoT system: ESP32 firmware (GPS, fall detection, SOS), Firebase backend, caregiver mobile app, and web
dashboard.
SKILLS & CERTIFICATIONS
Field Service & Technical Support: Installation and start-up, preventive/corrective maintenance, electrical and electromechanical
troubleshooting, root-cause analysis, service reports, customer training
Engineering: SolidWorks (CSWA), FEA, GD&T, PID/closed-loop control, Siemens S7-1200 PLC (project-based), sensors, motors and
drives, MATLAB/Simulink
Software & Data: Python (OpenCV, Pandas), C/C++, ESP32/Arduino, Raspberry Pi, Excel, Power BI; project management (Google
certificate)
Certifications: CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing Associate; Siemens Basics of
Robotics; Siemens Industry Foundations; Google Project Management
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```

## CV BASE: Schneider_GSC_CON_FOTO/Arith_Maldonado_Zamudio_CV.pdf

Archivos con este mismo CV:
- Schneider_GSC_CON_FOTO/Arith_Maldonado_Zamudio_CV.pdf

```
Arith Maldonado Zamudio
Mechatronics & Biomedical Engineer | Schneider Development Program – Global Supply Chain
Puebla, Mexico · Open to relocation in Mexico | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
LinkedIn: linkedin.com/in/arith-maldonado-zamudio-4038262b5
Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
SUMMARY
Early-career engineer with two engineering degrees (Mechatronics, Dec 2026; Biomedical with Honors, GPA 9.1/10) and 6 months of
customer-facing field service experience. Brings a cost- and data-driven approach to operations: qualified an alternative replacement
part that cut a customer's cost by 90%, managed 15+ service cases end-to-end with full documentation, and designed parts for
manufacturability (CNC, laser cutting, 3D printing). Certified in project management and fluent in English (C2). Available full-time from
January 2027 and open to rotations and relocation anywhere in Mexico.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Medical device design and prototyping, material selection, finite element analysis
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla, Mexico Jul 2024 – Dec 2024
Identified and qualified a functionally equivalent replacement for a failed power supply, reducing the customer's part cost by 90%
(MXN $15,000 to $1,500).
Managed 15+ service cases end-to-end: diagnosis, root-cause analysis, warranty/ticket processing, technical reports, and customer
follow-up.
Installed and maintained (preventive and corrective) ultrasound systems, X-ray units, and flat-panel detectors at hospital and clinic
sites, keeping equipment in service.
Trained physicians and technicians on equipment operation and first-level troubleshooting.
ENGINEERING PROJECTS
Fastener-Free Laser-Cut Assembly | SolidWorks · DXF · Laser cutting
Designed for manufacturability (DFM) an MDF structure assembled only with slot-and-tab joints, sized to material thickness and
laser-kerf tolerances; zero screws or adhesive.
Transradial Prosthesis Tool Holder | SolidWorks Simulation · AISI 304 · PETG ISPO World Congress 2025
Led the redesign from user requirements to prototype: material selection, FEA validation (min. safety factor 2.88 under 50 N), and
4.8/5 user satisfaction (QUEST 2.0).
Two-Link Articulated Robotic Arm | SolidWorks · NEMA 17 · 3D printing
Designed two 3D-printed planetary gearboxes (4.36:1 and 6:1) and verified fit, interference, and torque capacity in CAD before
fabrication to avoid rework.
XGIO Smart-Cane GPS Ecosystem | ESP32 · Python · Firebase · Dashboard Social service
Coordinated a 7-module IoT system (device firmware, cloud backend, mobile app, web dashboard) and wrote Python data filters
that removed GPS noise from tracking data.
3-DOF Ball-Balancing Platform | ESP32 · Python/OpenCV · SolidWorks
Integrated vision, control, and firmware into a working closed-loop system; validated it through iterative hardware testing and
tuning.
SKILLS & CERTIFICATIONS
Operations & Supply Chain: Cost reduction, replacement-part qualification, root-cause analysis, DFM, manufacturing processes (CNC,
lathe, milling, laser cutting, 3D printing), BOMs, technical documentation
Data & Management: Excel, Power BI, Python (Pandas), MATLAB; project management (Google certificate); customer communication
and training
Engineering: SolidWorks (CSWA), FEA, GD&T, industrial automation, Siemens S7-1200 PLC (project-based), control systems, sensors
and drives
Certifications: Google Project Management; CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing
Associate; Siemens Industry Foundations; Siemens Basics of Robotics
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```

## CV BASE: EN_CON_FOTO/GE_HealthCare_QA_Engineer_I/CV_Arith_Maldonado.pdf

Archivos con este mismo CV:
- EN_CON_FOTO/GE_HealthCare_QA_Engineer_I/CV_Arith_Maldonado.pdf

```
Arith Maldonado Zamudio
QA Engineer | Medical Devices · Verification & Validation · CAPA · Root-Cause Analysis
Puebla, Mexico · Open to relocation (Mexico & abroad) | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
LinkedIn: linkedin.com/in/arith-maldonado-zamudio-4038262b5
Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
PROFILE
Biomedical Engineer with Honors and Mechatronics Engineer (B.Eng. Dec 2026) with 6 months of quality-focused field
experience in medical imaging equipment (ultrasound, X-ray). Verified equipment performance before release, handled
customer complaints and warranty cases with traceable documentation, and led design verification and validation of a
prosthetic device (FEA, user validation) presented at ISPO 2025. Bilingual English/Spanish (C2), strong problem solver who
works independently.
EDUCATION
B.Eng. Mechatronics Engineering — Universidad Iberoamericana Puebla Expected Dec 2026
GPA 9.1/10 · Industrial Automation, Advanced Control Systems, Embedded Systems, Mechanical Design, Strength of Materials
B.Eng. Biomedical Engineering, Honors Mention — Universidad Iberoamericana Puebla 2020 – 2024
GPA 9.1/10 · Biomechanics, finite element analysis, device design and prototyping
PROFESSIONAL EXPERIENCE
Technical Service & Applications Specialist — Punto Focal Equipo Médico, Puebla Jul 2024 – Dec 2024
Installed, tested, and verified ultrasound systems, X-ray units, and flat-panel detectors against functional specifications
before release to the client, documenting results in service reports.
Handled 15+ field service cases and warranty claims end-to-end: complaint intake, troubleshooting, root-cause analysis,
corrective actions, and customer follow-up, with full traceability of each record.
Root-caused a failed power supply and qualified a functionally equivalent replacement, cutting the client's part cost by 90%
(MXN $15,000 → $1,500).
Trained physicians and technicians on equipment operation and first-level troubleshooting.
ENGINEERING PROJECTS
Transradial Prosthesis Tool Holder | SolidWorks Simulation · AISI 304 · PETG ISPO World Congress 2025
Redesigned a dental-tool holder for a prosthesis user; FEA under a 50 N load confirmed a minimum safety factor of 2.88 and
checked stress, deformation, and fatigue on critical parts.
Selected materials, iterated CAD for assembly, and reached 4.8/5 device satisfaction (QUEST 2.0); poster accepted at the
ISPO 20th World Congress, Stockholm.
Two-Link Articulated Robotic Arm | SolidWorks · NEMA 17 · DRV8825 · 3D printing
Designed two compact 3D-printed planetary gearboxes (4.36:1 and 6:1) and verified concentricity, interference, torque
capacity, and ratios (Willis equation) before printing.
3-DOF Ball-Balancing Platform | ESP32 · Python/OpenCV · Bluetooth · SolidWorks
Built a vision-guided closed-loop system: OpenCV (HSV) ball tracking, PD controller, and Bluetooth commands to an ESP32
driving 3 servos at up to 66 Hz.
Validated on hardware with manual-response tests and autonomous balancing runs; tuned gains, axis mapping, and center
calibration iteratively.
SKILLS & CERTIFICATIONS
Quality & Compliance: Design verification and validation, root-cause analysis, corrective and preventive actions (CAPA),
complaint handling, risk assessment, technical documentation and traceability, GD&T, metrology
Regulatory Knowledge: ISO 13485, FDA 21 CFR 820 (QSR), ISO 14971 risk management, NOM-241-SSA1 / COFEPRIS, Good
Documentation Practices
Tools: Microsoft Office (Excel, Word, PowerPoint), Power BI, SolidWorks (CSWA) and SolidWorks Simulation (FEA), MATLAB,
Python; Google Project Management certificate
Certifications: CSWA; SOLIDWORKS Simulation Associate; SOLIDWORKS Additive Manufacturing Associate; Siemens Basics of
Robotics; Siemens Industry Foundations; Google Project Management
Languages: Spanish (native); English (C2, EF SET certified); German (A2)
```
