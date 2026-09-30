---
name: cv-ats-adaptador
description: Adapta el CV de Arith Maldonado Zamudio a una vacante para pasar filtros ATS. Úsalo SIEMPRE que el usuario pegue el texto de una vacante, oferta de trabajo, job description o link a un puesto (aunque no escriba ninguna instrucción), o cuando pida adaptar su CV, calcular su % de match ATS o revisar si su CV pasa un filtro. Calcula el match antes y después y entrega el CV completo adaptado, sin inventar experiencia.
---

# Adaptador de CV para ATS

## Regla principal (léela primero)

Si el usuario envía una vacante, **tu respuesta SIEMPRE termina con el CV completo adaptado**.
- No pidas el CV: usa el **CV BASE** incluido al final de este archivo.
- Solo si el usuario adjunta o pega otro CV en el mismo mensaje, usa ese en su lugar.
- No pidas confirmación, no preguntes "¿quieres que lo adapte?", no te detengas después del análisis.
- Aunque falten requisitos importantes, igual entrega el CV adaptado y reporta las brechas aparte.

## Pasos

1. **Análisis de la vacante.** Extrae palabras clave: habilidades técnicas, herramientas/software, metodologías, habilidades blandas, requisitos de educación/experiencia/idioma. Marca cuáles son *obligatorias* y cuáles *deseables*.
2. **Match ATS inicial.** Compara las palabras clave contra el CV BASE.
   `Match % = (palabras clave presentes en el CV / total de palabras clave) × 100`, ponderando las obligatorias ×2.
3. **Adaptación.**
   - Reescribe el título profesional (línea bajo el nombre) y el Perfil usando la terminología exacta de la vacante.
   - Reformula los bullets de experiencia y proyectos para usar las palabras exactas del empleador cuando describan algo que Arith SÍ hizo.
   - Reordena Habilidades para poner primero lo que pide la vacante; reordena proyectos por relevancia.
   - Escribe el CV en el **idioma de la vacante** (inglés o español).
   - Formato ATS: sin tablas, sin columnas, sin iconos; encabezados estándar (Profile/Perfil, Education, Experience, Projects, Certifications, Skills).
4. **Validación estricta.** NUNCA inventes experiencia, empresas, fechas, herramientas, certificaciones, idiomas ni niveles. Si una palabra clave no tiene respaldo real en el CV BASE, NO la pongas en el CV: va en la sección de brechas.
5. **Entrega.** Usa exactamente el formato de salida de abajo.

## Formato de salida (obligatorio)

```
## Match ATS
- Inicial: XX %
- Tras adaptación: YY %

## Palabras clave de la vacante
| Palabra clave | Tipo (obligatoria/deseable) | ¿Está en el CV? | Dónde se integró |

## Brechas (requisitos que el CV no cubre)
- <requisito> → sugerencia honesta (curso, certificación, mencionarlo en entrevista, etc.)

## CV adaptado
<CV COMPLETO en un bloque de código Markdown, listo para copiar>
```

La sección "CV adaptado" es obligatoria y debe contener el CV entero (encabezado, perfil, educación, experiencia, proyectos, certificaciones, habilidades), no fragmentos.

---

# CV BASE

