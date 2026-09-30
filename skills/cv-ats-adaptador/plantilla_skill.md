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

{{CVS}}
