# Pruebas de ArtDossier Studio / Panel de Cachivarte

Pruebas automáticas con Playwright (Chromium). No forman parte de la app.

```bash
node pruebas/p0-test.js index.html salida/              # PDF con 1, 5 y 15 obras, respaldo, recarga, recortes
TPL=catalogo node pruebas/p0-test.js index.html salida/ # lo mismo con otra plantilla
node pruebas/ui-test.js index.html salida/              # panel, confirmaciones, vista previa, guardado al salir, proyecto nuevo, móvil
node pruebas/vala-test.js index.html salida/            # tipos de documento, convocatorias, correo y certificados
```

Modo artefacto de claude.ai, simulado (espacio privado, imágenes en assets, descargas):

```bash
python3 -m http.server 8123
node pruebas/artefacto-test.js http://127.0.0.1:8123/ salida/proyecto-5.json salida/ [carpeta-con-html2canvas-y-jspdf]
```

`proyecto-5.json` lo genera `p0-test.js`. La carpeta de librerías es opcional: sirve cuando
cdnjs no es accesible desde la máquina de pruebas.

## Publicar el artefacto

```bash
python3 herramientas/construir-artefacto.py index.html salida/panel-cachivarte.html
```

El archivo resultante se publica como artefacto privado con las capacidades
`db`, `user`, `assets` y `downloads`.
