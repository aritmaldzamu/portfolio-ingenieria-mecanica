# seguimiento-postulaciones

Gem de Gemini que entra a tu Gmail y te dice cómo van tus postulaciones: a cuáles te rechazaron, cuáles siguen en proceso (entrevistas, pruebas técnicas), cuáles no han contestado y si hay alguna oferta. Te da una tabla por empresa y lo que tienes que hacer.

**v2 (conectada con `buscador-vacantes`):** antes de revisar el correo lee el tracker compartido `Tracker_Vacantes_Arith` (Google Drive) para reconocer cada vacante por su `ID`, te recuerda las vacantes "Por aplicar" que llevan días esperando y termina con un **BLOQUE_TRACKER** con los cambios de estado, que pegas en la hoja (**Vacantes → Importar bloque de Gemini**). Ver [`../README.md`](../README.md) y [`../tracker/README.md`](../tracker/README.md).

## Archivos

- `SKILL.md`: la habilidad para subir a Gemini (nombre `seguimiento-postulaciones`, en kebab-case).
- `gemini/seguimiento-postulaciones.zip`: la carpeta lista para **Subir una habilidad** en Gemini (contiene `seguimiento-postulaciones/SKILL.md`). Se genera con `python skills/empaquetar.py`.
- `gemini/Instrucciones_Gem_Postulaciones.txt`: se pega completo en **Instrucciones** del Gem. No necesita archivos de conocimiento.

## Subirla como habilidad (recomendado)

En Gemini → **Subir una habilidad** → elige `gemini/seguimiento-postulaciones.zip` (o la carpeta `seguimiento-postulaciones` con su `SKILL.md`). Si actualizas `SKILL.md`, vuelve a generar el zip con `python skills/empaquetar.py`. Si ya tenías la versión anterior en Gemini, reemplázala por esta.

## O crear un Gem

1. En gemini.google.com → **Explorar Gems** → **Nuevo Gem**.
2. Nombre: `Seguimiento de postulaciones`.
3. Pega el contenido de `gemini/Instrucciones_Gem_Postulaciones.txt` en **Instrucciones** y guarda.
4. Asegúrate de que la app **Google Workspace / Gmail** esté activada: en Gemini → Configuración → **Apps** (o Extensiones) → Google Workspace activado, con tu cuenta maldonado.zamudio.arith@gmail.com.

## Usarlo

Abre el Gem y escribe algo como:

- `¿cómo van mis postulaciones?`
- `¿quién me rechazó este mes?`
- `¿qué pasó con Schneider?`
- `actualiza el tracker`

Si Gemini contesta sin buscar en tu correo, empieza el mensaje con `@Gmail` (por ejemplo `@Gmail ¿cómo van mis postulaciones?`).

## Limitaciones

- Gemini solo lee tu correo y la hoja: no etiqueta, no envía, no borra ni edita nada. Los cambios al tracker los aplicas tú pegando el bloque.
- Su búsqueda en Gmail trae pocos correos por consulta; si tienes muchas postulaciones, pídele un periodo más corto (`revisa solo septiembre`) o una empresa concreta.
