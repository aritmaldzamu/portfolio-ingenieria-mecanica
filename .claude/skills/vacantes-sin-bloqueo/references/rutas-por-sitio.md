# Rutas por sitio

Cómo bloquea cada sitio, qué trae su URL y cuál es el mejor rodeo. "Familia" agrupa los sitios que comparten dueño o tecnología de bloqueo: si uno falla, salta a otra familia.

## LinkedIn (familia `linkedin`)

- **Bloqueo típico:** HTTP 999 o muro de inicio de sesión ("authwall") en búsqueda y a veces en vacantes sueltas. Nunca iniciar sesión por Arith.
- **URL:** `linkedin.com/jobs/view/<puesto>-at-<empresa>-<ID>` → el texto antes de `-at-` es el puesto y lo de después la empresa. En búsquedas, el ID va en `currentJobId=<ID>`.
- **Link limpio:** `https://www.linkedin.com/jobs/view/<ID>`.
- **Mejor rodeo:**
  1. Alertas de LinkedIn en Gmail (traen puesto, empresa, ciudad e ID).
  2. Buscar el puesto y la empresa en el ATS de la empresa (casi todas las grandes publican primero ahí).
  3. Buscador: `site:mx.linkedin.com/jobs/view "<puesto>"` (el fragmento trae empresa y ciudad).
  4. Un intento a la vista pública `linkedin.com/jobs/view/<ID>`.
- **"Easy Apply" (Solicitud sencilla):** si la vacante solo existe en LinkedIn, Arith tiene que aplicar desde su cuenta. Consigue el texto por Gmail/buscador/Arith y dile que aplique ella.

## Glassdoor e Indeed (familia `glassdoor_indeed`, mismo dueño)

- **Bloqueo típico:** Cloudflare "Just a moment", captcha o 403. Si uno bloquea, asume que el otro también lo hará en esa corrida.
- **URL de Glassdoor:** `glassdoor.com.mx/job-listing/<slug>-JV_IC<ciudad>_KO<a>,<b>_KE<c>,<d>.htm?jl=<ID>`
  - `KO<a>,<b>`: posiciones del **puesto** dentro del slug (`slug[a:b]`).
  - `KE<c>,<d>`: posiciones de la **empresa** (`slug[c:d]`).
  - `jl=` es el ID. El script `pista` hace el corte.
- **URL de Indeed:** `indeed.com/viewjob?jk=<ID>` (también `vjk=` o `/rc/clk?jk=`). **No** trae puesto ni empresa: búscalo en Gmail por el `jk` o pide el título.
- **Mejor rodeo:** Gmail (alertas de Glassdoor e Indeed) → ATS de la empresa → buscador `site:glassdoor.com.mx "<puesto>"` → otra familia de bolsa (OCC, Computrabajo).
- **Lo propio de Glassdoor** (reseñas, sueldos, preguntas de entrevista): ver `empresa-salarios.md`.

## OCC Mundial (familia `occ`)

- **Bloqueo:** a veces protección anti-bot o contenido armado con JavaScript.
- **URL:** `occ.com.mx/empleo/oferta/<ID>-<slug-del-puesto>/`. La empresa no va en la URL; con frecuencia es "Empresa confidencial" (reclutadora).
- **Rodeo:** alertas de OCC en Gmail → buscador `site:occ.com.mx "<puesto>"` → si la empresa es confidencial, busca frases exactas de la descripción en el buscador para hallar la misma vacante en otra bolsa.

## Computrabajo (familia `computrabajo`)

- **URL:** `mx.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-<puesto>-en-<ciudad>-<IDHEX>`. El script separa puesto y ciudad por el último `-en-` (heurística: revísalo si el puesto contiene "en").
- **Rodeo:** alertas en Gmail → buscador `site:mx.computrabajo.com "<puesto>"`.
- Útil también por sus **evaluaciones de empresa** (sustituto parcial de Glassdoor).

## Bumeran, Talenteca, Hireline, Jooble, Talent.com (bolsas alternas)

- Sirven como R4: muchas replican las mismas vacantes. Un intento cada una.
- Jooble y Talent.com son agregadores: el link final casi siempre lleva al ATS o a otra bolsa; sigue hasta la fuente.

## Portales de empresa (ATS)

Ver `ats-publicos.md`. Algunos tenants de Workday tienen protección anti-bot: si responde 403/429, un intento y siguiente ruta; no imites un navegador.

## Sitios de EE. UU. (sección TN)

- Indeed US y Glassdoor US: misma familia y mismo bloqueo.
- Built In, Jobright, Wellfound: a veces abren; un intento.
- Bolsas de asociaciones: ISA (International Society of Automation), IEEE Job Site, Control Global / Automation World.
- Lo más fiable para TN: el ATS de la empresa + la frase "TN" o "TN visa" en la descripción (búscala con `"TN visa" "controls engineer"`).
