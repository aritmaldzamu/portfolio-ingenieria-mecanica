# ⚡ Autollenado de solicitudes de empleo — extensión para Edge/Chrome

Llena formularios de empleo **en cualquier sitio**: Workday, Oracle Recruiting Cloud (Ford y otros), Greenhouse, Lever, SuccessFactors,
iCIMS, Taleo, SmartRecruiters, bolsas de trabajo, páginas propias de las empresas y Google Forms.
Usa tu perfil (datos, dirección de Monterrey o Puebla, experiencia, educación, idiomas, skills, CV)
y **aprende tus respuestas**: si una pregunta no está en tu perfil, la contestas una vez a mano y
la próxima vez se llena sola en cualquier sitio.

**Tú revisas y das Next.** La extensión nunca da clic en Next ni en Enviar, nunca toca contraseñas
y nunca marca casillas de aceptación (aviso de privacidad, términos y condiciones, "certifico que…").

## Qué reconoce

- **Campos nativos y personalizados:** texto, listas, radios, casillas, fechas (incluidos los segmentos
  MM/AAAA de Workday), carga de CV, autocompletar (ubicación, universidad, react-select), listas que
  se abren con clic, radios y listas de Google Forms, y campos dentro de web components (Shadow DOM).
- **Secciones "Agregar → Guardar"** (Oracle/Ford, SuccessFactors, iCIMS): agrega cada experiencia o
  educación, la llena, da **Guardar** en ese mini formulario y sigue con la siguiente. Si ya está
  guardada, no la duplica. Ese Guardar es solo de la entrada; el Next/Submit de la página sigue siendo tuyo.
- **Listas que se abren con clic** aunque el campo sea de solo lectura (Oracle `cx-select`, Oracle JET), y
  **fechas con listas Mes / Año**.
- **Preguntas Sí/No como botones** y **fechas escritas con formato** (`mm/dd/yyyy`, `dd/mm/aaaa`, `MM/YYYY`).
- **Etiquetas de cualquier tipo:** `<label>`, ARIA, el título de la pregunta o el texto suelto junto al campo.
- **Inglés y español.**
- **Nombre completo o separado** según lo pida el formulario. Lo mismo con el teléfono: con lada aparte o con +52 incluido.
- **Ubicación actual, empresa y puesto actual, universidad, carrera, promedio, graduación, años de
  experiencia, fecha de nacimiento, CURP, RFC, NSS y estado civil.** Estos últimos solo si los pones en tu perfil.

## Aprende de ti

1. Llenas el formulario con ⚡. Lo que no sabe sale en naranja como **"Pregunta nueva"**.
2. Contéstalo tú, como siempre.
3. Al dar **Siguiente / Enviar / Guardar y continuar**, la extensión guarda esas respuestas. También
   puedes forzarlo con **💾 Recordar mis respuestas** en el panel.
4. En el siguiente formulario, de cualquier empresa, esas preguntas se llenan solas.

Reglas para que no aprenda de más:
- Solo aprende en páginas de empleo, o donde ya usaste ⚡.
- Solo aprende preguntas que tu perfil **no** cubre. Tu perfil siempre manda; para cambiar un dato del perfil, edítalo en Opciones.
- Nunca guarda contraseñas, datos bancarios, códigos de verificación, búsquedas ni casillas de aceptación.
- Puedes ver, corregir o borrar todo en **Opciones → Respuestas aprendidas**.

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
- **Workday a fondo:** listas (botón + listbox), prompts con búsqueda y Enter
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

`tests/` incluye cinco formularios de prueba:
- Workday con el layout nuevo, en inglés.
- Workday con el layout antiguo, en español y con la dirección de Puebla.
- Oracle Recruiting Cloud, como el de Ford: Agregar → Guardar, botones Sí/No, fechas `mm/dd/yyyy` y listas flotantes.
- Un formulario propio de una empresa, con autocompletar, react-select, Google Forms, Shadow DOM y aviso de privacidad.
- Un blog que **no** es de empleo, donde la extensión no debe aparecer ni aprender nada.

También incluye una prueba de punta a punta que carga la extensión real en Chromium:

```bash
node tests/run-e2e.mjs   # requiere playwright
```

Verifica más de 130 puntos: que llene bien, que aprenda y reutilice tus respuestas, que no duplique entradas ni desmarque nada al volver a llenar y que **nunca** dé clic en Next o Enviar.

## Cuando un sitio no se llena bien

En el panel o en el ícono ⚡, usa **📄 Descargar estructura**. Guarda en Descargas un archivo
`estructura-<sitio>.html` con el esqueleto del formulario: campos, etiquetas, botones y clases.
**No incluye tus datos**: borra lo escrito y cambia tu nombre, correo, teléfono y dirección por `[DATO]`.
Con ese archivo se puede ajustar la extensión a ese sitio en específico.

## Limitaciones conocidas

- Cada empresa configura su Workday. Si una lista no tiene ninguna opción parecida a tu dato,
  ese campo queda en naranja para que lo elijas tú.
- El catálogo de *Skills* de Workday es cerrado: solo se agregan las skills que existen en él.
  El panel indica cuáles no encontró.
- Crear la cuenta e iniciar sesión siguen siendo manuales. Para eso usa el gestor de contraseñas de Edge.
- Si el botón ⚡ no aparece en una página de empleo (por ejemplo, un formulario con un título muy
  genérico), usa el ícono de la extensión → **Llenar esta página**, o **Alt+Shift+L**. Funciona en cualquier página.
- Los captchas, los formularios dentro de PDF y los sitios que bloquean extensiones no se pueden llenar.
- La primera vez en un portal nuevo, revisa todo con calma. Si algo sale mal, usa **Copiar diagnóstico**.

## Estructura

```
manifest.json            MV3: permisos, atajo Alt+Shift+L y scripts en todas las páginas (el botón solo aparece en páginas de empleo)
profile.example.json     perfil inicial (datos del CV)
src/background.js        atajo, puente popup → pestaña y perfil inicial
src/content/utils.js     normalización, esperas, escritura compatible con React
src/content/fields.js    descubre campos: tipo, etiqueta, sección (experiencia/educación…) y número de entrada
src/content/rules.js     reglas campo → dato del perfil y banco de respuestas
src/content/widgets.js   cómo operar cada widget de Workday
src/content/panel.js     botón flotante y panel de resultados (Shadow DOM)
src/content/learn.js     aprende tus respuestas (solo en páginas de empleo)
src/content/main.js      orquestador (agregar entradas, pasadas, reporte)
src/popup/, src/options/ interfaz
tests/                   formularios simulados y prueba de punta a punta
```
