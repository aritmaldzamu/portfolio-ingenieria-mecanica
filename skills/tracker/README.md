# Tracker_Vacantes_Arith (Google Sheets)

La memoria compartida entre `buscador-vacantes` y `seguimiento-postulaciones`.

## Crearlo (una vez)

1. En Google Drive → **Nuevo → Hojas de cálculo de Google**. Nómbrala exactamente **`Tracker_Vacantes_Arith`** (las skills la buscan por ese nombre).
2. **Extensiones → Apps Script**. Borra lo que haya, pega todo [`Tracker_Vacantes.gs`](Tracker_Vacantes.gs) y guarda (💾).
3. Recarga la hoja. Aparece el menú **Vacantes**.
4. **Vacantes → Configurar / reparar hoja**. La primera vez Google pide permisos: *Revisar permisos → tu cuenta → Configuración avanzada → Ir a (no seguro) → Permitir*. Es tu propio script; solo toca esta hoja.
5. (Opcional) **Vacantes → Activar revisión diaria automática**: cada día a las 7:00 pasa a "Sin respuesta" lo que lleva 21+ días en "Aplicado".

Se crean dos pestañas y un Google Doc:
- **Vacantes**: una fila por vacante, con lista desplegable y color por Estado, filtro y orden automático (Oferta → En proceso → Por aplicar → Aplicado → …, luego por Score).
- **Historial**: cada alta y cambio de estado con fecha.
- **Doc `Tracker_Vacantes_Arith_Gemini`** (en la misma carpeta): copia de texto del tracker que **leen las skills**, porque Gemini lee Google Docs de Drive mucho mejor que hojas de cálculo. Se actualiza solo al importar un bloque y con la revisión diaria; también con **Vacantes → Actualizar copia para Gemini (Doc)**. No lo edites a mano.

### Si Gemini dice "No pude acceder a tu hoja"

1. Corre **Vacantes → Actualizar copia para Gemini (Doc)** (la primera vez pide permisos nuevos de Drive y Docs: acéptalos) y revisa que el Doc aparezca en tu Drive.
2. En Gemini → Configuración → **Apps**: **Google Workspace** activado con maldonado.zamudio.arith@gmail.com (la misma cuenta dueña del Doc).
3. Empieza el mensaje con `@Google Drive`, por ejemplo: `@Google Drive @Gmail ¿cómo van mis postulaciones?`.
4. Si aun así falla, adjunta el Doc en el mensaje con **+ → Drive → Tracker_Vacantes_Arith_Gemini**: con el archivo adjunto siempre lo lee.

## Columnas

| Columna | Quién la llena |
|---|---|
| ID | Buscador (`empresa-puesto-ciudad`); el script la genera si falta |
| Fecha encontrada, Empresa, Puesto, Ciudad, Modalidad, País, Fuente, Link, Exp. pedida, Score, CV base, Título sugerido, Resalta | Buscador |
| Estado, Fecha estado, Próxima acción, Fecha límite, Notas | Buscador (al crear) y Seguimiento (al actualizar); también tú a mano |

Estados: `Nueva` · `Por aplicar` · `Aplicado` · `En proceso` · `Oferta` · `Rechazado` · `Sin respuesta` · `Descartada` · `Cerrada`.

## Importar un bloque

**Vacantes → Importar bloque de Gemini…** → pega la respuesta de Gemini (puede ser la respuesta completa: el script busca la línea de encabezado `ID | …` y lee hasta `FIN_BLOQUE`) → **Importar**.

Reglas del script:
- Reconoce la vacante por el ID del portal en el link (LinkedIn, Indeed, OCC, Computrabajo), luego por `ID`, luego por empresa + puesto parecido.
- Lee las columnas por nombre: el bloque puede traer todas o solo algunas, en cualquier orden. Acepta tablas Markdown (para migrar `vacantes_encontradas.md`).
- Si el buscador vuelve a encontrar una vacante que ya está en Aplicado / En proceso / etc., **solo rellena celdas vacías**; no toca el estado ni la próxima acción.
- Empresa y Puesto se quedan como se registraron la primera vez.
- Las notas nuevas se agregan a las anteriores, no las borran.
- Un estado con "(?)" se guarda con "(estado dudoso)" en Notas.

Puedes editar cualquier celda a mano; el script respeta lo que escribas.
