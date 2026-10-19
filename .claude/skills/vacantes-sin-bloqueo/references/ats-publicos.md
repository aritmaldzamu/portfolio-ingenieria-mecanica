# Portales de empresa (ATS) y sus endpoints públicos

Los ATS publican las vacantes **para que cualquiera las vea**: sus páginas de carreras y, en varios casos, un JSON público que usa su propia página. Consultar ese JSON con calma (pocas peticiones, sin disfraz) es leer información pública, no rodear una protección. Si un portal responde 403/429 o captcha, aplica la línea roja de la skill: un intento y siguiente ruta.

Los endpoints marcados **(no documentado)** son los que usa la propia página del portal; funcionan hoy pero pueden cambiar. Si fallan, usa la página normal del portal o el buscador.

## Cómo reconocer el ATS por la URL

| Patrón en la URL | ATS |
|---|---|
| `*.wdN.myworkdayjobs.com/<sitio>` | Workday |
| `career*.successfactors.com`, `jobs.<empresa>.com/job/...` (estilo RMK), `jobs.sap.com` | SAP SuccessFactors |
| `jobs.smartrecruiters.com/<Empresa>/<ID>` o `careers.smartrecruiters.com/<Empresa>` | SmartRecruiters |
| `boards.greenhouse.io/<token>`, `job-boards.greenhouse.io/<token>`, `?gh_jid=` | Greenhouse |
| `jobs.lever.co/<empresa>` | Lever |
| `jobs.ashbyhq.com/<org>` | Ashby |
| `*.fa.*.oraclecloud.com/hcmUI/CandidateExperience/...` | Oracle Recruiting Cloud |
| `*.taleo.net/careersection/...` | Oracle Taleo |
| `careers-<empresa>.icims.com/jobs/<ID>/...` | iCIMS |
| `*.eightfold.ai/careers` | Eightfold |
| `*.avature.net`, páginas "Phenom" (`/global/en/job/...`) | Avature / Phenom (sin JSON estable: usa la página o el buscador) |

Para descubrir el ATS de una empresa: busca `"<empresa>" careers México`, entra a "Ver vacantes" y mira a qué dominio te manda; o busca `"<empresa>" myworkdayjobs` (luego `smartrecruiters`, `successfactors`, `greenhouse`, uno por consulta).

## Endpoints

### Greenhouse (documentado, público)
- Lista: `GET https://boards-api.greenhouse.io/v1/boards/<token>/jobs` (añade `?content=true` para la descripción).
- Detalle: `GET https://boards-api.greenhouse.io/v1/boards/<token>/jobs/<id>`.

### Lever (documentado, público)
- Lista: `GET https://api.lever.co/v0/postings/<empresa>?mode=json`
- Detalle: `GET https://api.lever.co/v0/postings/<empresa>/<id>`

### SmartRecruiters (documentado, público)
- Lista: `GET https://api.smartrecruiters.com/v1/companies/<id>/postings?q=<palabra>&country=mx&limit=100&offset=0`
- Detalle (trae la descripción completa): `GET https://api.smartrecruiters.com/v1/companies/<id>/postings/<postingId>`
- Bosch usa `BoschGroup`.

### Ashby (documentado, público)
- Lista: `GET https://api.ashbyhq.com/posting-api/job-board/<org>`

### Workday (no documentado)
- Lista: `POST https://<tenant>.wdN.myworkdayjobs.com/wday/cxs/<tenant>/<sitio>/jobs`
  con cuerpo JSON `{"appliedFacets": {}, "limit": 20, "offset": 0, "searchText": "controls"}`. Máximo 20 por página; avanza `offset` hasta `total`.
- Detalle: `GET https://<tenant>.wdN.myworkdayjobs.com/wday/cxs/<tenant>/<sitio><externalPath>` (el `externalPath` viene en la lista, p. ej. `/job/Queretaro/Controls-Engineer_R12345`).
- Ojo: `postedOn` es texto ("Posted 3 Days Ago"), no fecha. `locationsText` puede decir "2 Locations": el script lo marca `ubicacion_ambigua` en vez de descartarlo; revisa el detalle.
- La lectura web normal no puede hacer POST: sin script, abre la URL del sitio con `?q=<palabra>` o usa el buscador `site:<tenant>.wdN.myworkdayjobs.com "<puesto>"`.

### Oracle Recruiting Cloud (no documentado)
- Lista: `GET https://<host>/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true&expand=requisitionList&finder=findReqs;siteNumber=<CX_n>,keyword="<palabra>",limit=100,offset=0`
- El `siteNumber` aparece en la URL de la página (`/sites/CX_1/...`).

### SAP SuccessFactors
- Sin JSON público estable. Muchos portales tipo RMK (`jobs.<empresa>.com`) exponen `sitemap.xml` o un feed con las vacantes: pruébalo una vez. Si no, usa el buscador `site:jobs.<empresa>.com "<puesto>"`.

### Eightfold (no documentado)
- `GET https://<empresa>.eightfold.ai/api/apply/v2/jobs?domain=<dominio-empresa>&query=<palabra>&location=Mexico&start=0&num=10`

### Amazon (no documentado)
- `GET https://www.amazon.jobs/en/search.json?base_query=<palabra>&loc_query=Mexico&result_limit=100`

## Buenas prácticas

- Máximo ~12 empresas por corrida y pocas consultas por empresa (las de `buscador-vacantes`).
- Prefiere 1 llamada que traiga todo (Greenhouse, Lever, Ashby) a muchas pequeñas.
- El link que se entrega a Arith es el de la **página** del ATS (para aplicar), no el del JSON.
