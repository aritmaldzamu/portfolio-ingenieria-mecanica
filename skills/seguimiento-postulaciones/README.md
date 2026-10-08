# seguimiento-postulaciones (skill de Claude)

Skill de Claude que lee tu Gmail y te dice cómo van tus postulaciones: confirmaciones, rechazos, entrevistas, pruebas técnicas, ofertas y las que no han contestado. Guarda todo en un documento de Claude, **"Seguimiento de postulaciones — Arith"**, que se actualiza en cada corrida: tabla por empresa, lo que tienes que hacer y un historial de cambios.

## Instalar

1. En claude.ai → **Configuración → Capacidades → Skills** → **Subir skill** → elige `seguimiento-postulaciones.zip` (contiene `seguimiento-postulaciones/SKILL.md`).
2. Asegúrate de tener conectados **Gmail** y **Claude Docs** (Configuración → Conectores).

## Usar

- `¿cómo van mis postulaciones?` — revisa desde la última vez y actualiza el documento.
- `revisión completa de mis postulaciones` — revisa los últimos 90 días.
- `¿qué pasó con Schneider?` — historia completa de una empresa.
- `apliqué a Siemens, Automation Engineer Jr` / `descarta KUKA` / `tuve entrevista con Festo` — actualiza el documento a mano.
- `escríbeme un correo de seguimiento para Bosch` — te lo redacta (no lo envía).

La primera vez crea el documento y revisa 90 días de correo; después solo revisa lo nuevo.

## Qué no hace

Solo lee tu correo: no envía, responde, archiva ni borra nada. Solo crea un borrador si se lo pides.

## Editar

Edita `SKILL.md` y vuelve a generar el zip desde la carpeta `skills/`:

```
python -c "import shutil; shutil.make_archive('seguimiento-postulaciones', 'zip', '.', 'seguimiento-postulaciones')"
```

Después sube el zip nuevo en claude.ai (reemplaza la versión anterior).
