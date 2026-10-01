# Sistema de búsqueda de empleo en Gemini

Tres skills de Gemini que comparten una sola "memoria": la hoja de Google Sheets **`Tracker_Vacantes_Arith`**. Gemini corre la búsqueda solo cuando tú se lo pides; Claude ya no tiene que hacerlo.

```
            ┌─────────────────────────┐
  "busca    │   buscador-vacantes     │  LinkedIn · Indeed · OCC · Computrabajo
  vacantes" │  (Google Search)        │  + sitios de carrera de empresas
     ──────►│  lee tracker + Gmail    │──── BLOQUE_TRACKER (Estado: Por aplicar)
            └─────────────────────────┘                 │
                                                        ▼
                                   ┌──────────────────────────────────────┐
                                   │  Google Sheets: Tracker_Vacantes_Arith│
                                   │  Vacantes · Historial  (Apps Script) │
                                   └──────────────────────────────────────┘
                                                        ▲
            ┌─────────────────────────┐                 │
  "¿cómo van│ seguimiento-postulaciones│──── BLOQUE_TRACKER (Aplicado, En proceso,
  mis       │  (Gmail)                 │      Rechazado, Oferta, Sin respuesta)
  postula-  │  lee tracker + Gmail     │
  ciones?"  └─────────────────────────┘

            cv-ats-adaptador: pegas el texto de una vacante "Por aplicar" → CV adaptado.
```

## Cómo se comunican

1. **Las dos skills leen el tracker** desde Google Drive antes de trabajar: el buscador no repite vacantes ni propone las que ya aplicaste; el seguimiento sabe qué vacantes buscar en tu correo.
2. **Las dos skills terminan con un `BLOQUE_TRACKER`** con el mismo formato y el mismo `ID` por vacante.
3. **Tú pegas el bloque** en la hoja con el menú **Vacantes → Importar bloque de Gemini**. El script:
   - reconoce la vacante por el ID del portal (LinkedIn, Indeed, OCC, Computrabajo), por `ID` o por empresa + puesto parecido;
   - agrega las nuevas y actualiza las existentes;
   - **nunca regresa** una vacante ya aplicada a "Por aplicar" si el buscador la vuelve a encontrar;
   - deja todo en la pestaña **Historial**.

Gemini no puede escribir en tus archivos; por eso el paso 3 es manual (un pegado, ~10 segundos).

## Carpetas

| Carpeta | Qué es |
|---|---|
| [`buscador-vacantes/`](buscador-vacantes/) | Skill nueva de búsqueda profunda + `lanzador_busquedas.html` |
| [`seguimiento-postulaciones/`](seguimiento-postulaciones/) | Skill de seguimiento (v2: ahora lee y actualiza el tracker) |
| [`tracker/`](tracker/) | Apps Script de la hoja compartida y cómo crearla |
| `empaquetar.py` | Regenera los `.zip` y las instrucciones de Gem desde cada `SKILL.md` |

La skill `cv-ats-adaptador` vive en la rama `claude/cv-ats-adapter-xq64ve` y no cambia.

## Puesta en marcha (una sola vez, ~10 min)

1. **Tracker:** sigue [`tracker/README.md`](tracker/README.md) para crear la hoja e instalar el script.
2. **Skills:** en Gemini → **Subir una habilidad** → sube
   - `buscador-vacantes/gemini/buscador-vacantes.zip`
   - `seguimiento-postulaciones/gemini/seguimiento-postulaciones.zip` (reemplaza la versión anterior)
3. **Apps de Gemini:** Configuración → **Apps** → activa **Google Workspace** (Gmail y Drive) con maldonado.zamudio.arith@gmail.com.
4. **Migrar lo que ya encontró Claude:** copia la tabla de `claude/vacantes_encontradas.md` (proyecto "Work") y pégala tal cual en **Importar bloque de Gemini**: acepta tablas Markdown y reconoce sus columnas (Vacante, Ubicación, Estatus, CV a usar…).
5. **Apagar la rutina de Claude** "Buscador de vacantes – Jr Controls y Automatización" cuando ya hayas probado Gemini (en claude.ai → Routines, o pídeselo a Claude).

## Uso diario

| Quieres… | Escribe en Gemini | Luego |
|---|---|---|
| Vacantes nuevas (rápido) | `busca vacantes` | Pega el bloque en la hoja |
| Búsqueda a fondo | Activa **Deep Research** y escribe `búsqueda profunda de vacantes` | Pega el bloque en la hoja |
| Algo concreto | `busca en Querétaro`, `solo Siemens y Festo`, `solo EE. UU. TN` | Pega el bloque |
| Estado de postulaciones | `¿cómo van mis postulaciones?` | Pega el bloque |
| Aplicar a una | Copia el texto de la vacante y pégalo con `cv-ats-adaptador` | Cambia su Estado a **Aplicado** en la hoja (o deja que el seguimiento lo detecte por el correo de confirmación) |

Rutina sugerida: búsqueda rápida lunes, miércoles y viernes; profunda los domingos; seguimiento dos veces por semana.

Si Gemini no lee la hoja, adjúntala en el mensaje con **+ → Drive → Tracker_Vacantes_Arith**, o empieza el mensaje con `@Google Drive`. Si no lee el correo, empieza con `@Gmail`.

## Editar las skills

Edita el `SKILL.md` de la skill y corre:

```
python skills/empaquetar.py
```

Luego vuelve a subir el `.zip` en Gemini. Si cambias las columnas del tracker, cambia también `COLUMNAS` en `tracker/Tracker_Vacantes.gs` y el `BLOQUE_TRACKER` de ambas skills.
