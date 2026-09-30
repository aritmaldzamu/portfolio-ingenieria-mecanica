"""Regenera SKILL.md con todos los CVs de una carpeta, en el formato del generador.

Uso (Windows):
    pip install -U pdfplumber python-docx
    python actualizar_skill.py "C:\\Users\\Arith\\Desktop\\CVs_Arith_Maldonado\\CVs_FINALES_2026"

Lee cada .pdf y .docx de la carpeta y sus subcarpetas, agrupa las versiones
del mismo CV (con/sin foto, otra ciudad, PDF y DOCX) y convierte cada CV
distinto al formato de texto que entiende generar_cv.html (negritas, cursivas,
fechas a la derecha, viñetas). Guarda cada uno en cvs/ y escribe SKILL.md a
partir de plantilla_skill.md. Luego copia SKILL.md a tu skill, o usa la carpeta gemini/ para un Gem.
"""

import re
import sys
import unicodedata
from pathlib import Path

import pdfplumber
from docx import Document
from docx.table import Table

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


def estilo(char):
    fuente = char["fontname"].lower()
    if "bold" in fuente:
        return "b"
    if "italic" in fuente or "oblique" in fuente:
        return "i"
    return "r"


def lineas_pdf(pagina):
    """Agrupa los caracteres en renglones (misma altura) ordenados de izquierda a derecha."""
    renglones = []
    for char in sorted(pagina.chars, key=lambda c: (c["top"], c["x0"])):
        if renglones and abs(char["top"] - renglones[-1][0]) < 3:
            renglones[-1][1].append(char)
        else:
            renglones.append([char["top"], [char]])
    return [(top, sorted(chars, key=lambda c: c["x0"])) for top, chars in renglones]


def a_marcado(chars):
    """Convierte un renglón a texto con **negritas**, _cursivas_ y ' || ' antes de lo alineado a la derecha."""
    partes, derecha = [], []
    destino, anterior = partes, None
    for char in chars:
        if anterior is not None and char["x0"] - anterior["x1"] > 25:
            destino = derecha  # hueco grande: fecha o lugar alineado a la derecha
        destino.append(char)
        anterior = char

    def con_estilos(grupo):
        texto, actual, bloque = "", None, ""
        for char in grupo + [None]:
            nuevo = estilo(char) if char else None
            if nuevo != actual and bloque:
                limpio = bloque.strip()
                marca = {"b": "**", "i": "_"}.get(actual, "")
                if limpio and marca:
                    inicio = bloque[: len(bloque) - len(bloque.lstrip())]
                    fin = bloque[len(bloque.rstrip()):]
                    texto += f"{inicio}{marca}{limpio}{marca}{fin}"
                else:
                    texto += bloque
                bloque = ""
            if char:
                actual = nuevo
                bloque += char["text"]
        return texto

    texto = con_estilos(partes).rstrip()
    if derecha:
        texto += " || " + con_estilos(derecha).strip().strip("*_")
    return texto


def unir(previo, siguiente):
    # Renglón cortado: "flat-" + "panel" se une sin espacio.
    if previo.endswith("-") and not previo.endswith(" -"):
        return previo + siguiente
    return previo + " " + siguiente


