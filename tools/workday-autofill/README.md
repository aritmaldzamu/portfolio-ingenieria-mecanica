# ⚡ Autollenado de solicitudes (Workday) — extensión para Edge/Chrome

Llena las páginas de solicitud de Workday (y, en modo "mejor esfuerzo", otros portales)
con tu perfil: datos personales, dirección, teléfono, experiencia, educación, idiomas,
sitios web, skills, CV y preguntas frecuentes. **Tú revisas y das Next.** La extensión
nunca da clic en Next ni en Submit, y nunca toca contraseñas ni casillas de consentimiento.

## Instalación (Microsoft Edge)

1. Descarga esta carpeta (`tools/workday-autofill/`) a tu computadora. Por ejemplo, clona el repo
   o en GitHub usa **Code → Download ZIP** y descomprímelo.
2. Abre `edge://extensions`.
3. Activa **Modo de desarrollador** (interruptor abajo a la izquierda).
4. Da clic en **Cargar desempaquetada** y elige la carpeta `workday-autofill`
   (la que contiene `manifest.json`).
5. Fija el ícono ⚡ en la barra (ícono de rompecabezas → ojo).

En Chrome es igual, pero en `chrome://extensions`.

La primera vez se carga automáticamente el perfil de `profile.example.json`, que ya trae los datos de tu CV.

## Configuración (una sola vez)

Clic derecho en el ícono → **Opciones** (o "Editar perfil y CVs" en el popup):

- **CVs:** sube tus PDFs (por ejemplo el de inglés y el de español). En el popup eliges cuál se sube.
- **Datos (JSON):** revisa y completa. Lo que falta hoy:
  - Dirección de **Puebla** (`addresses[1]`): calle, número, colonia, CP, `line1`.
  - Año de inicio de Mecatrónica (`education[0].start`).
  - `preferences.salaryExpectation` y `preferences.availability`, si quieres que se llenen.
  - Las respuestas vacías en `answers` (visa/patrocinio, género, etc.) solo si quieres contestarlas siempre igual.
- Las advertencias arriba del editor te dicen qué falta. `Ctrl+S` guarda.

## Uso diario

1. Abre la vacante en Workday, inicia sesión o crea tu cuenta (eso sigue siendo manual).
2. En cada paso (My Information, My Experience, Application Questions…):
   - da clic en el botón flotante **⚡ Autollenar** (abajo a la derecha), o
   - presiona **Alt+Shift+L**, o
   - abre el popup y da clic en **Llenar esta página**.
3. Aparece un panel:
   - 🟩 **verde** = lo llenó la extensión;
   - 🟧 **naranja punteado** = revísalo tú (falta el dato en tu perfil, no había una opción equivalente o la pregunta no se reconoció).
   - Da clic en un pendiente para ir a ese campo.
4. Revisa y da **Next**. Repite en la siguiente página.

**Cambiar de domicilio:** en el popup, en "Dirección a usar", eliges **Monterrey** o **Puebla**.

Opciones del popup:
- *Sobrescribir campos que ya tienen valor*: desactivado por defecto, para no pisar lo que tú o el "Autofill with Resume" de Workday ya pusieron.
- *Llenar solo al cambiar de paso*: llena cada página en cuanto la abres, sin dar clic.
- *Agregar entradas de certificaciones*: desactivado por defecto, porque muchos tenants usan un catálogo cerrado de certificaciones.

## Cómo enseñarle preguntas nuevas

Cuando una pregunta sale como "No reconocí esta pregunta":

1. En el panel, da clic en **Copiar preguntas sin respuesta**.
2. Pégalas en `answers` dentro de las opciones y escribe tu respuesta:

```json
{ "question": "do you have a valid driver s license|licencia de conducir", "answer": "Yes" }
```

`question` es una expresión regular que se compara con la etiqueta de la pregunta en minúsculas
y sin acentos. Puedes unir inglés y español con `|`. `answer` puede ser una lista de alternativas,
por ejemplo `["Bachelor's Degree", "Licenciatura"]`.

## Por qué es robusta

- **Reconoce campos por varias señales:** los `data-automation-id` e ids de Workday (los nuevos,
  como `workExperience-29--jobTitle`, y los antiguos, como `legalNameSection_firstName`), la etiqueta
  visible, `aria-label` y los títulos de sección. Funciona en inglés y en español.
- **Usa los widgets reales de Workday:** listas (botón + listbox), prompts con búsqueda y Enter
  (incluidas categorías anidadas, como "How did you hear → Job Board → LinkedIn"), fechas por
  segmento MM/AAAA, radios, checkboxes y carga del CV.
- **Escribe como si fuera teclado** (eventos reales que React acepta) y luego verifica que el valor haya quedado.
- **Hace varias pasadas:** cuando eliges el país, Workday vuelve a dibujar la dirección. La extensión
  lo detecta y llena los campos nuevos.
- **Secciones repetibles:** da clic en "Add/Agregar" hasta tener tantas entradas como tu perfil, sin duplicar si ya existen.
- **Coincidencia flexible de opciones:** México/Mexico, Inglés/English, "Mobile"/"Móvil", "3 - Advanced"/"Avanzado", etc.
- **Distingue casos parecidos:** "apellido paterno" y "apellido materno"; "Estado" y "Estado civil";
  "número exterior" y "calle".
- **Privacidad:** todo vive en `chrome.storage.local` de tu navegador. No hay servidores ni llamadas de red.

## Pruebas

`tests/` incluye dos formularios que imitan Workday. Uno usa el layout nuevo en inglés y otro el
layout antiguo en español con la dirección de Puebla. También incluye una prueba de punta a punta
que carga la extensión real en Chromium:

```bash
node tests/run-e2e.mjs   # requiere playwright
```

Verifica más de 70 campos, que no duplique entradas al volver a llenar y que **nunca** dé clic en Next.

## Limitaciones conocidas

- Cada empresa configura su Workday. Si una lista no tiene ninguna opción parecida a tu dato,
  ese campo queda en naranja para que lo elijas tú.
- El catálogo de *Skills* de Workday es cerrado: solo se agregan las skills que existen en él.
  El panel indica cuáles no encontró.
- Crear la cuenta e iniciar sesión siguen siendo manuales. Para eso usa el gestor de contraseñas de Edge.
- En otros portales (Greenhouse, Lever, SuccessFactors) funciona en modo "mejor esfuerzo" con el
  botón del popup o con el atajo, porque los campos de texto se reconocen por su etiqueta.

## Estructura

```
manifest.json            MV3: permisos, atajo Alt+Shift+L y scripts para *.myworkdayjobs.com, *.myworkdaysite.com y *.workday.com
profile.example.json     perfil inicial (datos del CV)
src/background.js        atajo, puente popup → pestaña y perfil inicial
src/content/utils.js     normalización, esperas, escritura compatible con React
src/content/fields.js    descubre campos: tipo, etiqueta, sección (experiencia/educación…) y número de entrada
src/content/rules.js     reglas campo → dato del perfil y banco de respuestas
src/content/widgets.js   cómo operar cada widget de Workday
src/content/panel.js     botón flotante y panel de resultados (Shadow DOM)
src/content/main.js      orquestador (agregar entradas, pasadas, reporte)
src/popup/, src/options/ interfaz
tests/                   formularios simulados y prueba de punta a punta
```
