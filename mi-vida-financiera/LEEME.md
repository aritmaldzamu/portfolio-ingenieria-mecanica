# Mi Vida Financiera

Dashboard personal de finanzas en HTML. Registras a dónde metiste tu dinero, a qué tasa y para qué apartado (coche, casa, negocio…), y la app calcula sola los rendimientos, cuánto vas a tener y cuándo.

## Cómo abrirla

1. Abre la carpeta `mi-vida-financiera`.
2. Haz **doble clic en `index.html`**. Se abre en tu navegador; no necesita servidor, instalación, `npm` ni internet (salvo la primera vez para la tipografía y las gráficas).
3. Para probarla, en el Inicio presiona **"Cargar datos de ejemplo"**. Para empezar con tus datos, **"Agrega tu primera cuenta"**.

Atajo: en computadora presiona **`/`** para el registro rápido en texto (por ejemplo `gasté 350 en comida con nu`). En celular usa el botón ✦ de arriba o el **+** de la barra inferior.

## Tus datos y cómo respaldarlos

- Todo se guarda en este navegador (localStorage), con autoguardado. Si activas la sincronización, también en tu repositorio privado de GitHub; nada más se envía a ningún otro lado. Nunca se piden números de cuenta o de tarjeta (solo los últimos 4 dígitos, opcional).
- Si borras los datos del navegador, usas modo incógnito o cambias de navegador, **no verás tus datos**. Por eso respalda seguido:
  - **Configuración → Exportar todo (JSON)** descarga un archivo con todo.
  - **Importar JSON** restaura ese archivo (reemplaza lo que haya).
  - **Movimientos a CSV** para abrirlos en Excel o Google Sheets.
- Arriba verás "Último respaldo hace X días"; se pone amarillo si pasan más de 14 días.

## Usarla en el celular y en la compu con los mismos datos (sincronización)

La app vive en https://aritmaldzamu.github.io/portfolio-ingenieria-mecanica/mi-vida-financiera/ (después de hacer merge a `main`). En el celular ábrela y agrégala a la pantalla de inicio (iPhone: Compartir → "Agregar a inicio"; Android: ⋮ → "Agregar a pantalla principal").

Para que lo que registres en un dispositivo aparezca en el otro, los datos se guardan en un **repositorio privado de tu GitHub**. Configuración de una sola vez:

1. Crea un repositorio **privado** en https://github.com/new con nombre `mis-finanzas-datos` (marca *Private*).
2. Crea un token en https://github.com/settings/personal-access-tokens/new:
   - *Repository access* → *Only select repositories* → `mis-finanzas-datos`.
   - *Permissions* → *Repository permissions* → *Contents* → **Read and write**.
   - Elige una expiración (por ejemplo 1 año), genera y copia el token (empieza con `github_pat_`). Guárdalo en un lugar seguro.
3. En la app: **Configuración → Sincronizar entre dispositivos** → escribe tu usuario, `mis-finanzas-datos` y el token → **Conectar**.
4. Repite el paso 3 en tu otro dispositivo con el mismo token. Si el primero ya tenía datos, elige **"Usar los datos de GitHub"**.

Cómo funciona:
- Al registrar algo se sincroniza a los ~2 segundos; al abrir la app (o volver a ella) y cada minuto trae lo del otro dispositivo.
- Si cambias cosas distintas en el celular y en la compu, se conservan ambas. Si cambias lo mismo en los dos, gana el último que sincroniza.
- Sin internet sigue funcionando; se sincroniza al volver la conexión.
- Cada sincronización es un commit en el repositorio, así que tienes historial y puedes recuperar versiones anteriores desde GitHub.
- El token se guarda solo en el navegador de cada dispositivo y **no** se incluye en los respaldos JSON. Si pierdes un dispositivo, borra el token en GitHub y crea otro.
- La app se niega a sincronizar con un repositorio público.
- El tema claro/oscuro y "ocultar montos" son preferencias de cada dispositivo (no se sincronizan).

## Pasar tus datos sin sincronización (manual)