def marcado_pdf(ruta):
    """Lee un CV en PDF y lo devuelve en el formato de generar_cv.html."""
    bloques = []  # listas de [tipo, texto]
    with pdfplumber.open(ruta) as pdf:
        for pagina in pdf.pages:
            vinetas = [c["top"] for c in pagina.curves if c["width"] < 6 and c["height"] < 6]
            renglones = lineas_pdf(pagina)
            if not renglones:
                continue
            margen = min(chars[0]["x0"] for _, chars in renglones)
            for top, chars in renglones:
                texto = a_marcado(chars)
                plano = "".join(c["text"] for c in chars).strip()
                if not plano:
                    continue
                tamano = max(c["size"] for c in chars)
                previo = bloques[-1][0] if bloques else None
                hay_seccion = any(t == "seccion" for t, _ in bloques)

                if tamano >= 18:
                    bloques.append(["nombre", "# " + plano])
                elif estilo(chars[0]) == "b" and plano.isupper() and len(plano) < 40 and chars[0]["x0"] < margen + 6:
                    bloques.append(["seccion", "## " + plano])
                elif not hay_seccion and previo == "nombre":
                    bloques.append(["titulo", "> " + plano])
                elif not hay_seccion:
                    bloques.append(["contacto", plano])
                elif chars[0]["x0"] > margen + 6:
                    if any(abs(top + 2.5 - v) < 4 or abs(top - v) < 4 for v in vinetas) or previo != "vineta":
                        bloques.append(["vineta", "- " + texto])
                    else:
                        bloques[-1][1] = unir(bloques[-1][1], texto)
                elif estilo(chars[0]) == "b":
                    bloques.append(["entrada", texto])
                elif estilo(chars[0]) == "i" and previo != "detalle":
                    bloques.append(["detalle", texto])
                elif previo in ("parrafo", "detalle", "entrada", "etiqueta"):
                    bloques[-1][1] = unir(bloques[-1][1], texto)
                else:
                    bloques.append(["parrafo", texto])

                # Las líneas "**Etiqueta:** texto" de habilidades se continúan como párrafo.
                if bloques[-1][0] == "entrada" and re.match(r"^\*\*[^*]+:\*\*", bloques[-1][1]):
                    bloques[-1][0] = "etiqueta"

    # Contacto: siempre en el formato de dos renglones de la versión sin foto.
    contacto = [t for tipo, t in bloques if tipo == "contacto"]
    enlaces = [re.sub(r"^LinkedIn:\s*", "", c) for c in contacto if re.match(r"^(LinkedIn:|linkedin\.com|Portfolio:)", c, re.I)]
    otros = [c for c in contacto if c not in [x for x in contacto if re.match(r"^(LinkedIn:|linkedin\.com|Portfolio:)", x, re.I)]]
    contacto_normal = otros + ([" | ".join(enlaces)] if enlaces else [])

    salida, contacto_puesto = [], False
    for tipo, texto in bloques:
        if tipo == "contacto":
            if not contacto_puesto:
                salida.extend(contacto_normal)
                contacto_puesto = True
            continue
        if tipo == "seccion":
            salida.append("")
        salida.append(re.sub(r"_\| ", "| _", texto))  # "_| A · B_" -> "| _A · B_"
    return "\n".join(salida)


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
    # Primero la versión "limpia": menos subcarpetas, sin foto, PDF antes que DOCX.
    relativa = str(ruta.relative_to(carpeta)).upper()
    return (len(ruta.relative_to(carpeta).parts), "FOTO" in relativa or "PHOTO" in relativa,
            ruta.suffix.lower() != ".pdf", relativa)


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
            texto = limpiar(texto_docx(archivo) if archivo.suffix.lower() == ".docx" else marcado_pdf(archivo))
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

    # Versión para un Gem de Gemini: instrucciones cortas + un archivo de conocimiento con los CVs.
    gemini = AQUI / "gemini"
    gemini.mkdir(exist_ok=True)
    instrucciones = re.sub(r"^---.*?---\s*", "", plantilla, flags=re.S)
    instrucciones = instrucciones.replace("{{CVS}}", "Están en el archivo de conocimiento **CVs_BASE_Arith.txt**. Léelo completo antes de responder.")
    instrucciones = instrucciones.replace("incluidos al final de este archivo", "del archivo CVs_BASE_Arith.txt").replace("Los CVs BASE (al final)", "Los CVs BASE (archivo CVs_BASE_Arith.txt)")
    (gemini / "1_instrucciones.md").write_text(instrucciones, encoding="utf-8")
    (gemini / "CVs_BASE_Arith.txt").write_text("CVs BASE DE ARITH MALDONADO ZAMUDIO\n\n" + "\n\n".join(bloques), encoding="utf-8")
    print(f"\nSKILL.md actualizado con {len(cvs)} CV(s) distintos de {len(archivos)} archivo(s). Listo: SKILL.md y la carpeta gemini/.")


if __name__ == "__main__":
    main()
