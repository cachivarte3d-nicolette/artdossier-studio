"""Genera la versión de artefacto (claude.ai) a partir de index.html.

El visor de artefactos envuelve la página en su propio <!doctype>/<html>/<head>/<body>,
así que aquí se quitan esas etiquetas y se dejan <title>, <meta>, <style>, el contenido
y el <script> tal cual. El código es el mismo: la app detecta sola si corre como artefacto.

Uso: python3 herramientas/construir-artefacto.py index.html salida/panel-cachivarte.html
"""
import re
import sys

source, target = sys.argv[1], sys.argv[2]
html = open(source, encoding='utf-8').read()

head = re.search(r'<head>(.*?)</head>', html, re.S).group(1)
body_match = re.search(r'<body([^>]*)>(.*)</body>', html, re.S)
body_attrs, body = body_match.group(1), body_match.group(2)

# Del <head> se conservan el título, la descripción y los estilos; el visor ya pone charset y viewport.
keep = [m.group(0) for m in re.finditer(r'<title>.*?</title>|<meta name="(?:description|robots)"[^>]*>|<style>.*?</style>', head, re.S)]
view = re.search(r'data-view="([^"]+)"', body_attrs)
boot = f'<script>document.body.dataset.view = "{view.group(1)}";</script>\n' if view else ''

open(target, 'w', encoding='utf-8').write('\n'.join(keep) + '\n' + boot + body.strip() + '\n')
print(f'{target}: {len(open(target, encoding="utf-8").read()) // 1024} KB')
