# Pruebas de ArtDossier Studio

Pruebas automáticas con Playwright (Chromium). No forman parte de la app publicada.

```bash
node pruebas/p0-test.js index.html salida/            # PDF con 1, 5 y 15 obras, respaldo, recarga, recortes
TPL=catalogo node pruebas/p0-test.js index.html salida/  # lo mismo con otra plantilla
node pruebas/ui-test.js index.html salida/            # borrar obra, revisión, guardado al salir, proyecto nuevo, móvil
```

`p0-test.js` falla visiblemente si alguna página del PDF recorta contenido (`clippedPages`)
o si alguna imagen no cargó antes de imprimir (`imagesNotLoaded`).
