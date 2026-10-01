"""Empaqueta las skills de Gemini a partir de su SKILL.md.

Por cada skill genera en <skill>/gemini/:
  - <skill>.zip               → para "Subir una habilidad" en Gemini (contiene <skill>/SKILL.md)
  - Instrucciones_Gem_<X>.txt → para pegar en "Instrucciones" de un Gem (SKILL.md sin el encabezado YAML)

Uso (Windows o Linux):  python skills/empaquetar.py
Córrelo cada vez que edites un SKILL.md.
"""

import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent
SKILLS = {
    "buscador-vacantes": "Instrucciones_Gem_Buscador.txt",
    "seguimiento-postulaciones": "Instrucciones_Gem_Postulaciones.txt",
}
FECHA_FIJA = (2026, 1, 1, 0, 0, 0)  # zips reproducibles: mismo contenido → mismo archivo


def sin_frontmatter(texto: str) -> str:
    if texto.startswith("---"):
        fin = texto.find("\n---", 3)
        if fin != -1:
            return texto[fin + 4:].lstrip("\n")
    return texto


def main() -> None:
    for nombre, txt in SKILLS.items():
        carpeta = RAIZ / nombre
        skill = (carpeta / "SKILL.md").read_text(encoding="utf-8")
        if f"name: {nombre}" not in skill.split("\n---", 1)[0]:
            raise SystemExit(f"{nombre}/SKILL.md: el campo name debe ser '{nombre}'")

        salida = carpeta / "gemini"
        salida.mkdir(exist_ok=True)
        with zipfile.ZipFile(salida / f"{nombre}.zip", "w", zipfile.ZIP_DEFLATED) as z:
            for ruta, datos in ((f"{nombre}/", b""), (f"{nombre}/SKILL.md", skill.encode("utf-8"))):
                info = zipfile.ZipInfo(ruta, FECHA_FIJA)
                info.external_attr = (0o40755 << 16 | 0x10) if ruta.endswith("/") else (0o644 << 16)
                z.writestr(info, datos)
        (salida / txt).write_text(sin_frontmatter(skill), encoding="utf-8")
        print(f"OK  {nombre}: gemini/{nombre}.zip, gemini/{txt}")


if __name__ == "__main__":
    main()
