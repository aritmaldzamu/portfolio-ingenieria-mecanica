#!/usr/bin/env python3
"""Herramientas para conseguir vacantes cuando una bolsa de empleo bloquea a Claude.

Solo usa la biblioteca estándar. No evade protecciones: un intento por URL,
user-agent honesto, sin cookies, sin proxies, sin captchas. Todas las salidas
son JSON en stdout.

Subcomandos:
  diagnosticar <url>   Clasifica la respuesta (ok, bloqueo_bot, captcha, login, ...)
  pista <url>          Extrae sitio, ID, puesto, empresa y búsquedas sugeridas de la URL
  ats ...              Consulta endpoints públicos de portales de empresa (ATS)
  nivel <titulo>       Aplica la regla de nivel Jr de Arith
  dedupe <archivo>     Une vacantes duplicadas de varias fuentes
"""

import argparse
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

UA = "Mozilla/5.0 (compatible; VacantesRodeo/1.0; busqueda personal de empleo)"
TIMEOUT = 20


# ---------------------------------------------------------------- utilidades

def norm(texto):
    """Minúsculas, sin acentos, espacios simples."""
    texto = unicodedata.normalize("NFKD", texto or "")
    texto = "".join(c for c in texto if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", texto.lower()).strip()


def slug_a_texto(slug):
    return re.sub(r"\s+", " ", urllib.parse.unquote(slug).replace("-", " ").replace("_", " ")).strip()


def fetch(url, data=None, headers=None):
    """Un solo intento. Devuelve (status, url_final, cuerpo) o (None, url, error)."""
    h = {"User-Agent": UA, "Accept": "text/html,application/json;q=0.9,*/*;q=0.8"}
    if headers:
        h.update(headers)
    body = None
    if data is not None:
        body = json.dumps(data).encode()
        h["Content-Type"] = "application/json"
    req = urllib.request.Request(url, data=body, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
            return r.status, r.geturl(), r.read(2_000_000).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        try:
            cuerpo = e.read(200_000).decode("utf-8", "replace")
        except Exception:
            cuerpo = ""
        return e.code, url, cuerpo
    except Exception as e:  # red caída, DNS, proxy del entorno, timeout
        return None, url, f"{type(e).__name__}: {e}"


def fetch_json(url, data=None):
    status, _, cuerpo = fetch(url, data=data, headers={"Accept": "application/json"})
    if status != 200:
        raise RuntimeError(f"HTTP {status}: {cuerpo[:200]}")
    return json.loads(cuerpo)


def salida(obj):
    json.dump(obj, sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")


# ------------------------------------------------------------- diagnosticar

MARCAS_CAPTCHA = ["captcha", "just a moment", "verify you are human", "verifica que eres humano",
                  "cf-chl", "challenge-platform", "are you a robot", "eres un robot",
                  "datadome", "px-captcha", "press & hold", "security check"]
MARCAS_LOGIN = ["authwall", "sign in to view", "join to view", "inicia sesion para",
                "unete para ver", "sign in to see", "log in to continue", "inicia sesion o registrate"]
MARCAS_CERRADA = ["no longer available", "no longer accepting", "ya no esta disponible",
                  "ha expirado", "job has expired", "position has been filled", "vacante cerrada",
                  "this job is closed", "oferta ya no esta activa"]
MARCAS_JS = ["enable javascript", "habilita javascript", "you need to enable javascript",
             "requires javascript"]

SIGUIENTE = {
    "ok": "Usa el contenido directamente; no hace falta rodear.",
    "bloqueo_bot": "R1 (fuente original en el ATS) -> R2 (alertas en Gmail) -> R3 (buscador). No reintentes este sitio en esta corrida.",
    "captcha": "No intentes resolverlo. R1 -> R2 -> R3 -> R4.",
    "login": "No inicies sesión. R5 (vista pública individual) si no la probaste, luego R1 -> R2 -> R3.",
    "limite": "Detén las peticiones a este sitio en esta corrida. R1 -> R2 -> R3.",
    "js_vacia": "El texto lo arma JavaScript. Busca el endpoint JSON del ATS (R1) o usa R3/R6.",
    "no_existe": "Puede estar cerrada o movida: búscala en el ATS de la empresa (R1) antes de descartarla.",
    "sin_red": "El entorno no alcanza este dominio (no es necesariamente el sitio). Usa la herramienta de lectura web del entorno o sigue con R2/R3.",
}


def texto_visible(html):
    html = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", html)
    return re.sub(r"\s+", " ", re.sub(r"(?s)<[^>]+>", " ", html)).strip()


def clasificar_respuesta(status, url_final, cuerpo):
    if status is None:
        return "sin_red", cuerpo
    n = norm(cuerpo[:300_000])
    nf = norm(url_final)
    if any(m in n for m in MARCAS_CAPTCHA):
        return "captcha", "marcas de desafío anti-bot en la página"
    if status == 429:
        return "limite", "HTTP 429"
    if status in (404, 410):
        return "no_existe", f"HTTP {status}"
    if status == 999:
        return "bloqueo_bot", "HTTP 999 (firma de LinkedIn)"
    if any(m in nf for m in ("authwall", "/login", "signin", "/uas/")) or any(m in n for m in MARCAS_LOGIN):
        return "login", "redirige o pide iniciar sesión"
    if status in (401, 403):
        return "bloqueo_bot", f"HTTP {status}"
    if status >= 400:
        return "bloqueo_bot", f"HTTP {status}"
    if any(m in n for m in MARCAS_CERRADA):
        return "no_existe", "la página dice que la vacante ya no está disponible"
    visible = texto_visible(cuerpo)
    if cuerpo.lstrip().startswith(("{", "[")):
        return "ok", "respuesta JSON"
    if len(visible) < 400 or any(m in n for m in MARCAS_JS):
        return "js_vacia", f"solo {len(visible)} caracteres de texto visible"
    return "ok", f"{len(visible)} caracteres de texto visible"


def cmd_diagnosticar(args):
    status, url_final, cuerpo = fetch(args.url)
    tipo, motivo = clasificar_respuesta(status, url_final, cuerpo)
    titulo = re.search(r"(?is)<title[^>]*>(.*?)</title>", cuerpo or "")
    salida({
        "url": args.url,
        "url_final": url_final,
        "http": status,
        "tipo": tipo,
        "motivo": motivo,
        "titulo_pagina": texto_visible(titulo.group(1))[:200] if titulo else None,
        "siguiente_ruta": SIGUIENTE[tipo],
        "nota": "Un solo intento por política de la skill; no se reintenta.",
    })


# -------------------------------------------------------------------- pista

def _qs(u, *claves):
    q = urllib.parse.parse_qs(u.query)
    for k in claves:
        if q.get(k):
            return q[k][0]
    return None


def analizar_url(url):
    u = urllib.parse.urlparse(url.strip())
    host = u.netloc.lower()
    path = urllib.parse.unquote(u.path)
    r = {"url": url, "sitio": host, "familia": None, "es_ats": False, "id_vacante": None,
         "puesto": None, "empresa": None, "ubicacion": None, "url_canonica": None,
         "api_detalle": None, "confianza_extraccion": "baja"}

    if "linkedin.com" in host:
        r["familia"] = "linkedin"
        m = re.search(r"/jobs/view/(?:(.+)-)?(\d{6,})", path)
        jid = m.group(2) if m else _qs(u, "currentJobId")
        r["id_vacante"] = jid
        if m and m.group(1):
            slug = m.group(1)
            if "-at-" in slug:
                p, e = slug.rsplit("-at-", 1)
                r["puesto"], r["empresa"] = slug_a_texto(p), slug_a_texto(e)
                r["confianza_extraccion"] = "media"
            else:
                r["puesto"] = slug_a_texto(slug)
        if jid:
            r["url_canonica"] = f"https://www.linkedin.com/jobs/view/{jid}"

    elif "glassdoor." in host:
        r["familia"] = "glassdoor_indeed"
        r["id_vacante"] = _qs(u, "jl", "jobListingId")
        m = re.search(r"/job-listing/(.+?)-JV_([^/]+?)\.htm", path)
        if m:
            slug, codigos = m.group(1), m.group(2)
            ko = re.search(r"KO(\d+),(\d+)", codigos)
            ke = re.search(r"KE(\d+),(\d+)", codigos)
            if ko:
                r["puesto"] = slug_a_texto(slug[int(ko.group(1)):int(ko.group(2))])
            if ke:
                r["empresa"] = slug_a_texto(slug[int(ke.group(1)):int(ke.group(2))])
            if not ko and not ke:
                r["puesto"] = slug_a_texto(slug)
            r["confianza_extraccion"] = "alta" if ko and ke else "media"
        if r["id_vacante"]:
            r["url_canonica"] = f"{u.scheme or 'https'}://{u.netloc}{u.path}?jl={r['id_vacante']}"

    elif "indeed." in host:
        r["familia"] = "glassdoor_indeed"
        jk = _qs(u, "jk", "vjk")
        r["id_vacante"] = jk
        if jk:
            r["url_canonica"] = f"https://{u.netloc}/viewjob?jk={jk}"

    elif "occ.com.mx" in host:
        r["familia"] = "occ"
        m = re.search(r"/empleo/oferta/(\d+)-([^/]+)", path)
        if m:
            r["id_vacante"], r["puesto"] = m.group(1), slug_a_texto(m.group(2))
            r["confianza_extraccion"] = "media"
            r["url_canonica"] = f"https://www.occ.com.mx/empleo/oferta/{m.group(1)}-{m.group(2)}/"

    elif "computrabajo." in host:
        r["familia"] = "computrabajo"
        m = re.search(r"oferta-de-trabajo-de-(.+)-([0-9A-F]{16,})", path)
        if m:
            slug = m.group(1)
            r["id_vacante"] = m.group(2)
            if "-en-" in slug:
                p, lugar = slug.rsplit("-en-", 1)
                r["puesto"], r["ubicacion"] = slug_a_texto(p), slug_a_texto(lugar)
            else:
                r["puesto"] = slug_a_texto(slug)
            r["confianza_extraccion"] = "media"
            r["url_canonica"] = f"https://{u.netloc}{u.path}"

    elif "bumeran." in host:
        r["familia"] = "bumeran"
        m = re.search(r"/empleos/(.+)-(\d+)\.html", path)
        if m:
            r["puesto"], r["id_vacante"] = slug_a_texto(m.group(1)), m.group(2)
            r["url_canonica"] = f"https://{u.netloc}{u.path}"

    elif "myworkdayjobs.com" in host:
        r["familia"], r["es_ats"] = "workday", True
        tenant, wd = host.split(".")[0], host.split(".")[1]
        m = re.search(r"^/(?:[a-z]{2}-[A-Z]{2}/)?([^/]+)/job/([^/]+)/([^/]+)_([A-Za-z0-9-]+)/?$", path)
        if m:
            site, lugar, titulo, req = m.groups()
            r.update(id_vacante=req, puesto=slug_a_texto(titulo), ubicacion=slug_a_texto(lugar),
                     empresa=tenant, confianza_extraccion="alta")
            externo = f"/job/{lugar}/{titulo}_{req}"
            r["url_canonica"] = f"https://{host}/{site}{externo}"
            r["api_detalle"] = f"https://{host}/wday/cxs/{tenant}/{site}{externo}"
        r["workday"] = {"tenant": tenant, "wd": wd}

    elif "greenhouse.io" in host:
        r["familia"], r["es_ats"] = "greenhouse", True
        m = re.search(r"/([^/]+)/jobs/(\d+)", path)
        if m:
            token, jid = m.groups()
            r.update(empresa=token, id_vacante=jid, confianza_extraccion="alta",
                     url_canonica=f"https://job-boards.greenhouse.io/{token}/jobs/{jid}",
                     api_detalle=f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs/{jid}")
        elif _qs(u, "gh_jid"):
            r["id_vacante"] = _qs(u, "gh_jid")

    elif "lever.co" in host:
        r["familia"], r["es_ats"] = "lever", True
        m = re.search(r"/([^/]+)/([0-9a-f-]{36})", path)
        if m:
            co, jid = m.groups()
            r.update(empresa=co, id_vacante=jid, confianza_extraccion="alta",
                     url_canonica=f"https://jobs.lever.co/{co}/{jid}",
                     api_detalle=f"https://api.lever.co/v0/postings/{co}/{jid}")

    elif "smartrecruiters.com" in host:
        r["familia"], r["es_ats"] = "smartrecruiters", True
        m = re.search(r"/([^/]+)/(\d{6,})(?:-([^/]+))?", path)
        if m:
            co, jid, slug = m.groups()
            r.update(empresa=co, id_vacante=jid, confianza_extraccion="alta",
                     puesto=slug_a_texto(slug) if slug else None,
                     url_canonica=f"https://jobs.smartrecruiters.com/{co}/{jid}",
                     api_detalle=f"https://api.smartrecruiters.com/v1/companies/{co}/postings/{jid}")

    elif "ashbyhq.com" in host:
        r["familia"], r["es_ats"] = "ashby", True
        m = re.search(r"/([^/]+)/([0-9a-f-]{36})", path)
        if m:
            org, jid = m.groups()
            r.update(empresa=org, id_vacante=jid, confianza_extraccion="alta",
                     url_canonica=f"https://jobs.ashbyhq.com/{org}/{jid}")

    elif "oraclecloud.com" in host:
        r["familia"], r["es_ats"] = "oracle", True
        m = re.search(r"/sites/([^/]+)/job/(\d+)", path)
        if m:
            site, jid = m.groups()
            r.update(id_vacante=jid, confianza_extraccion="alta",
                     url_canonica=f"https://{host}/hcmUI/CandidateExperience/en/sites/{site}/job/{jid}",
                     api_detalle=(f"https://{host}/hcmRestApi/resources/latest/recruitingCEJobRequisitionDetails"
                                  f"?expand=all&onlyData=true&finder=ById;Id=%22{jid}%22,siteNumber={site}"))

    elif "successfactors" in host or "jobs.sap.com" in host:
        r["familia"], r["es_ats"] = "successfactors", True
        r["empresa"] = _qs(u, "company")
        m = re.search(r"/job/([^/]+)/(\d+)/?", path)
        if m:
            r["puesto"], r["id_vacante"] = slug_a_texto(m.group(1)), m.group(2)

    elif "taleo.net" in host:
        r["familia"], r["es_ats"] = "taleo", True
        r["id_vacante"] = _qs(u, "job")
        r["empresa"] = host.split(".")[0]

    elif "icims.com" in host:
        r["familia"], r["es_ats"] = "icims", True
        m = re.search(r"/jobs/(\d+)/([^/]+)/job", path)
        if m:
            r["id_vacante"], r["puesto"] = m.group(1), slug_a_texto(m.group(2))

    elif "eightfold.ai" in host:
        r["familia"], r["es_ats"] = "eightfold", True
        r["id_vacante"] = _qs(u, "pid")

    elif "amazon.jobs" in host:
        r["familia"], r["es_ats"] = "amazon", True
        m = re.search(r"/jobs/(\d+)(?:/([^/]+))?", path)
        if m:
            r["id_vacante"] = m.group(1)
            r["puesto"] = slug_a_texto(m.group(2)) if m.group(2) else None
            r["empresa"] = "Amazon"

    r["busquedas_sugeridas"] = busquedas_para(r)
    return r


PORTALES = ["myworkdayjobs", "successfactors", "smartrecruiters", "greenhouse", "lever", "oraclecloud", "careers"]


def busquedas_para(r):
    p, e, jid = r.get("puesto"), r.get("empresa"), r.get("id_vacante")
    q = []
    if p and e:
        q.append(f'"{p}" "{e}"')
        if not r["es_ats"]:
            q += [f'"{p}" "{e}" {portal}' for portal in PORTALES]
        q.append(f'"{e}" careers {p}')
    elif p:
        q.append(f'"{p}" México vacante')
        q.append(f'"{p}" myworkdayjobs México')
    if jid and r["familia"] in ("linkedin", "glassdoor_indeed", "occ"):
        q.append(f'Gmail: busca "{jid}" (aparece en el link de la alerta de empleo)')
    if r["familia"] == "glassdoor_indeed" and not p:
        q.append("Indeed no pone el puesto en la URL: busca la alerta en Gmail o pídele a Arith el título")
    return q


def cmd_pista(args):
    salida(analizar_url(args.url))


# ------------------------------------------------------------------- nivel

EXCLUIR_TITULO = [r"\bsenior\b", r"\bsr\b\.?", r"\blead\b", r"\blider\b", r"\bprincipal\b", r"\bstaff\b",
                  r"\bmanager\b", r"\bgerente\b", r"\bsupervisor\b", r"\bjefe\b", r"\bdirector\b",
                  r"\bhead of\b", r"\bespecialista\b", r"\bspecialist\b", r"\bsemi ?senior\b", r"\bssr\b",
                  r"\b(engineer|ingeniero|ing)\.? (iii|iv|v|3|4|5)\b", r"\barchitect\b", r"\barquitecto\b"]
PRACTICAS = [r"\bintern\b", r"\binternship\b", r"\bbecari[oa]\b", r"\bpracticante\b", r"\bpracticas\b",
             r"\bco-?op\b", r"\bresidencia\b"]
TECNICO = [r"^tecnico\b", r"\btechnician\b"]
INCLUIR = [r"\bjr\b\.?", r"\bjunior\b", r"\btrainee\b", r"\bgraduate\b", r"\bnew grad\b", r"\brecien egresad[oa]\b",
           r"\bentry[- ]level\b", r"\b(engineer|ingeniero) (i|1)\b", r"\bassociate (engineer|controls|automation)\b",
           r"\bingeniero a\b", r"\bearly career\b", r"\bsin experiencia\b", r"\bpasante\b"]
ESTIRAR_TITULO = [r"\b(engineer|ingeniero|ing)\.? (ii|2)\b"]

RE_RANGO = re.compile(r"(\d{1,2})\s*(?:-|–|a|to)\s*(\d{1,2})\s*(?:anos|years|yrs|ano|year)")
RE_MIN = re.compile(r"(\d{1,2})\s*\+?\s*(?:anos|years|yrs|ano|year)(?:\s+(?:de|of))?\s+(?:experiencia|experience)")
RE_MIN2 = re.compile(r"(?:minimo|minimum|at least|al menos)\s+(\d{1,2})\s*(?:anos|years|ano|year)")


def experiencia_minima(texto):
    t = norm(texto)
    mins = [int(a) for a, _ in RE_RANGO.findall(t)]
    mins += [int(x) for x in RE_MIN.findall(t)]
    mins += [int(x) for x in RE_MIN2.findall(t)]
    mins = [m for m in mins if m < 25]
    return min(mins) if mins else None


def clasificar_nivel(titulo, texto=""):
    t = norm(titulo)
    if any(re.search(p, t) for p in PRACTICAS):
        return {"nivel": "excluir", "motivo": "prácticas/becario: solo estudiantes inscritos"}
    if any(re.search(p, t) for p in TECNICO):
        return {"nivel": "excluir", "motivo": "puesto de técnico, no de ingeniero"}
    if any(re.search(p, t) for p in EXCLUIR_TITULO):
        return {"nivel": "excluir", "motivo": "título de nivel superior"}
    exp = experiencia_minima(texto) if texto else None
    if exp is not None and exp >= 3:
        return {"nivel": "excluir", "motivo": f"pide {exp}+ años"}
    if any(re.search(p, t) for p in ESTIRAR_TITULO):
        return {"nivel": "estirar", "motivo": "nivel II en el título"}
    if exp in (1, 2):
        return {"nivel": "estirar", "motivo": f"pide {exp} año(s) mínimo"}
    if any(re.search(p, t) for p in INCLUIR) or exp == 0:
        return {"nivel": "incluir", "motivo": "nivel de entrada" + (" (0 años)" if exp == 0 else "")}
    return {"nivel": "revisar", "motivo": "el título no dice el nivel; leer requisitos"}


def cmd_nivel(args):
    salida(clasificar_nivel(args.titulo, args.texto or ""))


# --------------------------------------------------------------------- ATS
# Cada parse_* recibe el JSON ya descargado y devuelve vacantes normalizadas.

def vacante(empresa, puesto, ubicacion, link, fecha, fuente, jid):
    return {"empresa": empresa, "puesto": (puesto or "").strip(), "ubicacion": (ubicacion or "").strip(),
            "link": link, "fecha": fecha, "fuente": fuente, "ruta": "ATS", "id": str(jid) if jid else None}


def parse_greenhouse(data, empresa, token):
    return [vacante(empresa, j.get("title"), (j.get("location") or {}).get("name"), j.get("absolute_url"),
                    j.get("first_published") or j.get("updated_at"), "greenhouse", j.get("id"))
            for j in data.get("jobs", [])]


def parse_lever(data, empresa, co):
    out = []
    for j in data:
        cat = j.get("categories") or {}
        lugar = cat.get("location") or ", ".join(cat.get("allLocations") or [])
        ms = j.get("createdAt")
        fecha = time.strftime("%Y-%m-%d", time.gmtime(ms / 1000)) if ms else None
        out.append(vacante(empresa, j.get("text"), lugar, j.get("hostedUrl"), fecha, "lever", j.get("id")))
    return out


def parse_smartrecruiters(data, empresa, co):
    out = []
    for j in data.get("content", []):
        loc = j.get("location") or {}
        lugar = loc.get("fullLocation") or ", ".join(x for x in (loc.get("city"), loc.get("region"), loc.get("country")) if x)
        out.append(vacante(empresa, j.get("name"), lugar, f"https://jobs.smartrecruiters.com/{co}/{j.get('id')}",
                           (j.get("releasedDate") or "")[:10] or None, "smartrecruiters", j.get("id")))
    return out


def parse_ashby(data, empresa, org):
    out = []
    for j in data.get("jobs", []):
        lugares = [j.get("location") or ""] + [s.get("location", "") for s in j.get("secondaryLocations") or []]
        out.append(vacante(empresa, j.get("title"), "; ".join(x for x in lugares if x), j.get("jobUrl"),
                           (j.get("publishedAt") or "")[:10] or None, "ashby", j.get("id")))
    return out


def parse_workday(data, empresa, base, site):
    return [vacante(empresa, j.get("title"), j.get("locationsText"), f"{base}/{site}{j.get('externalPath', '')}",
                    j.get("postedOn"), "workday", (j.get("bulletFields") or [None])[0])
            for j in data.get("jobPostings", [])]


def parse_amazon(data, empresa="Amazon"):
    return [vacante(empresa, j.get("title"), j.get("normalized_location") or j.get("location"),
                    "https://www.amazon.jobs" + (j.get("job_path") or ""), j.get("posted_date"), "amazon",
                    j.get("id_icims") or j.get("id"))
            for j in data.get("jobs", [])]


def parse_oracle(data, empresa, host, site):
    out = []
    for item in data.get("items", []):
        for j in item.get("requisitionList", []):
            out.append(vacante(empresa, j.get("Title"), j.get("PrimaryLocation"),
                               f"https://{host}/hcmUI/CandidateExperience/en/sites/{site}/job/{j.get('Id')}",
                               j.get("PostedDate"), "oracle", j.get("Id")))
    return out


def workday_partes(url):
    u = urllib.parse.urlparse(url)
    tenant = u.netloc.split(".")[0]
    partes = [p for p in u.path.split("/") if p]
    if partes and re.fullmatch(r"[a-z]{2}-[A-Z]{2}", partes[0]):
        partes = partes[1:]
    if not partes:
        raise ValueError("URL de Workday sin nombre de sitio: https://<tenant>.wdN.myworkdayjobs.com/<sitio>")
    return f"https://{u.netloc}", tenant, partes[0]


def consultar(cfg, consultas, paginas):
    """Descarga las vacantes de un portal. Devuelve lista de vacantes sin filtrar por lugar."""
    ats, nombre = cfg["ats"], cfg.get("nombre", "")
    if ats == "greenhouse":
        return parse_greenhouse(fetch_json(f"https://boards-api.greenhouse.io/v1/boards/{cfg['id']}/jobs"), nombre, cfg["id"])
    if ats == "lever":
        return parse_lever(fetch_json(f"https://api.lever.co/v0/postings/{cfg['id']}?mode=json"), nombre, cfg["id"])
    if ats == "ashby":
        return parse_ashby(fetch_json(f"https://api.ashbyhq.com/posting-api/job-board/{cfg['id']}"), nombre, cfg["id"])
    if ats == "smartrecruiters":
        out = []
        for q in consultas or [""]:
            for pag in range(paginas):
                params = {"limit": 100, "offset": pag * 100}
                if q:
                    params["q"] = q
                if cfg.get("pais"):
                    params["country"] = cfg["pais"]
                data = fetch_json(f"https://api.smartrecruiters.com/v1/companies/{cfg['id']}/postings?"
                                  + urllib.parse.urlencode(params))
                out += parse_smartrecruiters(data, nombre, cfg["id"])
                if (pag + 1) * 100 >= data.get("totalFound", 0):
                    break
        return out
    if ats == "workday":
        base, tenant, site = workday_partes(cfg["url"])
        out = []
        for q in consultas or [""]:
            for pag in range(paginas):
                cuerpo = {"appliedFacets": {}, "limit": 20, "offset": pag * 20, "searchText": q}
                data = fetch_json(f"{base}/wday/cxs/{tenant}/{site}/jobs", data=cuerpo)
                out += parse_workday(data, nombre, base, site)
                if (pag + 1) * 20 >= data.get("total", 0):
                    break
        return out
    if ats == "amazon":
        out = []
        for q in consultas or [""]:
            params = {"base_query": q, "loc_query": cfg.get("lugar", "Mexico"), "result_limit": 100}
            out += parse_amazon(fetch_json("https://www.amazon.jobs/en/search.json?" + urllib.parse.urlencode(params)), nombre or "Amazon")
        return out
    if ats == "oracle":
        out = []
        for q in consultas or [""]:
            finder = f'findReqs;siteNumber={cfg["site"]},keyword="{q}",limit=100,offset=0'
            url = (f"https://{cfg['host']}/hcmRestApi/resources/latest/recruitingCEJobRequisitions?onlyData=true"
                   f"&expand=requisitionList&finder=" + urllib.parse.quote(finder, safe=";=,"))
            out += parse_oracle(fetch_json(url), nombre, cfg["host"], cfg["site"])
        return out
    raise ValueError(f"ATS sin endpoint público soportado: {ats}")


AMBIGUO = re.compile(r"^\d+\s+(locations|ubicaciones)$", re.I)


def filtrar(vacantes, claves, lugares):
    claves = [norm(c) for c in claves if c.strip()]
    lugares = [norm(l) for l in lugares if l.strip()]
    vistos, out = set(), []
    for v in vacantes:
        llave = (v["fuente"], v["id"] or v["link"])
        if llave in vistos:
            continue
        vistos.add(llave)
        titulo = norm(v["puesto"])
        if claves and not any(c in titulo for c in claves):
            continue
        lugar = norm(v["ubicacion"])
        if lugares and not any(l in lugar for l in lugares):
            if AMBIGUO.match(v["ubicacion"] or "") or not lugar:
                v["ubicacion_ambigua"] = True
            else:
                continue
        v.update(clasificar_nivel(v["puesto"]))
        v["confianza"] = "alta"
        out.append(v)
    orden = {"incluir": 0, "estirar": 1, "revisar": 2, "excluir": 3}
    return sorted(out, key=lambda v: orden[v["nivel"]])


def cmd_ats(args):
    portales = []
    pendientes = []
    if args.empresas:
        with open(args.empresas, encoding="utf-8") as f:
            for e in json.load(f)["empresas"]:
                if args.solo and norm(args.solo) not in norm(e["nombre"]):
                    continue
                listo = e.get("ats") in ("greenhouse", "lever", "ashby", "smartrecruiters", "amazon") and (e.get("id") or e["ats"] == "amazon")
                listo = listo or (e.get("ats") == "workday" and e.get("url"))
                listo = listo or (e.get("ats") == "oracle" and e.get("host") and e.get("site"))
                if listo and e.get("confianza") != "descubrir":
                    portales.append(e)
                else:
                    pendientes.append({"nombre": e["nombre"], "pista": e.get("pista") or e.get("portal")})
    for ats in ("greenhouse", "lever", "smartrecruiters", "ashby"):
        for ident in getattr(args, ats) or []:
            portales.append({"nombre": ident, "ats": ats, "id": ident})
    for url in args.workday or []:
        portales.append({"nombre": urllib.parse.urlparse(url).netloc.split(".")[0], "ats": "workday", "url": url})

    claves = [c.strip() for c in (args.q or "").split(",") if c.strip()]
    lugares = [l.strip() for l in (args.lugar or "").split(",") if l.strip()]
    resultados, errores = [], []
    for p in portales[: args.max_empresas]:
        try:
            # Greenhouse, Lever y Ashby devuelven todo el tablero de una vez; los demás buscan por palabra clave
            crudo = consultar(p, claves[: args.max_consultas], args.paginas)
            resultados += filtrar(crudo, claves, lugares)
        except Exception as e:
            errores.append({"empresa": p.get("nombre"), "ats": p.get("ats"), "error": str(e)[:300]})
    salida({
        "vacantes": resultados,
        "total": len(resultados),
        "errores": errores,
        "pendientes_descubrir": pendientes,
        "nota": ("Errores con HTTP None = el entorno no alcanza ese dominio; usa el lector web. "
                 "HTTP 403/429 = el portal bloquea: no reintentes, usa otra ruta."),
    })


# ------------------------------------------------------------------ dedupe

PESO_RUTA = {"ATS": 0, "pagina": 1, "Gmail": 2, "buscador": 3, "bolsa": 4, "archivo": 5, "Arith": 1}
PESO_CONF = {"alta": 0, "media": 1, "baja": 2}
RUIDO = re.compile(r"\b(jr|junior|sr|senior|i|ii|iii|trainee|mexico|mx|hibrido|hybrid|remoto|remote)\b")
SUFIJOS = re.compile(r"\b(s\.?a\.?(\s?de\s?c\.?v\.?)?|inc|llc|ltd|gmbh|corp|corporation|company|co|mexico|group|grupo)\b\.?")


def llave_dedupe(v):
    emp = SUFIJOS.sub(" ", norm(v.get("empresa")))
    pue = RUIDO.sub(" ", re.sub(r"[^a-z0-9 ]", " ", norm(v.get("puesto"))))
    ciu = re.split(r"[,;/(-]", norm(v.get("ubicacion")) or "-")[0]
    return (re.sub(r"\s+", " ", emp).strip(), re.sub(r"\s+", " ", pue).strip(), ciu.strip())


def deduplicar(vacantes):
    grupos = {}
    for v in vacantes:
        grupos.setdefault(llave_dedupe(v), []).append(v)
    out = []
    for grupo in grupos.values():
        grupo.sort(key=lambda v: (PESO_RUTA.get(v.get("ruta"), 9), PESO_CONF.get(v.get("confianza"), 9)))
        mejor = dict(grupo[0])
        otras = [{"ruta": v.get("ruta"), "link": v.get("link")} for v in grupo[1:] if v.get("link") != mejor.get("link")]
        if otras:
            mejor["otras_fuentes"] = otras
        rutas = {v.get("ruta") for v in grupo}
        if mejor.get("confianza") == "baja" and len(rutas) > 1:
            mejor["confianza"] = "media"  # vista por dos caminos independientes
        out.append(mejor)
    return out


def cmd_dedupe(args):
    with open(args.archivo, encoding="utf-8") as f:
        crudo = f.read().strip()
    if crudo.startswith("["):
        vacantes = json.loads(crudo)
    elif crudo.startswith("{") and '"vacantes"' in crudo[:200] and "\n{" not in crudo:
        vacantes = json.loads(crudo)["vacantes"]
    else:
        vacantes = [json.loads(l) for l in crudo.splitlines() if l.strip()]
    unidas = deduplicar(vacantes)
    salida({"entrada": len(vacantes), "salida": len(unidas), "vacantes": unidas})


# -------------------------------------------------------------------- main

def main(argv=None):
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("diagnosticar", help="clasifica el bloqueo de una URL (un intento)")
    p.add_argument("url")
    p.set_defaults(func=cmd_diagnosticar)

    p = sub.add_parser("pista", help="extrae datos y búsquedas sugeridas de una URL de vacante")
    p.add_argument("url")
    p.set_defaults(func=cmd_pista)

    p = sub.add_parser("ats", help="consulta portales públicos de empresas")
    p.add_argument("--empresas", help="JSON con la lista de empresas (scripts/empresas.json)")
    p.add_argument("--solo", help="solo la empresa cuyo nombre contenga este texto")
    p.add_argument("--greenhouse", action="append", metavar="TOKEN")
    p.add_argument("--lever", action="append", metavar="EMPRESA")
    p.add_argument("--smartrecruiters", action="append", metavar="ID")
    p.add_argument("--ashby", action="append", metavar="ORG")
    p.add_argument("--workday", action="append", metavar="URL")
    p.add_argument("--q", default="automation,automatizacion,controls,control,plc,commissioning,puesta en marcha,robot",
                   help="palabras clave separadas por coma (se buscan en el título)")
    p.add_argument("--lugar", default="", help="lugares separados por coma (p. ej. 'Mexico,México,Querétaro')")
    p.add_argument("--paginas", type=int, default=3)
    p.add_argument("--max-empresas", type=int, default=12)
    p.add_argument("--max-consultas", type=int, default=4, help="palabras clave enviadas como búsqueda al portal")
    p.set_defaults(func=cmd_ats)

    p = sub.add_parser("nivel", help="regla de nivel Jr de Arith")
    p.add_argument("titulo")
    p.add_argument("--texto", help="requisitos o descripción de la vacante")
    p.set_defaults(func=cmd_nivel)

    p = sub.add_parser("dedupe", help="une duplicados (JSON, JSONL o salida de 'ats')")
    p.add_argument("archivo")
    p.set_defaults(func=cmd_dedupe)

    args = ap.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