```
Arith Maldonado Zamudio
Biomedical Engineer | Mechatronics Engineering Student | Mechanical Design, CAD & Product Development
San Nicolás de los Garza, N.L., Mexico
+52 221 974 4717 | maldonado.zamudio.arith@gmail.com
linkedin.com/in/arith-maldonado-zamudio-4038262b5
GPA: 9.1/10.0 | Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica

PROFILE
Mechatronics Engineering student and graduated Biomedical Engineer (Honors Mention), specialized in mechanical design, product development, and R&D in advanced manufacturing environments. Hands-on experience with 3D CAD modeling (SolidWorks, Creo Parametric), FEA simulation, engineering drawings, assemblies, and BOMs; complemented by practical manufacturing skills (CNC, lathe, milling, laser cutting, 3D printing). Capable of applying DFM principles to translate design concepts into functional prototypes and collaborate with cross-functional engineering teams to solve product-related challenges.

EDUCATION
Universidad Iberoamericana Puebla — B.Eng. Mechatronics Engineering (in progress) — Expected Dec. 2026 — Puebla, Mexico
GPA: 9.1/10.0 | Relevant coursework: Strength of Materials, Advanced Control Systems, Embedded Systems, Mechanical Design, and Industrial Automation.

Universidad Iberoamericana Puebla — B.Eng. Biomedical Engineering, Graduated with Honors Mention — 2020–2024 — Puebla, Mexico
GPA: 9.1/10.0 | Focus: biomechanics, medical device design, finite element analysis, and prototyping.

RELEVANT EXPERIENCE
Medical Equipment Technical Specialist & Applications Specialist — Punto Focal Equipo Médico — Jul. 2024 – Dec. 2024 — Puebla, Mexico
- Preventive/corrective maintenance, installation, and diagnosis of ultrasound equipment, X-ray systems, flat panels, and triggering devices.
- Managed 15+ ultrasound-related cases: technical reports, client follow-up, warranty/ticket processing, and basic diagnostics.
- Delivered technical training and product demonstrations to physicians, technicians, and clients.
- Identified a functional replacement for a medical power supply, reducing the client cost from approx. MXN $15,000 to MXN $1,500 — applying cost-driven design evaluation.

SELECTED PROJECTS
3-DOF Ball Balancing Platform — Mechatronics
ESP32, SG90 servos, Python, OpenCV, PID control, Bluetooth communication, SolidWorks (structural design)
- Designed and manufactured the mechanical platform structure; generated assembly drawings and part specifications to support fabrication.
- Implemented closed-loop control integrating servo actuation, camera feedback (OpenCV), and continuous PID — demonstrating full hardware-software integration.

XGIO — GPS Ecosystem for Smart Cane — Social Service
Mobile app, backend, admin dashboard, Firebase, Vercel, CAD/SolidWorks documentation
- Developed the full GPS tracking system (app, backend, admin panel, user-device registration) for visually impaired individuals; produced CAD documentation and technical reports.

Other projects (usable if relevant; details on portfolio):
- Ball & Beam: discrete control prototype with digital PID, measurement filters, and stepper motor actuation.
- Somnus Sleep Monitor: IoT smart-room system with Raspberry Pi 5, local dashboard, Firebase, camera vision (OpenCV), and FlutterFlow app.
- Transradial Prosthesis Tool Holder: redesign and FEA validation of a dental tool holding system (ISPO 2025 poster).
- Laser-Cut Hot Air Balloon Prototype: MDF structure made by laser cutting, assembled only with slot-tab joints (no fasteners or adhesives).

AWARDS & CERTIFICATIONS
- Poster accepted at ISPO 20th World Congress 2025, Stockholm: "Redesign and validation of a tool holding system for a transradial prosthesis for a stomatology student"; Honors Mention in Biomedical Engineering, Dec. 2024.
- CSWA (Certified SOLIDWORKS Associate); Certified SOLIDWORKS Simulation Associate; Certified SOLIDWORKS Additive Manufacturing Associate; Google Project Management Certificate; Siemens Basics of Robotics; Siemens Expedite – Skills for Industry: Industry Foundations; EF SET English B2; German A2.

SKILLS
CAD / FEA: SolidWorks (CSWA certified), Creo Parametric, SolidWorks Simulation, engineering drawings, assemblies, BOMs, GD&T, metrology, CAD documentation.
Product Development: DFM principles, design reviews, rapid prototyping, tolerance analysis, product lifecycle documentation.
Manufacturing: CNC / router CNC, lathe, milling machine, laser cutting, 3D printing, blueprint interpretation.
Programming & Analysis: Python, OpenCV, MATLAB, Arduino/ESP32, Power BI, Excel, Firebase, technical reporting.
Languages: Native Spanish; Advanced English (B2); German A2.
Availability: Full-time engineering roles from July 2026.
```
