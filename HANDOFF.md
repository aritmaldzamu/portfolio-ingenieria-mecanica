# Handoff - Arith.HUB Portfolio

Este documento resume el estado del portafolio para continuar el trabajo en otra IA o en otra sesión.

## Estado actual

- Sitio local principal: `C:\Users\arith\Desktop\Arith-HUB\portfolio-ingenieria-mecanica`
- Archivo principal: `index.html`
- Publicación: GitHub Pages
- URL pública: https://aritmaldzamu.github.io/portfolio-ingenieria-mecanica/
- Rama usada: `main`
- El sitio esta desplegado y funcionando.

## Lo que ya se hizo

- Se construyó un portafolio profesional de una sola página.
- Se agregaron proyectos con tarjetas y fichas completas:
  - XGIO Smart Cane GPS Tracking Ecosystem
  - Ball & Beam Discrete Control Prototype
  - 3DOF Ball Balancing Platform
  - Somnus Sleep Monitor
  - Transradial Prosthesis Tool Holder
  - Laser-Cut Hot Air Balloon Prototype (id: `globo`)
- Se agregó una sección de certificaciones desde `C:\Users\arith\Downloads\CERTIFICACIONES`.
- Se agregaron videos del proyecto 3DOF sin audio.
- Se eliminó la sección de artículos científicos porque visualmente no convenció.
- Se corrigió el enlace de LinkedIn:
  - https://www.linkedin.com/in/arith-maldonado-zamudio-4038262b5
- Se implementó idioma inglés por defecto con botón manual `ES/EN`.
- Se hizo revisión editorial de ortografía y traducción en inglés/español.

## Arquitectura del sitio

El sitio no usa framework. Todo vive en `index.html`:

- CSS dentro de `<style>`.
- HTML de todas las secciones dentro de `<main>`.
- JS al final del archivo.
- Traducciones manuales en:
  - `manualTranslations.text`
  - `manualTranslations.attr`
  - `spanishExactCorrections`
  - `spanishWordCorrections`

No usar Google Translate ni traducción automática para el contenido profesional.

## Cómo agregar otro proyecto

1. Crear carpeta de assets:

   `assets/<id-del-proyecto>/`

2. Agregar imágenes, videos, documentos o código dentro de esa carpeta.

3. En `index.html`, buscar la sección:

   `<section id="proyectos" class="section-wrap project-view">`

   Agregar una nueva tarjeta `.catalog-card` apuntando a `#<id-del-proyecto>`.

4. Crear las secciones detalle del proyecto con esta forma:

   ```html
   <section id="<id-del-proyecto>" class="section-wrap project-view project-detail" data-project="<id-del-proyecto>">
     ...
   </section>
   ```

   Si hay subsecciones, usar ids como:

   - `<id-del-proyecto>-galeria`
   - `<id-del-proyecto>-stack`
   - `<id-del-proyecto>-control`
   - `<id-del-proyecto>-repo`

5. En el script final, agregar los ids a:

   ```js
   const projectDetailIds = new Set([...]);
   const projectBySection = { ... };
   ```

6. Agregar traducciones manuales al objeto `manualTranslations.text`.

7. Si hay `alt`, `aria-label` o `title`, agregar traducciones en `manualTranslations.attr`.

8. Probar localmente:

   - Abrir `http://127.0.0.1:5500/`
   - Verificar que cargue en inglés.
   - Presionar `ES`.
   - Confirmar que no queden textos mezclados o sin acentos.

9. Publicar:

   ```powershell
   git add index.html assets README.md HANDOFF.md
   git commit -m "Add <nombre-del-proyecto> project"
   git push origin main
   ```

10. Verificar en GitHub Pages:

    `https://aritmaldzamu.github.io/portfolio-ingenieria-mecanica/`

## Criterios editoriales importantes

- Inglés por defecto, porque los entrevistadores probablemente hablarán inglés.
- Español disponible con botón.
- No usar traducción automática.
- Revisar acentos en español:
  - El HTML base puede tener texto sin acento, pero el modo español renderizado debe mostrar `mecatrónica`, `biomédico`, `mención`, `diseño`, `validación`, `simulación`, `ubicación`, `código` y `gráficas` correctamente.
- Revisar que no aparezcan caracteres raros de codificación como mojibake.
- Mantener nombres técnicos reales sin traducir cuando sean comandos o código:
  - `ANG:izq,der,vert`
  - nombres de archivos
  - variables de código

## Comprobaciones útiles

Buscar residuos visuales raros:

```powershell
rg -n "Â|Ã|â†|Systemes" index.html
```

Ver estado de git:

```powershell
git status --short
```

Confirmar último commit:

```powershell
git log -1 --oneline
```

## Contacto del perfil

- LinkedIn: https://www.linkedin.com/in/arith-maldonado-zamudio-4038262b5
- GitHub: https://github.com/aritmaldzamu
- Email: maldonado.zamudio.arith@gmail.com
