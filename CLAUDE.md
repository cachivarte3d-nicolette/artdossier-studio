# Panel de Cachivarte / ArtDossier Studio

App de una sola página (`index.html`, HTML + CSS + JS sin dependencias) en español. Lee `HANDOFF.md` al empezar.

## Reglas del proyecto
- Todo el texto visible va en español; escribe con lenguaje neutro de género («la persona artista»).
- Nunca uses `innerHTML` con datos de la persona usuaria: construye nodos con `make()`/`textContent`.
- No uses `confirm()`, `alert()` ni `window.print()` directo: dentro del artefacto no funcionan. Usa `askConfirm()` y `exportDocument()`.
- Las imágenes se guardan como `data:` (local) o `asset:<id>` (artefacto); muéstralas siempre con `imageSrc()`.
- El dossier (`state`) y el estudio (`studioData`) se guardan por separado; los precios y datos privados no entran al PDF salvo opción explícita.
- El documento privado del artefacto admite máx. 256 KiB: nunca guardes imágenes `data:` en él (`cloudPayload()`).
- Material VALA, cursos y chats de WhatsApp: solo como inspiración; no copiar textos, imágenes, diseños, firmas ni listas de contactos.
- Convocatorias: nunca presentar una como vigente sin bases verificadas por la persona.

## Probar y publicar
- Tras cualquier cambio: `node pruebas/p0-test.js`, `ui-test.js` y `vala-test.js` (ver `pruebas/README.md`).
- Artefacto: `python3 herramientas/construir-artefacto.py index.html <salida>.html` y publicar en la misma URL del HANDOFF.
