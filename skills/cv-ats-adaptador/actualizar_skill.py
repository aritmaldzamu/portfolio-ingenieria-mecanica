"""Regenera SKILL.md con el texto de todos los CVs de una carpeta.

Uso (Windows):
    pip install -U pypdf python-docx
    python actualizar_skill.py "C:\\Users\\Arith\\Desktop\\CVs_Arith_Maldonado\\CVs_FINALES_2026"

Lee cada .pdf y .docx de la carpeta y sus subcarpetas, agrupa las versiones
del mismo CV (con/sin foto, otra ciudad, PDF y DOCX), guarda el texto de cada
CV distinto en cvs/ y escribe SKILL.md a partir de plantilla_skill.md.
Luego solo copia SKILL.md a tu skill de Gemini.
"""

import re
import unicodedata
import sys
from pathlib import Path

from docx import Document
from docx.table import Table
from pypdf import PdfReader

AQUI = Path(__file__).resolve().parent
CARPETA_DEFAULT = Path(r"C:\Users\Arith\Desktop\CVs_Arith_Maldonado\CVs_FINALES_2026")


def texto_docx(ruta):
    # Recorre párrafos y tablas en el orden en que aparecen en el documento.
    doc = Document(ruta)
    lineas = []
    for bloque in doc.iter_inner_content():
        if isinstance(bloque, Table):
            for fila in bloque.rows:
                celdas = []
                for celda in fila.cells:
                    if celda.text.strip() and celda.text not in celdas:
                        celdas.append(celda.text)
                lineas.append(" | ".join(celdas))
        else:
            lineas.append(bloque.text)
    return "\n".join(lineas)


def texto_pdf(ruta):
    return "\n".join(pagina.extract_text() or "" for pagina in PdfReader(ruta).pages)


def limpiar(texto):
    texto = unicodedata.normalize("NFKC", texto).replace("```", "'''")
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n\s*\n+", "\n\n", texto)
    return "\n".join(linea.strip() for linea in texto.splitlines()).strip()


def palabras(texto):
    return set(re.findall(r"\w+", texto.lower()))


def es_version_de(texto, otro):
    # Mismo CV con otra foto, ciudad o formato: el texto casi coincide.
    nuevas, viejas = palabras(texto), palabras(otro)
    return len(nuevas & viejas) / len(nuevas | viejas) >= 0.9


def prioridad(ruta, carpeta):
    # Primero la versión "limpia": menos subcarpetas, sin foto, DOCX antes que PDF.
    relativa = str(ruta.relative_to(carpeta)).upper()
    return (len(ruta.relative_to(carpeta).parts), "FOTO" in relativa or "PHOTO" in relativa,
            ruta.suffix != ".docx", relativa)


def nombre_seguro(texto):
    return re.sub(r"[^\w.-]+", "_", texto).strip("_")


def main():
    carpeta = Path(sys.argv[1]) if len(sys.argv) > 1 else CARPETA_DEFAULT
    if not carpeta.is_dir():
        sys.exit(f"No existe la carpeta: {carpeta}")

    archivos = [a for a in carpeta.rglob("*") if a.suffix.lower() in (".pdf", ".docx") and not a.name.startswith("~$")]
    archivos.sort(key=lambda a: prioridad(a, carpeta))

    cvs = []  # [nombre, texto, [versiones]]
    for archivo in archivos:
        relativa = archivo.relative_to(carpeta).as_posix()
        try:
            texto = limpiar(texto_docx(archivo) if archivo.suffix.lower() == ".docx" else texto_pdf(archivo))
        except Exception as error:
            print(f"  ERROR leyendo {relativa}: {error}")
            continue
        if len(texto) < 200:
            print(f"  omitido (sin texto, ¿PDF escaneado?): {relativa}")
            continue
        for cv in cvs:
            if es_version_de(texto, cv[1]):
                cv[2].append(relativa)
                break
        else:
            cvs.append([relativa, texto, [relativa]])

    if not cvs:
        sys.exit("No se encontró ningún CV legible.")

    salida = AQUI / "cvs"
    salida.mkdir(exist_ok=True)
    for viejo in salida.glob("*.txt"):
        viejo.unlink()

    bloques = []
    for nombre, texto, versiones in cvs:
        (salida / f"{nombre_seguro(nombre.rsplit('.', 1)[0])}.txt").write_text(texto, encoding="utf-8")
        lista = "\n".join(f"- {v}" for v in versiones)
        bloques.append(f"## CV BASE: {nombre}\n\nArchivos con este mismo CV:\n{lista}\n\n```\n{texto}\n```")
        print(f"  {nombre}  ({len(versiones)} archivo(s))")

    plantilla = (AQUI / "plantilla_skill.md").read_text(encoding="utf-8")
    (AQUI / "SKILL.md").write_text(plantilla.replace("{{CVS}}", "\n\n".join(bloques)), encoding="utf-8")
    print(f"\nSKILL.md actualizado con {len(cvs)} CV(s) distintos de {len(archivos)} archivo(s). Cópialo a tu skill de Gemini.")


if __name__ == "__main__":
    main()
