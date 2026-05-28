# Arith Maldonado Zamudio - Portfolio

Portafolio profesional de Arith Maldonado Zamudio: estudiante de Ingeniería Mecatrónica e Ingeniero Biomédico, enfocado en automatización, prototipos, software, hardware, CAD, visión por computadora e IoT.

La página carga por defecto en inglés para entrevistadores internacionales e incluye un botón `ES/EN` para alternar manualmente al español. Las traducciones son manuales, no usan Google Translate.

## Sitio publicado

- GitHub Pages: https://aritmaldzamu.github.io/portfolio-ingenieria-mecanica/
- Repositorio: https://github.com/aritmaldzamu/portfolio-ingenieria-mecanica

## Proyectos incluidos

- XGIO: Sistema de Rastreo GPS en Tiempo Real para Bastón Inteligente
  - Repositorio: https://github.com/aritmaldzamu/xgio-monorep
  - Documentación: https://aritmaldzamu.github.io/xgio-monorep/
- Ball & Beam: prototipo de control discreto con PID digital, filtros de medición y actuación con motor paso a paso.
- 3DOF Ball Balancing Platform: plataforma de tres brazos con ESP32, servos, Bluetooth, OpenCV y control PID/PD para centrar una pelota con visión por computadora.
- Somnus Sleep Monitor: sistema IoT de habitación inteligente con Raspberry Pi 5, dashboard local, Firebase, visión por cámara y app FlutterFlow.
- Transradial Prosthesis Tool Holder: rediseño y validación por elemento finito de un sistema de sujeción de herramientas odontológicas, presentado en el contexto de ISPO 20th World Congress 2025.

## Secciones actuales

- Home / About
- Certifications
- Projects
- Contact
- Detalles por proyecto con evidencia visual, stack técnico, documentos y código cuando aplica.

## Notas para continuar

- El sitio está construido como un solo archivo `index.html`.
- Los assets viven en `assets/`, separados por proyecto.
- Para agregar un proyecto nuevo:
  - Crear una carpeta en `assets/<nuevo-proyecto>/`.
  - Agregar una tarjeta en el catálogo `#proyectos`.
  - Agregar el id del proyecto a `projectDetailIds` y `projectBySection` en el script final.
  - Crear las secciones detalle con `class="section-wrap project-view project-detail"` y `data-project="<id>"`.
  - Agregar traducciones manuales en `manualTranslations.text` para que el modo inglés no deje texto en español.
  - Verificar el botón `ES/EN` en local antes de publicar.

Para una guía más completa de continuidad, ver `HANDOFF.md`.

## Perfil

- LinkedIn: https://www.linkedin.com/in/arith-maldonado-zamudio-4038262b5
- GitHub: https://github.com/aritmaldzamu
- Email: maldonado.zamudio.arith@gmail.com
