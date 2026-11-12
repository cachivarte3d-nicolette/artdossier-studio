// Prueba de interacción: panel, confirmaciones propias, revisión, guardado al salir, proyecto nuevo y móvil.
// Uso: node pruebas/ui-test.js index.html salida/
const { chromium, devices } = require('playwright');
const path = require('path');
const [file, out = '.'] = process.argv.slice(2);
const url = 'file://' + path.resolve(file);

(async () => {
  const browser = await chromium.launch();
  const log = [];
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const p = await context.newPage();
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('dialog', (d) => { errors.push('diálogo nativo inesperado: ' + d.message()); d.dismiss(); });
  const answer = async (ok) => { await p.waitForSelector('#confirmDialog[open]'); await p.click(ok ? '#confirmOk' : '#confirmCancel'); };

  await p.goto(url);
  log.push('vista inicial: ' + (await p.getAttribute('body', 'data-view')) + ' | botón: ' + (await p.textContent('#pOpen')));
  await p.click('.p-module[href="#configurar"]');
  log.push('tras abrir módulo: ' + (await p.getAttribute('body', 'data-view')));
  await p.click('[data-tab="portada"]'); await p.fill('#artistName', 'Ana Prueba');
  await p.click('[data-tab="obras"]'); await p.click('#addWorkButton'); await p.fill('.work-editor input', 'Pieza A');
  await p.click('.work-actions .danger'); await answer(false);
  log.push('obras tras cancelar borrado: ' + (await p.locator('.work-editor').count()));
  await p.click('.work-actions .danger'); await answer(true);
  log.push('obras tras confirmar borrado: ' + (await p.locator('.work-editor').count()));
  await p.click('#previewButton'); await p.waitForSelector('#previewModal:not([hidden])');
  log.push('hash con vista previa: ' + (await p.evaluate(() => location.hash)) + ' | revisión: ' + (await p.textContent('#reviewBox')).slice(0, 90));
  await p.keyboard.press('Escape');
  log.push('tras cerrar vista previa: ' + (await p.evaluate(() => location.hash)) + ' oculto=' + (await p.isHidden('#previewModal')));
  await p.click('[data-tab="portada"]'); await p.fill('#city', 'Valparaíso');
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(400); await p.reload(); await p.waitForTimeout(600);
  log.push('ciudad tras recargar: ' + (await p.inputValue('#city')));
  await p.click('.brand');
  log.push('logo → ' + (await p.getAttribute('body', 'data-view')) + ' | saludo: ' + (await p.textContent('#greeting')));
  await p.screenshot({ path: `${out}/panel.png` });
  await p.click('#pOpen');
  await p.click('#resetButton'); await answer(false);
  log.push('nombre tras cancelar reinicio: ' + (await p.inputValue('#artistName')));
  await p.click('#resetButton'); await answer(true); await p.waitForTimeout(300);
  await p.reload(); await p.waitForTimeout(600);
  log.push('nombre tras reiniciar y recargar: "' + (await p.inputValue('#artistName')) + '"');

  const mobile = await browser.newContext({ ...devices['iPhone 13'] });
  const m = await mobile.newPage();
  m.on('pageerror', (e) => errors.push(String(e)));
  for (const hash of ['', '#obras']) {
    await m.goto(url + hash); await m.waitForTimeout(300);
    log.push(`scroll horizontal en móvil ${hash || '#inicio'}: ` + (await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  }
  await m.goto(url); await m.screenshot({ path: `${out}/panel-movil.png`, fullPage: true });
  log.push('errores: ' + JSON.stringify(errors));
  console.log(log.join('\n'));
  await browser.close();
})();
