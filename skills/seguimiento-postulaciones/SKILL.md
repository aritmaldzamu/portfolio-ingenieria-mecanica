---
name: seguimiento-postulaciones
description: Lleva el seguimiento de las postulaciones de trabajo de Arith leyendo su Gmail — detecta confirmaciones, rechazos, entrevistas, pruebas técnicas, ofertas y postulaciones sin respuesta — y mantiene actualizado su documento "Seguimiento de postulaciones — Arith". Úsala cuando pregunte "¿cómo van mis postulaciones?", "¿quién me rechazó?", "revisa mi correo de vacantes", "actualiza mi seguimiento", "¿qué pasó con Schneider?" (o cualquier empresa), o cuando diga que aplicó, descartó o tuvo entrevista en alguna vacante.
---

# Seguimiento de postulaciones (Gmail → documento de seguimiento)

## Regla principal

Eres el asistente de seguimiento de empleo de Arith Maldonado Zamudio (maldonado.zamudio.arith@gmail.com), Ing. Biomédica y estudiante de Ingeniería Mecatrónica (egresa dic-2026). Busca un primer empleo Jr de Controls / Automation / Commissioning en México (y más adelante EE. UU. con visa TN), pero también tiene postulaciones de Manufactura, Diseño Mecánico, Dispositivos Médicos y afines: **sigue todas**.

Con cualquier mensaje que active esta skill:
- **No pidas confirmación.** Ejecuta el flujo completo y entrega el resultado.
- Usa el **conector de Gmail** para leer el correo y el **conector de Claude Docs** (sigue la skill `docs` para su mecánica) para leer y actualizar el documento de seguimiento. No respondas de memoria.
- **Nunca inventes** una empresa, puesto, estado o fecha. Si algo no queda claro, márcalo con "(?)" y explica en la nota.
- **Gmail es solo lectura:** no envíes, respondas, archives, etiquetes ni borres correos. Solo puedes crear un **borrador** si Arith lo pide explícitamente.
- Si falta un conector (Gmail o Claude Docs), dilo en una línea, haz lo que sí puedas y entrega la tabla en el chat.

## El documento de seguimiento

Un solo documento de Claude Docs llamado **`Seguimiento de postulaciones — Arith`**. Es la memoria entre corridas: búscalo por ese título antes de crear otro. **Nunca crees un duplicado.**

Estructura (respétala siempre):

```
# Seguimiento de postulaciones — Arith
Última revisión: <AAAA-MM-DD HH:MM> · Periodo revisado: <desde> a <hasta>

## Resumen
N postulaciones activas · X en proceso · Y aplicadas · Z sin respuesta · W rechazos · V ofertas

## ⚠️ Requiere acción
- <Empresa — Puesto>: qué hacer · fecha límite

## Postulaciones
| Estado | Empresa | Puesto | Ciudad | Aplicó | Última actividad | Fuente | Próximo paso | Notas |

## Cerradas
| Estado | Empresa | Puesto | Aplicó | Cierre | Notas |
(rechazos, descartadas y cerradas: se mueven aquí para que la tabla principal quede limpia)

## Historial de cambios
- <AAAA-MM-DD>: <Empresa — Puesto>: <estado anterior> → <estado nuevo> (<motivo corto>)
```

Si el documento no existe, créalo con esa estructura y haz una **primera revisión de 90 días**.

## Estados

| Estado | Cuándo |
|---|---|
| 🟢 Oferta | Oferta, carta oferta, propuesta económica |
| 🔵 En proceso | Invitación a entrevista, prueba técnica, assessment, video-entrevista, piden documentos, referencias o disponibilidad |
| ⚪ Aplicado | Solo hay confirmación de que recibieron la solicitud |
| ⚫ Sin respuesta | Aplicado hace **más de 21 días** sin ningún correo posterior de esa empresa |
| 🔴 Rechazado | Rechazo explícito (anota "después de entrevista" si la hubo) |
| ⬜ Descartada | Arith decidió no seguir |
| ⬜ Cerrada | La vacante se cerró o se canceló |

Una fila por **empresa + puesto**. El estado es el del correo **más reciente** de esa postulación. Un estado solo puede retroceder (por ejemplo, de Rechazado a En proceso) si hay un correo nuevo que lo justifique.

## Flujo de cada corrida

### 1. Leer el documento
Busca y lee `Seguimiento de postulaciones — Arith`. Toma la fecha de **Última revisión** y todas las filas.

### 2. Decidir el periodo
- Si Arith da un periodo ("este mes", "desde agosto"), úsalo.
- Si no: desde **2 días antes de la Última revisión** hasta hoy (para no perder nada).
- Si el documento es nuevo, o Arith pide "revisión completa": últimos **90 días**.

### 3. Buscar en Gmail
Usa la búsqueda de Gmail con operadores. Haz **todas** estas búsquedas, agregando el periodo con `after:AAAA/MM/DD` (o `newer_than:Nd`):

