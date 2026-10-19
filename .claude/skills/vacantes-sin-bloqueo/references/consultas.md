# Plantillas de búsqueda web

El fragmento (snippet) del buscador ya trae puesto, empresa, ciudad y a veces fecha, aunque el sitio bloquee. No todos los buscadores aceptan `OR`: si una consulta con `OR` falla o regresa poco, divídela en varias.

## Por bolsa (cuando la bolsa bloquea)

```
site:mx.linkedin.com/jobs/view "controls engineer"
site:mx.linkedin.com/jobs/view "ingeniero de automatización"
site:mx.linkedin.com/jobs/view "commissioning engineer"
site:glassdoor.com.mx "ingeniero de automatización" junior
site:glassdoor.com.mx "controls engineer"
site:mx.indeed.com "ingeniero PLC"
site:occ.com.mx "ingeniero de automatización"
site:mx.computrabajo.com "ingeniero de control" PLC
```

## Directo a portales de empresa (saltándose las bolsas)

```
site:myworkdayjobs.com "controls engineer" Mexico
site:myworkdayjobs.com "ingeniero de automatización"
site:myworkdayjobs.com "automation engineer" Querétaro
site:jobs.smartrecruiters.com "automatización" México
site:boards.greenhouse.io "controls engineer" Mexico
site:jobs.lever.co "automation engineer" Mexico
site:successfactors.com "ingeniero de automatización"
```

Cambia la ciudad para cubrir los polos industriales: Querétaro, Monterrey, Saltillo, Ramos Arizpe, San Luis Potosí, Guanajuato (Silao, Celaya, León, Irapuato), Aguascalientes, Puebla, Toluca, Ciudad Juárez, Chihuahua, Tijuana, Guadalajara, Hermosillo, Reynosa.

## Para encontrar la fuente original de una vacante bloqueada

```
"<puesto exacto>" "<empresa>"
"<puesto exacto>" "<empresa>" myworkdayjobs
"<puesto exacto>" "<empresa>" careers
"<frase rara y exacta de la descripción>"
```

La frase exacta sirve sobre todo con vacantes de "Empresa confidencial" (OCC, Computrabajo): la misma descripción suele estar en otra bolsa con el nombre de la empresa o de la reclutadora.

## Nivel Jr

Combina el puesto con una sola palabra de nivel por consulta: `junior`, `jr`, `trainee`, `"recién egresado"`, `"entry level"`, `"new grad"`, `"engineer I"`, `"0-2 años"`.

## Recientes

Añade el mes y el año (`octubre 2026`) o frases como `"hace 3 días"` / `"days ago"`. Si el buscador tiene filtro de fecha, úsalo (última semana).

## EE. UU. / TN

```
"TN visa" "controls engineer" entry level
"TN visa" "automation engineer"
"TN" "Mexican citizens" "controls engineer"
site:myworkdayjobs.com "controls engineer I" Texas
"new grad" "controls engineer" Texas OR Arizona OR Michigan OR Ohio
```
