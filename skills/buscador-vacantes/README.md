# buscador-vacantes (Gemini)

Skill de Gemini que hace una búsqueda profunda de vacantes **Jr de Controls, Automation, PLC, Commissioning y afines** en LinkedIn, Indeed, OCC y Computrabajo, más los sitios de carrera de las empresas objetivo, en México y entry-level con visa TN en EE. UU. Reemplaza la rutina programada de Claude: ahora corre solo cuando tú se lo pides.

## Qué hace en cada corrida

0. **Contexto:** lee el tracker `Tracker_Vacantes_Arith` (Drive) y tus confirmaciones de postulación en Gmail para no repetir ni proponer vacantes ya aplicadas. Revisa si hay entrevistas o pruebas con fecha límite.
1. **Bolsas:** consultas `site:` en las 4 bolsas (5 en modo rápido; 11 + 14 ciudades en modo profundo).
2. **Empresas:** integradores, marcas de automatización y plantas (rápido: 10-12 rotando; profundo: todas), incluidos Workday, SuccessFactors, Greenhouse y Lever.
3. **Verifica** cada vacante: abierta, nivel Jr, fecha, ciudad. Si no puede confirmar, la marca `verificar`. Nunca inventa links.
4. **Filtra y puntúa** (0-100: nivel, área, stack, frescura, estrategia), elige CV base y título sugerido.
5. **Entrega:** acciones pendientes, tabla de vacantes, Top 5 con cómo aplicar, sección EE. UU./TN, links de búsqueda directa y el **BLOQUE_TRACKER**.

## Archivos

- `SKILL.md`: la skill (fuente). Edita aquí.
- `gemini/buscador-vacantes.zip`: para **Subir una habilidad** en Gemini.
- `gemini/Instrucciones_Gem_Buscador.txt`: alternativa, para pegar en **Instrucciones** de un Gem.
- `lanzador_busquedas.html`: ábrelo con doble clic; genera los links de búsqueda en las 4 bolsas con filtros (últimos N días, nivel de entrada, estado) y abre todas de un clic. Útil porque Google tarda en indexar las vacantes más nuevas.

Regenera el zip y el txt con `python skills/empaquetar.py` después de editar `SKILL.md`.

## Instalar

**Como habilidad (recomendado):** Gemini → **Subir una habilidad** → `gemini/buscador-vacantes.zip`.

**O como Gem:** gemini.google.com → **Explorar Gems → Nuevo Gem** → nombre `Buscador de vacantes` → pega `gemini/Instrucciones_Gem_Buscador.txt` en **Instrucciones** → guarda.

En ambos casos activa en Configuración → **Apps** → **Google Workspace** (Gmail y Drive).

## Usar

- `busca vacantes` → modo rápido.
- `búsqueda profunda de vacantes` (mejor con **Deep Research** activado) → todo: más consultas, ciudades, empresas y EE. UU./TN.
- `busca en Monterrey y Saltillo`, `solo Rockwell, Siemens y Festo`, `solo Computrabajo`, `solo EE. UU. TN` → modo enfocado.

Al final, copia el **BLOQUE_TRACKER** y pégalo en la hoja: **Vacantes → Importar bloque de Gemini**.

## Limitaciones

- Gemini busca vía Google: las vacantes de las últimas horas pueden no estar indexadas todavía. Para eso está `lanzador_busquedas.html`.
- LinkedIn e Indeed a veces no dejan abrir la vacante sin sesión; en ese caso la skill la marca `verificar`.
- Gemini no puede escribir en tu hoja ni enviar correos: tú pegas el bloque.
