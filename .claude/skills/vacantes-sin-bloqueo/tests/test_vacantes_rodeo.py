"""Pruebas sin red de scripts/vacantes_rodeo.py.  Ejecuta: python3 -m unittest discover tests"""

import io
import json
import os
import sys
import tempfile
import unittest
from contextlib import redirect_stdout
from unittest import mock

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "scripts"))
import vacantes_rodeo as vr  # noqa: E402


class TestPista(unittest.TestCase):
    def test_linkedin_slug(self):
        r = vr.analizar_url("https://mx.linkedin.com/jobs/view/ingeniero-de-automatizacion-jr-at-acme-industrial-4012345678?trk=abc")
        self.assertEqual(r["familia"], "linkedin")
        self.assertEqual(r["id_vacante"], "4012345678")
        self.assertEqual(r["puesto"], "ingeniero de automatizacion jr")
        self.assertEqual(r["empresa"], "acme industrial")
        self.assertEqual(r["url_canonica"], "https://www.linkedin.com/jobs/view/4012345678")

    def test_linkedin_current_job_id(self):
        r = vr.analizar_url("https://www.linkedin.com/jobs/search/?currentJobId=3999999999&keywords=plc")
        self.assertEqual(r["id_vacante"], "3999999999")

    def test_glassdoor_offsets(self):
        slug = "ingeniero-de-automatizacion-acme"
        ko = (0, len("ingeniero-de-automatizacion"))
        ke = (ko[1] + 1, len(slug))
        url = (f"https://www.glassdoor.com.mx/job-listing/{slug}-JV_IC2459044_KO{ko[0]},{ko[1]}"
               f"_KE{ke[0]},{ke[1]}.htm?jl=1009876543210&src=GD")
        r = vr.analizar_url(url)
        self.assertEqual(r["puesto"], "ingeniero de automatizacion")
        self.assertEqual(r["empresa"], "acme")
        self.assertEqual(r["id_vacante"], "1009876543210")
        self.assertEqual(r["confianza_extraccion"], "alta")
        self.assertNotIn("src=", r["url_canonica"])

    def test_indeed(self):
        r = vr.analizar_url("https://mx.indeed.com/rc/clk?jk=a1b2c3d4e5f6&from=vj")
        self.assertEqual(r["id_vacante"], "a1b2c3d4e5f6")
        self.assertEqual(r["url_canonica"], "https://mx.indeed.com/viewjob?jk=a1b2c3d4e5f6")
        self.assertTrue(any("Gmail" in q for q in r["busquedas_sugeridas"]))

    def test_workday(self):
        r = vr.analizar_url("https://acme.wd5.myworkdayjobs.com/en-US/Careers/job/Queretaro/Controls-Engineer-I_R12345")
        self.assertTrue(r["es_ats"])
        self.assertEqual(r["puesto"], "Controls Engineer I")
        self.assertEqual(r["ubicacion"], "Queretaro")
        self.assertEqual(r["id_vacante"], "R12345")
        self.assertEqual(r["api_detalle"],
                         "https://acme.wd5.myworkdayjobs.com/wday/cxs/acme/Careers/job/Queretaro/Controls-Engineer-I_R12345")

    def test_computrabajo(self):
        r = vr.analizar_url("https://mx.computrabajo.com/ofertas-de-trabajo/oferta-de-trabajo-de-ingeniero-de-control-plc-en-queretaro-1A2B3C4D5E6F7A8B9C0D")
        self.assertEqual(r["puesto"], "ingeniero de control plc")
        self.assertEqual(r["ubicacion"], "queretaro")

    def test_occ(self):
        r = vr.analizar_url("https://www.occ.com.mx/empleo/oferta/20123456-ingeniero-de-automatizacion-jr/")
        self.assertEqual(r["id_vacante"], "20123456")
        self.assertEqual(r["puesto"], "ingeniero de automatizacion jr")

    def test_greenhouse_y_smartrecruiters(self):
        g = vr.analizar_url("https://job-boards.greenhouse.io/acme/jobs/7654321")
        self.assertEqual(g["api_detalle"], "https://boards-api.greenhouse.io/v1/boards/acme/jobs/7654321")
        s = vr.analizar_url("https://jobs.smartrecruiters.com/BoschGroup/744000131931527-ingeniero-de-automatizacion")
        self.assertEqual(s["empresa"], "BoschGroup")
        self.assertEqual(s["puesto"], "ingeniero de automatizacion")

    def test_desconocido_no_truena(self):
        r = vr.analizar_url("https://ejemplo.com/empleo/123")
        self.assertIsNone(r["familia"])
        self.assertEqual(r["busquedas_sugeridas"], [])