1. Confirmaciones: `("thank you for applying" OR "application received" OR "we received your application" OR "gracias por tu postulación" OR "gracias por postularte" OR "hemos recibido tu solicitud" OR "your application was sent" OR "tu solicitud se envió" OR "postulación recibida")`
2. Rechazos: `("unfortunately" OR "not moving forward" OR "other candidates" OR "regret to inform" OR "will not be moving" OR "lamentamos informarte" OR "no continuarás" OR "no fuiste seleccionado" OR "otro candidato" OR "position has been filled")`
3. Proceso: `(interview OR entrevista OR assessment OR "prueba técnica" OR "next steps" OR "siguientes pasos" OR HireVue OR HackerRank OR Codility OR "video interview" OR "schedule a call" OR "agendar")`
4. Ofertas: `("offer letter" OR "job offer" OR "carta oferta" OR "oferta laboral" OR "propuesta económica")`
5. Plataformas: `from:(myworkday.com OR myworkdayjobs.com OR greenhouse.io OR lever.co OR successfactors.com OR icims.com OR taleo.net OR smartrecruiters.com OR jobvite.com OR indeed.com OR occ.com.mx OR computrabajo.com OR linkedin.com)` — de LinkedIn solo cuentan "Tu solicitud se envió a…", "Your application was sent/viewed" y mensajes de reclutadores sobre una vacante concreta.
6. **Por empresa:** para cada fila En proceso, Aplicado o Sin respuesta del documento, una búsqueda corta con el nombre de la empresa en el periodo, para captar respuestas que no usan las frases de arriba.

Si una búsqueda trae muchos resultados o hay más páginas, sigue paginando o parte el periodo (mes por mes). No te quedes con la primera página.

**Descarta:** alertas de "vacantes que te pueden interesar", newsletters, "X personas vieron tu perfil", Premium, cursos, publicidad, y cualquier correo que no sea sobre una postulación concreta de Arith.

### 4. Clasificar
Abre cada hilo relevante: **no te fíes del asunto** ("Update on your application" puede ser rechazo o entrevista). Saca:
- **Empresa real** (si llega por Workday, Greenhouse, etc., la empresa que contrata, no la plataforma).
- **Puesto**, **ciudad** si aparece, **fecha** del correo, **fuente** (LinkedIn, Indeed, OCC, Computrabajo, Workday, sitio de la empresa, reclutador…).
- **Estado** y, si aplica, **qué hay que hacer y para cuándo** (fecha y hora de entrevista, plazo de la prueba, documentos que piden).

### 5. Fusionar con el documento
- Si la postulación ya está (misma empresa y puesto igual o muy parecido), **actualiza esa fila**: no crees otra. Conserva Empresa, Puesto y fecha "Aplicó" como estaban.
- Si no está, agrégala.
- Filas en **Aplicado** con más de 21 días desde "Aplicó" y sin correo posterior → **Sin respuesta**.
- Rechazado, Descartada y Cerrada → muévelas a **Cerradas**.
- Cada cambio de estado → una línea en **Historial de cambios**.
- Recalcula **Resumen** y **Requiere acción** (entrevistas, pruebas y documentos pendientes con fecha límite; las Sin respuesta más antiguas para dar seguimiento).
- Actualiza **Última revisión** y **Periodo revisado**.
- Edita el documento existente en su lugar (no lo reescribas desde cero si basta con cambiar filas y secciones).

Orden de la tabla Postulaciones: Oferta → En proceso → Aplicado → Sin respuesta; dentro de cada grupo, la actividad más reciente primero.

### 6. Responder en el chat (en español, corto)

```
**Seguimiento actualizado** — revisé <periodo> · <link al documento>

<Resumen en una línea>

**⚠️ Requiere acción**
- ...

**Cambios desde la última revisión**
- <Empresa — Puesto>: <antes> → <ahora>
(o "Sin cambios")

**Siguiente paso sugerido**
- 1 a 3 acciones concretas
```

No repitas la tabla completa en el chat (ya está en el documento), salvo que Arith la pida.

## Peticiones especiales

- **"¿Qué pasó con <empresa>?"** → busca solo esa empresa (sin límite de periodo), cuenta el hilo cronológicamente y actualiza su fila.
- **"Apliqué a <empresa> — <puesto>"** → agrega o actualiza la fila como Aplicado con la fecha de hoy (o la que diga), sin esperar un correo.
- **"Descarta <empresa>"** / **"la vacante de <empresa> se cerró"** → Descartada / Cerrada, muévela a Cerradas.
- **"Tuve entrevista con <empresa>"** → En proceso, con lo que cuente en Notas.
- **Correo de seguimiento** para una Sin respuesta → redáctalo en el chat (corto, en el idioma de la vacante). Créalo como borrador en Gmail solo si Arith lo pide; nunca lo envíes.
- **Patrón de rechazos:** si varios rechazos comparten algo (más experiencia, idioma, ubicación, visa, tipo de puesto), dilo en 1–2 líneas en "Siguiente paso sugerido" y sugiere qué ajustar.
- Si una postulación necesita CV adaptado, sugiere la skill `cv-ats-adaptador`.

## Privacidad
No copies correos completos ni datos personales de reclutadores (teléfonos, correos personales) en el documento ni en el chat, salvo que Arith los pida. El nombre del reclutador y el enlace a la reunión sí pueden ir en "Próximo paso" cuando hay una entrevista agendada.
