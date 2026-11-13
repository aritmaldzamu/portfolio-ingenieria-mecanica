# Mi Vida Financiera

Dashboard personal de finanzas en HTML. Registras a dónde metiste tu dinero, a qué tasa y para qué apartado (coche, casa, negocio…), y la app calcula sola los rendimientos, cuánto vas a tener y cuándo.

## Cómo abrirla

1. Abre la carpeta `mi-vida-financiera`.
2. Haz **doble clic en `index.html`**. Se abre en tu navegador; no necesita servidor, instalación, `npm` ni internet (salvo la primera vez para la tipografía y las gráficas).
3. Para probarla, en el Inicio presiona **"Cargar datos de ejemplo"**. Para empezar con tus datos, **"Agrega tu primera cuenta"**.

Atajo: en computadora presiona **`/`** para el registro rápido en texto (por ejemplo `gasté 350 en comida con nu`). En celular usa el botón ✦ de arriba o el **+** de la barra inferior.

## Tus datos y cómo respaldarlos

- Todo se guarda **solo en este navegador** (localStorage), con autoguardado. Nada se envía a ningún servidor y nunca se piden números de cuenta o de tarjeta (solo los últimos 4 dígitos, opcional).
- Si borras los datos del navegador, usas modo incógnito o cambias de navegador, **no verás tus datos**. Por eso respalda seguido:
  - **Configuración → Exportar todo (JSON)** descarga un archivo con todo.
  - **Importar JSON** restaura ese archivo (reemplaza lo que haya).
  - **Movimientos a CSV** para abrirlos en Excel o Google Sheets.
- Arriba verás "Último respaldo hace X días"; se pone amarillo si pasan más de 14 días.

## Pasar tus datos del celular a la computadora (o al revés)

1. En el celular: **Más → Configuración → Exportar todo (JSON)**. Se descarga `mi-vida-financiera-AAAA-MM-DD.json`.
2. Mándate ese archivo (por ejemplo por correo a ti mismo, WhatsApp "a mí mismo", Drive o un cable).
3. En la computadora abre `index.html` → **Configuración → Importar JSON** y elige el archivo.

Cada navegador guarda su propia copia; no se sincronizan solos. Usa siempre el último respaldo como "versión buena".

> Para abrirla en el celular necesitas la carpeta en el teléfono (algunos exploradores de archivos de Android abren `index.html` directo) o publicarla en algún hosting estático (por ejemplo GitHub Pages). Aunque la página esté en internet, **los datos siguen guardándose solo en tu teléfono**.

## Pruebas

- `pruebas/pruebas.html` (doble clic) o `node pruebas/pruebas.js` verifican interés compuesto diario, tasas escalonadas y con tope, promociones, GAT nominal y real, ISR y deducción PPR, amortización, el cálculo de apartados por periodos de tasa y el parser de texto.

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
