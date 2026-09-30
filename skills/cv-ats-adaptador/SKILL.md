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

Compara la vacante contra cada CV BASE y elige el que tenga más coincidencias y esté en el **mismo idioma que la vacante**. Si ninguno está en ese idioma, usa el más cercano en contenido y tradúcelo.

**Inventario de hechos reales** = todo lo que aparece en CUALQUIERA de los CVs BASE (experiencia, proyectos, herramientas, certificaciones, idiomas). Puedes tomar un hecho de otro CV base e incluirlo en el adaptado si es relevante para la vacante. Si lo haces, indícalo en la tabla ("tomado de <nombre del CV>").

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
```

La sección "CV adaptado" es obligatoria y debe contener el CV entero (encabezado, perfil, educación, experiencia, proyectos, certificaciones y habilidades), no fragmentos.

---

# CVs BASE

## CV BASE: CV_Arith_Maldonado_2026.docx

```
Arith Maldonado Zamudio
Biomedical Engineer | Mechatronics Engineering Student | Mechanical Design, CAD & Product Development
C. San Simón 1214, Balcones de Santo Domingo, 66446 San Nicolás de los Garza, N.L.
+52 221 974 4717 | maldonado.zamudio.arith@gmail.com
linkedin.com/in/arith-maldonado-zamudio-4038262b5
GPA: 9.1/10.0 | Portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica
PROFILE
Mechatronics Engineering student and graduated Biomedical Engineer (Honors Mention), specialized in mechanical design, product development, and R&D in advanced manufacturing environments. Hands-on experience with 3D CAD modeling (SolidWorks, Creo Parametric), FEA simulation, engineering drawings, assemblies, and BOMs; complemented by practical manufacturing skills (CNC, lathe, milling, laser cutting, 3D printing). Capable of applying DFM principles to translate design concepts into functional prototypes and collaborate with cross-functional engineering teams to solve product-related challenges.
EDUCATION
Universidad Iberoamericana Puebla | Expected Dec. 2026
B.Eng. Mechatronics Engineering (in progress) | Puebla, Mexico
GPA: 9.1/10.0 | Relevant coursework: Strength of Materials, Advanced Control Systems, Embedded Systems, Mechanical Design, and Industrial Automation.
Universidad Iberoamericana Puebla | 2020 - 2024
B.Eng. Biomedical Engineering, Graduated with Honors Mention | Puebla, Mexico
GPA: 9.1/10.0 | Focus: biomechanics, medical device design, finite element analysis, and prototyping.
RELEVANT EXPERIENCE
Medical Equipment Technical Specialist & Applications Specialist | Jul. 2024 - Dec. 2024
Punto Focal Equipo Médico | Puebla, Mexico
- Preventive/corrective maintenance, installation, and diagnosis of ultrasound equipment, X-ray systems, flat panels, and triggering devices.
- Managed 15+ ultrasound-related cases: technical reports, client follow-up, warranty/ticket processing, and basic diagnostics.
- Delivered technical training and product demonstrations to physicians, technicians, and clients.
- Identified a functional replacement for a medical power supply, reducing the client cost from approx. MXN $15,000 to MXN $1,500 - applying cost-driven design evaluation.
SELECTED PROJECTS
3-DOF Ball Balancing Platform | Mechatronics
ESP32, SG90 servos, Python, OpenCV, PID control, Bluetooth communication, SolidWorks (structural design)
- Designed and manufactured the mechanical platform structure; generated assembly drawings and part specifications to support fabrication.
- Implemented closed-loop control integrating servo actuation, camera feedback (OpenCV), and continuous PID - demonstrating full hardware-software integration.
XGIO - GPS Ecosystem for Smart Cane | Social Service
Mobile app, backend, admin dashboard, Firebase, Vercel, CAD/SolidWorks documentation
- Developed the full GPS tracking system (app, backend, admin panel, user-device registration) for visually impaired individuals; produced CAD documentation and technical reports.
AWARDS & CERTIFICATIONS
- Poster accepted at ISPO 20th World Congress 2025, Stockholm: "Redesign and validation of a tool holding system for a transradial prosthesis for a stomatology student"; Honors Mention in Biomedical Engineering, Dec. 2024.
- CSWA (Certified SOLIDWORKS Associate); Certified SOLIDWORKS Simulation Associate; Certified SOLIDWORKS Additive Manufacturing Associate; Google Project Management Certificate; Siemens Basics of Robotics; Siemens Expedite - Skills for Industry: Industry Foundations; EF SET English B2; German A2.
SKILLS
CAD / FEA: SolidWorks (CSWA certified), Creo Parametric, SolidWorks Simulation, engineering drawings, assemblies, BOMs, GD&T, metrology, and CAD documentation.
Product Development: DFM principles, design reviews, rapid prototyping, tolerance analysis, and product lifecycle documentation.
Manufacturing: CNC / router CNC, lathe, milling machine, laser cutting, 3D printing, and blueprint interpretation.
Programming & Analysis: Python, OpenCV, MATLAB, Arduino/ESP32, Power BI, Excel, Firebase, and technical reporting.
Languages: Native Spanish; Advanced English (B2); German A2.
Availability: Full-time engineering roles from July 2026; interest in mechanical design, product development, advanced manufacturing, and electromechanical systems.
```

## CV BASE: CV_Arith_Maldonado_Zamudio.pdf

```
Arith Maldonado Zamudio
Puebla, Mexico | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
LinkedIn: www.linkedin.com/in/arith-maldonado-zamudio-4038262b5
Promedio: 9.1/10.0 | Portafolio de ingeniería: aritmaldzamu.github.io/portfolio-ingenieria-mecanica/
Perfil Profesional
Estudiante de Ingeniería Mecatrónica e Ingeniero Biomédico titulado, entusiasta por la automatización, producción, diseño mecánico y R&D
en entornos de manufactura avanzada. Experiencia práctica en servicio técnico de equipos médicos, FEA, prototipado embebido, visión
artificial y sistemas GPS; con capacidad para construir prototipos funcionales y resolver problemas técnicos integrando hardware, software y
manufactura.
Educación
Ingeniería Mecatrónica (En curso)
Universidad Iberoamericana Puebla
Esperado dic. 2026
• Promedio: 9.1/10.0. Materias relevantes: Resistencia de Materiales, Sistemas de Control Avanzado, Sistemas Embebidos, Diseño
Mecánico y Automatización Industrial.
Ingeniería Biomédica (Titulado con Mención Honorífica)
Universidad Iberoamericana Puebla
2020 - 2024
• Promedio: 9.1/10.0. Enfoque en biomecánica, diseño de dispositivos médicos, análisis por elemento finito y prototipado.
Experiencia Relevante
Especialista Técnico y Aplicacionista de Equipo Médico
Punto Focal Equipo Médico, Puebla, México
jul. 2024 - dic. 2024
• Realicé mantenimiento preventivo/correctivo, instalación y diagnóstico de equipos de ultrasonido, sistemas de rayos X, flat panels y
disparadores.
• Atendí más de 15 casos relacionados con ultrasonido, elaborando reportes técnicos, seguimiento a clientes, garantías/tickets y
diagnósticos básicos.
• Capacité a médicos, técnicos y clientes, además de apoyar en demostraciones técnicas y comerciales de producto.
• Identifiqué un reemplazo funcional para una fuente de poder médica, reduciendo el costo para el cliente de aprox. MXN $15,000 a MXN
$1,500.
Proyectos Seleccionados
Plataforma 3-DOF para Balanceo de Pelota
ESP32, servos SG90, Python, OpenCV, control PID y comunicación Bluetooth
Mecatrónica
• Construí una plataforma mecatrónica funcional de lazo cerrado que usa retroalimentación por cámara y control PID continuo para
balancear una pelota al centro de la placa.
• Integré control embebido, actuación con servomotores, procesamiento de visión en tiempo real y comunicación PC-microcontrolador para
prototipado mecatrónico.
XGIO - Ecosistema GPS para Bastón Inteligente
App móvil, backend, dashboard administrativo, Firebase, Vercel y documentación
CAD/SolidWorks
Servicio Social
• Desarrollé un sistema funcional de rastreo GPS para personas con discapacidad visual, incluyendo app, backend, panel administrativo,
registro usuario-dispositivo y documentación técnica.
Reconocimientos, Certificaciones y Habilidades
• Reconocimientos: Póster aceptado en ISPO 20th World Congress 2025, Estocolmo: “Redesign and validation of a tool holding system
for a transradial prosthesis for a stomatology student”; Mención Honorífica en Ingeniería Biomédica, dic. 2024.
• Certificaciones: CSWA, Certified SOLIDWORKS Simulation Associate, Certified SOLIDWORKS Additive Manufacturing Associate,
Google Project Management Certificate, EF SET English B2.
• Habilidades técnicas: SolidWorks, SolidWorks Simulation, MATLAB, Python, OpenCV, Arduino, ESP32, Firebase, Altium Designer,
Power BI, Excel, CNC/router CNC, torno, fresa, corte láser, impresión 3D, interpretación de planos y metrología.
```

## CV BASE: CV_Arith_Maldonado_Zamudio_Automation_Intern_EN.pdf

```
Arith Maldonado Zamudio
Puebla, Mexico | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com | linkedin.com/in/arith-maldonado-zamudio
GPA: 9.1/10.0 | Project portfolio: aritmaldzamu.github.io/xgio-monorep/descargas/
Professional Summary
Mechatronics Engineering student and Biomedical Engineer seeking an Automation Intern role in the automotive industry. Hands-on
experience in medical equipment service, mechanical design, FEA, embedded prototyping, computer vision, and GPS-based software
systems; skilled in building functional prototypes and solving technical problems across hardware, software, and manufacturing.
Education
B.S. in Mechatronics Engineering (In progress)
Universidad Iberoamericana Puebla
Expected Dec. 2026
• GPA: 9.1/10.0. Relevant coursework: Strength of Materials, Advanced Control Systems, Embedded Systems, Mechanical Design,
Industrial Automation.
B.S. in Biomedical Engineering (Graduated with Honorable Mention)
Universidad Iberoamericana Puebla
2020 - 2024
• GPA: 9.1/10.0. Focus in biomechanics, medical device design, finite element analysis, and prototyping.
Relevant Experience
Technical Specialist & Medical Equipment Application Representative
Punto Focal Equipo Médico, Puebla, Mexico
Jul. 2024 - Dec. 2024
• Performed preventive/corrective maintenance, installation, and troubleshooting of ultrasound devices, X-ray systems, flat panels, and
triggers.
• Supported 15+ ultrasound-related service cases, preparing technical reports, client follow-up, warranty/ticket documentation, and basic
diagnostics.
• Delivered technical training and product demonstrations to physicians, technicians, and customers.
• Identified a functional replacement for a medical power supply, reducing client cost from approx. MXN $15,000 to MXN $1,500.
Selected Projects
3-DOF Ball-Balancing Platform
ESP32, SG90 servos, Python, OpenCV, PID control, Bluetooth communication
Mechatronics
• Built a functional closed-loop mechatronic platform that uses camera-based feedback and continuous PID control to balance a ball at the
center of the plate.
• Integrated embedded control, servo actuation, real-time vision processing, and PC-to-microcontroller communication for automation-
focused prototyping.
XGIO Smart Cane GPS Tracking Ecosystem
Mobile app, backend, admin dashboard, Firebase, Vercel, CAD/SolidWorks documentation
Social Service
• Developed a functional GPS-based system for people with visual impairment, including app, backend, administrative dashboard, user-
device registration workflows, and technical documentation.
Honors, Certifications and Skills
• Honors: Poster accepted at ISPO 20th World Congress 2025, Stockholm: “Redesign and validation of a tool holding system for a
transradial prosthesis for a stomatology student”; Honorable Mention in Biomedical Engineering, Dec. 2024.
• Certifications: CSWA, Certified SOLIDWORKS Simulation Associate, Certified SOLIDWORKS Additive Manufacturing Associate, Google
Project Management Certificate, EF SET English B2.
• Technical skills: SolidWorks, SolidWorks Simulation, MATLAB, Python, OpenCV, Arduino, ESP32, Firebase, Altium Designer, Power BI,
Excel, CNC/router CNC, lathe, milling, laser cutting, 3D printing, drawing interpretation, and metrology.
```

## CV BASE: Resume_Arith_Maldonado_Zamudio.pdf

```
Arith Maldonado Zamudio
Puebla, Mexico | +52 221 974 4717 | maldonado.zamudio.arith@gmail.com
LinkedIn: www.linkedin.com/in/arith-maldonado-zamudio-4038262b5
GPA: 9.1/10.0 | Engineering portfolio: aritmaldzamu.github.io/portfolio-ingenieria-mecanica/
Professional Summary
Mechatronics Engineering student and Biomedical Engineer enthusiastic about automation, production, mechanical design, and R&D within
advanced manufacturing environments. Hands-on experience in medical equipment service, FEA, embedded prototyping, computer vision,
and GPS-based software systems; skilled in building functional prototypes and solving technical problems across hardware, software, and
manufacturing.
Education
B.S. in Mechatronics Engineering (In progress)
Universidad Iberoamericana Puebla
Expected Dec. 2026
• GPA: 9.1/10.0. Relevant coursework: Strength of Materials, Advanced Control Systems, Embedded Systems, Mechanical Design,
Industrial Automation.
B.S. in Biomedical Engineering (Graduated with Honorable Mention)
Universidad Iberoamericana Puebla
2020 - 2024
• GPA: 9.1/10.0. Focus in biomechanics, medical device design, finite element analysis, and prototyping.
Relevant Experience
Technical Specialist & Medical Equipment Application Representative
Punto Focal Equipo Médico, Puebla, Mexico
Jul. 2024 - Dec. 2024
• Performed preventive/corrective maintenance, installation, and troubleshooting of ultrasound devices, X-ray systems, flat panels, and
triggers.
• Supported 15+ ultrasound-related service cases, preparing technical reports, client follow-up, warranty/ticket documentation, and basic
diagnostics.
• Delivered technical training and product demonstrations to physicians, technicians, and customers.
• Identified a functional replacement for a medical power supply, reducing client cost from approx. MXN $15,000 to MXN $1,500.
Selected Projects
3-DOF Ball-Balancing Platform
ESP32, SG90 servos, Python, OpenCV, PID control, Bluetooth communication
Mechatronics
• Built a functional closed-loop mechatronic platform that uses camera-based feedback and continuous PID control to balance a ball at the
center of the plate.
• Integrated embedded control, servo actuation, real-time vision processing, and PC-to-microcontroller communication for mechatronic
prototyping.
XGIO Smart Cane GPS Tracking Ecosystem
Mobile app, backend, admin dashboard, Firebase, Vercel, CAD/SolidWorks documentation
Social Service
• Developed a functional GPS-based system for people with visual impairment, including app, backend, administrative dashboard, user-
device registration workflows, and technical documentation.
Honors, Certifications and Skills
• Honors: Poster accepted at ISPO 20th World Congress 2025, Stockholm: “Redesign and validation of a tool holding system for a
transradial prosthesis for a stomatology student”; Honorable Mention in Biomedical Engineering, Dec. 2024.
• Certifications: CSWA, Certified SOLIDWORKS Simulation Associate, Certified SOLIDWORKS Additive Manufacturing Associate, Google
Project Management Certificate, EF SET English B2.
• Technical skills: SolidWorks, SolidWorks Simulation, MATLAB, Python, OpenCV, Arduino, ESP32, Firebase, Altium Designer, Power BI,
Excel, CNC/router CNC, lathe, milling, laser cutting, 3D printing, drawing interpretation, and metrology.
```
