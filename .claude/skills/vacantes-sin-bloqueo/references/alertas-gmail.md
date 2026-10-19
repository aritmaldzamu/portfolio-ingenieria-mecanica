# Alertas de empleo en Gmail

Las bolsas que bloquean a Claude sí le mandan las vacantes a Arith por correo. Leer su Gmail con el conector es la ruta más limpia y, para LinkedIn y Glassdoor, casi siempre la más completa.

**Gmail es solo lectura en esta skill:** no envíes, respondas, archives, etiquetes, marques ni borres correos.

## Consultas por remitente

Usa el dominio del remitente (más estable que la dirección exacta) y una ventana corta. Ajusta `newer_than:` a la frecuencia de las corridas (`2d` si corre a diario, `7d` si es semanal).

| Bolsa | Consulta de Gmail |
|---|---|
| LinkedIn | `from:linkedin.com newer_than:7d (empleo OR empleos OR vacante OR job OR jobs)` |
| Glassdoor | `from:glassdoor.com newer_than:7d` |
| Indeed | `from:indeed.com newer_than:7d -subject:(postulación OR application)` |
| OCC | `from:occ.com.mx newer_than:7d` |
| Computrabajo | `from:computrabajo newer_than:7d` |
| Bumeran | `from:bumeran newer_than:7d` |
| Portales de empresa (Workday, etc.) | `newer_than:7d (subject:"job alert" OR subject:"alerta de empleo" OR subject:"new jobs")` |
| Todas juntas | `newer_than:7d (from:linkedin.com OR from:glassdoor.com OR from:indeed.com OR from:occ.com.mx OR from:computrabajo) -subject:(postulación OR application OR rechazo)` |

Excluye confirmaciones de postulación y rechazos: de eso se encarga `seguimiento-postulaciones`.

## Qué sacar de cada correo

- Una alerta trae varias vacantes. Para cada una: puesto, empresa, ciudad, fecha del correo, ID y link.
- **ID y link limpio:**
  - LinkedIn: el link contiene `/jobs/view/<ID>` (a veces dentro de un redirect `linkedin.com/comm/jobs/view/<ID>?...`). Link limpio: `https://www.linkedin.com/jobs/view/<ID>`.
  - Glassdoor: `jl=<ID>` o `jobListingId=<ID>` dentro del link.
  - Indeed: `jk=<ID>`. Link limpio: `https://mx.indeed.com/viewjob?jk=<ID>`.
  - OCC: `/empleo/oferta/<ID>-...`.
- Quita los parámetros de rastreo (`trk`, `refId`, `utm_*`, `trackingId`) del link que entregas.
- Confianza: **media** (es reciente pero no confirma que siga abierta). Súbela a **alta** si la encuentras en el ATS.
- Para buscar una vacante concreta por su ID: busca el ID como texto en Gmail (`"4012345678"`).

## Si no hay alertas: configuración recomendada para Arith

Dásela en pocas líneas, solo una vez, cuando la ruta Gmail no encuentre nada:

- **LinkedIn → Empleos → Crear alerta**, frecuencia diaria, por correo. Una alerta por búsqueda:
  - "Controls Engineer" · México · Nivel: Prácticas no, Sin experiencia y Algo de responsabilidad.
  - "Ingeniero de automatización" · México.
  - "Commissioning Engineer" · México.
  - "PLC" · México.
  - (Para TN) "Entry Level Controls Engineer" · Estados Unidos.
- **Glassdoor / Indeed:** las mismas palabras, ubicación México, alerta diaria.
- **OCC y Computrabajo:** "ingeniero de automatización", "ingeniero de control", "PLC", "puesta en marcha"; nivel recién egresado/junior.
- **Portales de empresa:** en Workday y SmartRecruiters de sus empresas objetivo hay "Job alerts / Alertas de empleo": suscribirse con su correo.
- Sugerencia opcional: un filtro de Gmail que ponga la etiqueta "Alertas empleo" a esos remitentes, para que las corridas sean más rápidas. Lo crea Arith; esta skill no etiqueta.