class TestNivel(unittest.TestCase):
    def casos(self, pares):
        for titulo, texto, esperado in pares:
            with self.subTest(titulo=titulo, texto=texto):
                self.assertEqual(vr.clasificar_nivel(titulo, texto)["nivel"], esperado)

    def test_reglas(self):
        self.casos([
            ("Ingeniero de Automatización Jr", "", "incluir"),
            ("Controls Engineer I", "", "incluir"),
            ("Controls Engineer II", "", "estirar"),
            ("Controls Engineer III", "", "excluir"),
            ("Sr. Automation Engineer", "", "excluir"),
            ("Supervisor de mantenimiento", "", "excluir"),
            ("Becario de automatización", "", "excluir"),
            ("Técnico en automatización", "", "excluir"),
            ("Automation Engineer", "Requisitos: 0-2 años de experiencia en PLC", "incluir"),
            ("Automation Engineer", "1-2 years of experience", "estirar"),
            ("Automation Engineer", "Mínimo 3 años de experiencia", "excluir"),
            ("Ingeniero de Control Jr", "5+ years of experience", "excluir"),
            ("Commissioning Engineer", "", "revisar"),
            ("Programador PLC recién egresado", "", "incluir"),
        ])


class TestDiagnostico(unittest.TestCase):
    def test_tipos(self):
        largo = "<html><body>" + "<p>Responsabilidades del puesto de ingeniero.</p>" * 30 + "</body></html>"
        casos = [
            ((None, "u", "URLError"), "sin_red"),
            ((999, "u", ""), "bloqueo_bot"),
            ((403, "u", "<title>Just a moment...</title>"), "captcha"),
            ((403, "u", "Forbidden"), "bloqueo_bot"),
            ((429, "u", ""), "limite"),
            ((404, "u", ""), "no_existe"),
            ((200, "https://www.linkedin.com/authwall?x", ""), "login"),
            ((200, "u", "<html><script>app()</script><div id=root></div></html>"), "js_vacia"),
            ((200, "u", largo.replace("ingeniero", "This job is no longer available")), "no_existe"),
            ((200, "u", largo), "ok"),
            ((200, "u", '{"jobs": []}'), "ok"),
        ]
        for args, esperado in casos:
            with self.subTest(args=args[:2]):
                self.assertEqual(vr.clasificar_respuesta(*args)[0], esperado)


