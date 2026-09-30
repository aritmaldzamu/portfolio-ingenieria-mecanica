# cv-ats-adaptador

Skill para pegar **solo el texto de una vacante** y recibir: veredicto (aplica / aplica con CV adaptado / match bajo), % de match ATS antes y después, brechas y el CV completo adaptado, basado en tus CVs finales.

## Archivos

- `plantilla_skill.md`: las instrucciones de la skill. Edita aquí las reglas.
- `actualizar_skill.py`: lee tus CVs (PDF/DOCX, incluidas subcarpetas), agrupa las versiones del mismo CV (con/sin foto, MTY/Puebla) y genera `SKILL.md` con los CVs distintos adentro.
- `SKILL.md`: **generado**, es lo que copias a Gemini. No lo edites a mano.
- `cvs/`: texto extraído de cada CV, para revisar que se leyó bien.

## Cada vez que cambies tus CVs

```powershell
pip install -U pypdf python-docx
python actualizar_skill.py "C:\Users\Arith\Desktop\CVs_Arith_Maldonado\CVs_FINALES_2026"
```

Después reemplaza el contenido de la skill en Gemini con el nuevo `SKILL.md`.
