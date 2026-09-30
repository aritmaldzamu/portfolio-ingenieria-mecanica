---
name: seguimiento-postulaciones
description: Revisa el Gmail de Arith para dar seguimiento a las vacantes a las que aplicó — detecta confirmaciones de postulación, rechazos, entrevistas, pruebas técnicas y ofertas, y arma una tabla de estado por empresa. Úsalo cuando pida "ver qué trabajos me rechazaron", "cómo van mis postulaciones", "revisa mi correo de vacantes" o similar.
---

# Seguimiento de postulaciones (Gmail)

Objetivo: a partir del correo de Arith, reconstruir el estado de cada postulación
(una fila por empresa + puesto) y resaltar lo que requiere acción.

Herramientas: el conector de Gmail de Claude (`mcp__Gmail__*`). Si las
herramientas no aparecen, cárgalas con ToolSearch (`+Gmail search`). Si el
conector no está conectado, dile a Arith que lo conecte en claude.ai →
Settings → Connectors → Gmail; no intentes otra vía.

**Modo solo lectura por defecto.** No envíes, respondas, borres ni etiquetes
correos salvo que Arith lo pida explícitamente en ese momento.

## 1. Periodo

Si Arith no indica periodo, usa los últimos 90 días (`newer_than:90d`).
Si pide "todo", usa `newer_than:1y`.

## 2. Búsquedas (`mcp__Gmail__search_threads`)

Lanza estas búsquedas (en paralelo cuando se pueda), agregando el filtro de fecha
a cada una. Pagina hasta cubrir el periodo.

**Confirmación de postulación**
```
("gracias por tu postulación" OR "gracias por postularte" OR "hemos recibido tu" OR "recibimos tu solicitud" OR "thank you for applying" OR "application received" OR "we received your application" OR "your application was sent" OR "tu postulación fue enviada")
```

**Rechazo**
```
("lamentamos" OR "no continuarás" OR "no fuiste seleccionad" OR "otros candidatos" OR "no avanzar" OR "unfortunately" OR "not moving forward" OR "decided to move forward with other" OR "not be progressing" OR "other candidates" OR "position has been filled" OR "no longer under consideration" OR "regret to inform")
```

**En proceso (entrevista / prueba / siguiente paso)**
```
("entrevista" OR "interview" OR "agenda" OR "schedule a call" OR "assessment" OR "evaluación" OR "prueba técnica" OR "HackerRank" OR "Codility" OR "video interview" OR "HireVue" OR "next steps" OR "siguientes pasos" OR "phone screen")
```

**Oferta**
```
("oferta" OR "offer letter" OR "job offer" OR "carta oferta" OR "pleased to offer" OR "propuesta económica")
```

**Remitentes de plataformas de reclutamiento** (para no perder nada)
```
from:(linkedin.com OR indeed.com OR occ.com.mx OR computrabajo OR myworkday.com OR workday.com OR greenhouse.io OR lever.co OR successfactors OR icims.com OR taleo.net OR smartrecruiters.com OR bamboohr.com OR jobvite.com OR ashbyhq.com OR glassdoor.com OR bumeran)
```

Descarta: alertas de "vacantes recomendadas", newsletters, "X personas vieron tu
perfil", promociones de LinkedIn Premium y cualquier correo que no se refiera a
una postulación concreta de Arith.

## 3. Leer y clasificar

Para cada hilo relevante usa `mcp__Gmail__get_thread` (el snippet no basta para
distinguir un rechazo de una confirmación). Extrae:

- **Empresa** (del cuerpo o del remitente; si llega vía Workday/Greenhouse, la
  empresa real, no la plataforma)
- **Puesto**
- **Fecha** del último mensaje
- **Estado**, tomando siempre el mensaje **más reciente** del hilo:
  - 🟢 **Oferta**
  - 🔵 **En proceso** — entrevista, prueba técnica, solicitud de documentos
  - ⚪ **Aplicado** — solo confirmación de recepción
  - 🔴 **Rechazado**
- **Acción pendiente** — p. ej. "agendar entrevista antes del 3-oct",
  "completar prueba HackerRank", "responder a recruiter"

Agrupa varios correos de la misma empresa + puesto en una sola fila con el estado
más avanzado/reciente. Si el estado es ambiguo, márcalo con "(?)" y explica
por qué en una nota, no lo inventes.

Marca **Sin respuesta** (⚫) las postulaciones en estado Aplicado con más de
21 días sin ningún correo posterior.

## 4. Entrega

Responde en español con:

1. **Resumen** en una línea: `N postulaciones · X en proceso · Y rechazos · Z sin respuesta · W ofertas`.
2. **⚠️ Requiere acción** — primero, lo que tiene fecha límite o espera respuesta de Arith.
3. **Tabla** ordenada por estado (Oferta → En proceso → Aplicado → Sin respuesta → Rechazado):

| Estado | Empresa | Puesto | Última actividad | Nota / acción |
|---|---|---|---|---|

4. **Rechazos**: si alguno trae retroalimentación o invita a aplicar a otra
   vacante, menciónalo; si no, basta con listarlos.

No pegues el cuerpo completo de los correos ni datos personales de terceros
(teléfonos, correos de recruiters) salvo que Arith los pida.

## 5. Opcional (solo si Arith lo pide)

- **Etiquetar en Gmail**: crear etiquetas `Postulaciones/En proceso`,
  `Postulaciones/Rechazada`, `Postulaciones/Oferta` con
  `mcp__Gmail__create_label` (si no existen, revisa antes con
  `mcp__Gmail__list_labels`) y aplicarlas con `mcp__Gmail__label_thread`.
  Confirma la lista de hilos antes de etiquetar.
- **Borrador de seguimiento** para postulaciones "Sin respuesta" con
  `mcp__Gmail__create_draft` — solo borrador, nunca enviar.
- **Cruzar con `buscador-vacantes`**: si Arith pide nuevas vacantes, excluye las
  empresas donde fue rechazada en los últimos 3 meses para el mismo puesto.