class TestATS(unittest.TestCase):
    def test_parsers(self):
        gh = vr.parse_greenhouse({"jobs": [{"id": 1, "title": "Controls Engineer", "location": {"name": "Monterrey, Mexico"},
                                            "absolute_url": "https://x/1", "updated_at": "2026-10-10"}]}, "Acme", "acme")
        self.assertEqual(gh[0]["ubicacion"], "Monterrey, Mexico")
        lv = vr.parse_lever([{"id": "u", "text": "Automation Engineer", "categories": {"location": "Querétaro"},
                              "hostedUrl": "https://jobs.lever.co/a/u", "createdAt": 1790000000000}], "A", "a")
        self.assertRegex(lv[0]["fecha"], r"^\d{4}-\d{2}-\d{2}$")
        sr = vr.parse_smartrecruiters({"content": [{"id": "9", "name": "Ingeniero PLC", "releasedDate": "2026-10-01T00:00:00Z",
                                                    "location": {"city": "Toluca", "country": "mx"}}]}, "Bosch", "BoschGroup")
        self.assertEqual(sr[0]["link"], "https://jobs.smartrecruiters.com/BoschGroup/9")
        wd = vr.parse_workday({"jobPostings": [{"title": "Controls Engineer I", "locationsText": "2 Locations",
                                                "externalPath": "/job/Silao/Controls-Engineer-I_R1", "postedOn": "Posted Today",
                                                "bulletFields": ["R1"]}]}, "GM", "https://gm.wd5.myworkdayjobs.com", "Careers")
        self.assertEqual(wd[0]["link"], "https://gm.wd5.myworkdayjobs.com/Careers/job/Silao/Controls-Engineer-I_R1")

    def test_filtrar(self):
        vac = [
            vr.vacante("A", "Controls Engineer I", "Querétaro, México", "l1", None, "workday", "1"),
            vr.vacante("A", "Senior Controls Engineer", "Querétaro, México", "l2", None, "workday", "2"),
            vr.vacante("A", "Accountant", "Querétaro, México", "l3", None, "workday", "3"),
            vr.vacante("A", "Automation Engineer", "Detroit, MI", "l4", None, "workday", "4"),
            vr.vacante("A", "Automation Engineer Jr", "2 Locations", "l5", None, "workday", "5"),
            vr.vacante("A", "Controls Engineer I", "Querétaro, México", "l1", None, "workday", "1"),  # repetida
        ]
        out = vr.filtrar(vac, ["controls", "automation"], ["mexico"])
        ids = [v["id"] for v in out]
        self.assertEqual(sorted(ids), ["1", "2", "5"])
        self.assertTrue(next(v for v in out if v["id"] == "5")["ubicacion_ambigua"])
        self.assertEqual(out[-1]["nivel"], "excluir")

    def test_workday_partes(self):
        self.assertEqual(vr.workday_partes("https://gm.wd5.myworkdayjobs.com/es-MX/Careers_GM"),
                         ("https://gm.wd5.myworkdayjobs.com", "gm", "Careers_GM"))
        with self.assertRaises(ValueError):
            vr.workday_partes("https://gm.wd5.myworkdayjobs.com/")

    def test_cmd_ats_con_empresas_json(self):
        ruta = os.path.join(os.path.dirname(__file__), "..", "scripts", "empresas.json")

        def falso(url, data=None):
            if "smartrecruiters" in url:
                return {"totalFound": 1, "content": [{"id": "1", "name": "Ingeniero de Automatización Jr",
                                                      "location": {"city": "Toluca", "country": "México"}}]}
            raise RuntimeError("HTTP None: sin red")

        buf = io.StringIO()
        with mock.patch.object(vr, "fetch_json", side_effect=falso), redirect_stdout(buf):
            vr.main(["ats", "--empresas", ruta, "--lugar", "Mexico,México", "--max-consultas", "1"])
        res = json.loads(buf.getvalue())
        self.assertGreaterEqual(res["total"], 1)
        self.assertTrue(all(v["fuente"] == "smartrecruiters" for v in res["vacantes"]))
        self.assertTrue(any(e["empresa"] == "General Motors" for e in res["errores"]))
        self.assertTrue(any("Rockwell" in p["nombre"] for p in res["pendientes_descubrir"]))


class TestDedupe(unittest.TestCase):
    def test_une_y_prefiere_ats(self):
        vac = [
            {"empresa": "Acme S.A. de C.V.", "puesto": "Ingeniero de Automatización Jr", "ubicacion": "Querétaro, Qro.",
             "link": "https://linkedin/1", "ruta": "Gmail", "confianza": "media"},
            {"empresa": "ACME", "puesto": "Ingeniero de automatizacion", "ubicacion": "Queretaro",
             "link": "https://acme.wd5.myworkdayjobs.com/x", "ruta": "ATS", "confianza": "alta"},
            {"empresa": "Otra", "puesto": "Controls Engineer", "ubicacion": "Monterrey",
             "link": "https://g/2", "ruta": "buscador", "confianza": "baja"},
        ]
        out = vr.deduplicar(vac)
        self.assertEqual(len(out), 2)
        acme = next(v for v in out if "acme" in v["link"])
        self.assertEqual(acme["ruta"], "ATS")
        self.assertEqual(acme["otras_fuentes"][0]["ruta"], "Gmail")

    def test_cmd_dedupe_jsonl(self):
        with tempfile.NamedTemporaryFile("w", suffix=".jsonl", delete=False, encoding="utf-8") as f:
            f.write(json.dumps({"empresa": "A", "puesto": "PLC Jr", "ubicacion": "X", "link": "1", "ruta": "Gmail"}) + "\n")
            f.write(json.dumps({"empresa": "A", "puesto": "PLC", "ubicacion": "X", "link": "2", "ruta": "ATS"}) + "\n")
        buf = io.StringIO()
        with redirect_stdout(buf):
            vr.main(["dedupe", f.name])
        os.unlink(f.name)
        res = json.loads(buf.getvalue())
        self.assertEqual((res["entrada"], res["salida"]), (2, 1))
        self.assertEqual(res["vacantes"][0]["link"], "2")


if __name__ == "__main__":
    unittest.main()
