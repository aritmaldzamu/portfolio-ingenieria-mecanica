# cv-ats-adaptador

Pegas **solo el texto de una vacante** en Gemini y te regresa: veredicto (aplica / aplica con CV adaptado / match bajo), % de match ATS antes y después, brechas y el CV completo adaptado. El CV adaptado sale en el mismo formato de tus CVs finales y con `generar_cv.html` lo conviertes a un PDF con tu diseño.

## Archivos

- `plantilla_skill.md`: las instrucciones de la skill. Edita aquí las reglas.
- `actualizar_skill.py`: lee tus CVs (PDF/DOCX, incluidas subcarpetas), agrupa las versiones del mismo CV (con/sin foto, MTY/Puebla), los convierte al formato del generador y escribe `SKILL.md`.
- `SKILL.md`: **generado**, es lo que copias a Gemini. No lo edites a mano.
- `generar_cv.html`: convierte el CV que te da Gemini en el PDF con tu diseño (Carlito, azul marino, fechas a la derecha, 1 página).
- `cvs/`: tus CVs ya convertidos, para revisar que se leyeron bien.
- `gemini/`: lo que va en tu Gem de Gemini: `1_instrucciones.md` (se pega en Instrucciones) y `CVs_BASE_Arith.txt` (se sube como conocimiento).

## Usar con una vacante

1. Pega la vacante en Gemini (con la skill activa).
2. Copia el bloque de la sección **CV adaptado**.
3. Abre `generar_cv.html` en Chrome o Edge (doble clic) y pega el bloque.
4. Marca **Con foto** si lo necesitas (la primera vez elige tu foto; se queda guardada en ese navegador).
5. En **Nombre del PDF** deja `CV_Arith_Maldonado` o agrégale la empresa (por ejemplo `CV_Arith_Maldonado_Ford`).
6. Pulsa **Guardar PDF** → Destino «Guardar como PDF», Tamaño «Carta», Márgenes «Ninguno». El archivo ya sale con ese nombre.

El PDF lleva enlaces reales, igual que tus originales: LinkedIn y portafolio con `https://`, correo con `mailto:` y teléfono con `tel:`.

La letra del cuerpo se ajusta sola entre 10.4 y 9.4 pt para llenar una página, como en tus PDFs. Si aun así no cabe, el generador te avisa.

## Cada vez que cambies tus CVs

```powershell
pip install -U pdfplumber python-docx
python actualizar_skill.py "C:\Users\Arith\Desktop\CVs_Arith_Maldonado\CVs_FINALES_2026"
```

Después reemplaza el contenido de la skill en Gemini con el nuevo `SKILL.md`.
