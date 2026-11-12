# HANDOFF — Panel de Cachivarte / ArtDossier Studio (12 nov 2026)

**Estado:** P0 + panel + 4 ideas VALA terminados y probados; el repo de GitHub fue borrado y este ZIP es la copia completa (con historial git).

## Hecho
- `index.html` único: panel (`#inicio`, `#convocatorias`, `#estudio`) + ArtDossier (`#configurar`…`#vista-previa`). `artdossier/index.html` solo redirige.
- P0: PDF sin recortes, imágenes reducidas a 2400 px, confirmaciones propias, guardado al salir, proyecto nuevo, revisión antes de exportar.
- Tipos de documento (dossier, portafolio, catálogo, propuesta), convocatorias con verificación de bases, correo de presentación, certificados de autenticidad.
- Modo artefacto privado: https://claude.ai/artifact/2ABBi2bXtAFjobw4UZzFLY (v2; capacidades db, user, assets, downloads).

## Decisiones
- Una sola página con vistas: dentro de un artefacto una segunda página podría no recibir capacidades.
- Datos del estudio (convocatorias, certificados) separados del dossier: «proyecto nuevo» no los borra.
- Ideas VALA tomadas solo del análisis del kit (`02_GUIA_MATERIAL_VALA.md`), sin copiar material de terceros.

## Pendiente (en orden)
1. Decidir dónde vive el código: repo privado nuevo o solo local.
2. Revisar el material VALA original (no lo vi) y ajustar las ideas.
3. Dossier bilingüe y explorador de espacios/ferias (con verificación de fuentes).
4. Mi estudio: calculadora de precios (fórmula en `datos/modulos_estudio_artistico.json` del kit), inventario.
5. P1: plantillas más distintas y un ejemplo ficticio completo por disciplina.

## Supuestos sin confirmar
- PDF del artefacto (html2canvas 1.4.1 + jsPDF 2.5.1 desde cdnjs) solo probado en simulación.
- La usuaria aún no probó convocatorias ni certificados en el artefacto real.

## Cómo verificar
```bash
node pruebas/p0-test.js index.html salida/
node pruebas/ui-test.js index.html salida/
node pruebas/vala-test.js index.html salida/
```
Modo artefacto: ver `pruebas/README.md`. Publicar: `python3 herramientas/construir-artefacto.py index.html salida/panel-cachivarte.html`.
