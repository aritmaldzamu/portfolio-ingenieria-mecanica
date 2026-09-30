"""Regenera SKILL.md con el texto de todos los CVs de una carpeta.

Uso (Windows):
    pip install -U pypdf python-docx
    python actualizar_skill.py "C:\\Users\\Arith\\Desktop\\CVs_Arith_Maldonado\\CVs_FINALES_2026"

Lee cada .pdf y .docx de la carpeta, quita duplicados (mismo texto o mismo
nombre en PDF y DOCX), guarda el texto en cvs/ y escribe SKILL.md a partir de
plantilla_skill.md. Luego solo copia SKILL.md a tu skill de Gemini.
"""

import re
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
    texto = texto.replace("\u00a0", " ").replace("```", "'''")
    texto = re.sub(r"[ \t]+", " ", texto)
    texto = re.sub(r"\n\s*\n+", "\n\n", texto)
    return "\n".join(linea.strip() for linea in texto.splitlines()).strip()


def palabras(texto):
    return set(re.findall(r"\w+", texto.lower()))


def es_duplicado(texto, ya_incluidos):
    # Mismo CV exportado a PDF y DOCX: el texto extraído casi coincide.
    nuevas = palabras(texto)
    for otro in ya_incluidos:
        viejas = palabras(otro)
        if len(nuevas & viejas) / len(nuevas | viejas) >= 0.95:
            return True
    return False


def main():
    carpeta = Path(sys.argv[1]) if len(sys.argv) > 1 else CARPETA_DEFAULT
    if not carpeta.is_dir():
        sys.exit(f"No existe la carpeta: {carpeta}")

    archivos = sorted(carpeta.glob("*.docx")) + sorted(carpeta.glob("*.pdf"))
    archivos = [a for a in archivos if not a.name.startswith("~$")]

    salida = AQUI / "cvs"
    salida.mkdir(exist_ok=True)
    for viejo in salida.glob("*.txt"):
        viejo.unlink()

    vistos_nombre, cvs = set(), []
    for archivo in archivos:
        # El DOCX va primero: si existe el PDF con el mismo nombre, se omite.
        if archivo.stem in vistos_nombre:
            print(f"  omitido (mismo nombre que otro formato): {archivo.name}")
            continue
        try:
            texto = limpiar(texto_docx(archivo) if archivo.suffix == ".docx" else texto_pdf(archivo))
        except Exception as error:
            print(f"  ERROR leyendo {archivo.name}: {error}")
            continue
        if len(texto) < 200:
            print(f"  omitido (sin texto, ¿PDF escaneado?): {archivo.name}")
            continue
        if es_duplicado(texto, [t for _, t in cvs]):
            print(f"  omitido (contenido duplicado): {archivo.name}")
            continue
        vistos_nombre.add(archivo.stem)
        (salida / f"{archivo.stem}.txt").write_text(texto, encoding="utf-8")
        cvs.append((archivo.name, texto))
        print(f"  incluido: {archivo.name}")

    if not cvs:
        sys.exit("No se encontró ningún CV legible.")

    bloques = "\n\n".join(f"## CV BASE: {nombre}\n\n```\n{texto}\n```" for nombre, texto in cvs)
    plantilla = (AQUI / "plantilla_skill.md").read_text(encoding="utf-8")
    (AQUI / "SKILL.md").write_text(plantilla.replace("{{CVS}}", bloques), encoding="utf-8")
    print(f"\nSKILL.md actualizado con {len(cvs)} CV(s). Cópialo a tu skill de Gemini.")


if __name__ == "__main__":
    main()