1. En un dispositivo: **Configuración → Exportar todo (JSON)**.
2. Mándate el archivo (correo, WhatsApp a ti mismo, Drive…).
3. En el otro: **Configuración → Importar JSON** (reemplaza lo que haya).

## Pruebas

- `pruebas/pruebas.html` (doble clic) o `node pruebas/pruebas.js` verifican interés compuesto diario, tasas escalonadas y con tope, promociones, GAT nominal y real, ISR y deducción PPR, amortización, el cálculo de apartados por periodos de tasa, el parser de texto y la fusión de la sincronización.

## Decisiones que tomé (puedes cambiarlas)

- **Archivos:** `index.html` + `css/` + `js/` (módulos sin `import`, para que funcione con doble clic desde `file://`). Gráficas con Chart.js 4.4.1 por CDN con versión fija; si no hay internet se usa la copia local de `vendor/` para que las gráficas sigan funcionando sin conexión.
- **Retención de ISR sobre intereses:** en México es un % **anual sobre el capital**, no sobre el interés. Se descuenta de la tasa (ej. 7.25 % − 0.90 % = 6.35 % neto). El valor por defecto es 0.90 % (2026); actualízalo en Configuración.
- **UMA y tabla del ISR:** vienen los valores 2025 (UMA diaria $113.14 y tabla anual del Anexo 8 de la RMF). Están marcados con "actualiza este valor".
- **Tasas de ejemplo:** todas las tasas precargadas (Nu, Revolut, Cetes, etc.) son ejemplos y llevan la etiqueta "verifica la tasa actual en la app".
- **Saldo de una cuenta:** último "Actualizar saldo" + movimientos posteriores + rendimiento estimado por periodos. Cada "Actualizar saldo" ancla la gráfica de patrimonio a la realidad.
- **Depósitos a apartados:** cada depósito guarda la tasa de ese día y rinde a esa tasa hasta el siguiente cambio de tasa de la cuenta; después usa la nueva. Si al depositar escribes una tasa distinta a la de la cuenta, por defecto también se actualiza la tasa de la cuenta. Un depósito puede ser "dinero nuevo", "desde otra cuenta" (mueve saldo) o "ya estaba en la cuenta" (solo lo asigna). Al borrar un apartado su dinero queda "sin asignar".
- **Tasas escalonadas en una cuenta:** la tasa se calcula sobre el saldo total de la cuenta en cada periodo (ej. 7.25 % hasta $25,000 y 5.50 % el excedente).
- **Cetes:** interés simple base 360 por plazo, reinvertido al vencer (equivalente diario para estimar el valor día a día). Sin reinversión, deja de rendir al vencer.
- **Tarjetas de crédito:** el saldo es lo que debes; los gastos lo aumentan y las transferencias hacia la tarjeta (pagos) lo reducen. No se simulan intereses de la tarjeta (se asume que pagas para no generar intereses). Los préstamos sí acumulan interés mensual.
- **Gastos que pagan tus papás:** se guarda el porcentaje que pagaron ellos. Solo tu parte cuenta para tu presupuesto, tu flujo y el saldo de tu cuenta; si lo pagaron 100 % puede no tener cuenta. El "Acuerdo con mis papás" (en Presupuesto) sugiere automáticamente ese porcentaje al registrar un gasto de esa categoría.
- **Fondo de emergencia:** meta = meses configurados (3 a 6) × tu gasto promedio real (tu parte) de los últimos 3 meses completos.
- **PPR:** deducible hasta 10 % de tus ingresos anuales con tope de 5 UMA anuales (art. 151 fracc. V LISR). La devolución se estima como la diferencia de ISR con y sin la deducción; en la gráfica se reinvierte cada año.
- **Sueldo neto:** ISR con la tabla anual ÷ 12, subsidio para el empleo 2025 y cuota obrera del IMSS aproximada. Es una estimación.
- **Promociones en el comparador:** se aplican solo durante sus días; la distribución óptima promedia la promo contra la tasa normal en un año.
- **Moneda:** pensada para MXN; puedes cambiar el símbolo a USD o EUR en Configuración (no convierte montos).
