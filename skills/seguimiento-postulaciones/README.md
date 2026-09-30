# seguimiento-postulaciones

Gem de Gemini que entra a tu Gmail y te dice cómo van tus postulaciones: a cuáles te rechazaron, cuáles siguen en proceso (entrevistas, pruebas técnicas), cuáles no han contestado y si hay alguna oferta. Te da una tabla por empresa y lo que tienes que hacer.

## Archivos

- `gemini/1_instrucciones.md`: se pega completo en **Instrucciones** del Gem. No necesita archivos de conocimiento.

## Crear el Gem

1. En gemini.google.com → **Explorar Gems** → **Nuevo Gem**.
2. Nombre: `Seguimiento de postulaciones`.
3. Pega el contenido de `gemini/1_instrucciones.md` en **Instrucciones** y guarda.
4. Asegúrate de que la app **Google Workspace / Gmail** esté activada: en Gemini → Configuración → **Apps** (o Extensiones) → Google Workspace activado, con tu cuenta maldonado.zamudio.arith@gmail.com.

## Usarlo

Abre el Gem y escribe algo como:

- `¿cómo van mis postulaciones?`
- `¿quién me rechazó este mes?`
- `¿qué pasó con Schneider?`

Si Gemini contesta sin buscar en tu correo, empieza el mensaje con `@Gmail` (por ejemplo `@Gmail ¿cómo van mis postulaciones?`).

## Limitaciones

- Gemini solo lee tu correo: no etiqueta, no envía y no borra nada.
- Su búsqueda en Gmail trae pocos correos por consulta; si tienes muchas postulaciones, pídele un periodo más corto (`revisa solo septiembre`) o una empresa concreta.
