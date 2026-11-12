const { chromium, devices } = require('playwright');
const [file, out] = process.argv.slice(2);
(async () => {
  const b = await chromium.launch(); const log = [];
  const ctx = await b.newContext({ viewport: { width: 1400, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(String(e)));
  let answer = false; p.on('dialog', d => { log.push('diálogo: ' + d.message()); answer ? d.accept() : d.dismiss(); });
  await p.goto('file://' + file);
  await p.click('[data-tab="portada"]'); await p.fill('#artistName', 'Ana Prueba');
  await p.click('[data-tab="obras"]'); await p.click('#addWorkButton'); await p.fill('.work-editor input', 'Pieza A');
  await p.click('.work-actions .danger'); log.push('obras tras cancelar borrado: ' + await p.locator('.work-editor').count());
  answer = true; await p.click('.work-actions .danger'); log.push('obras tras confirmar borrado: ' + await p.locator('.work-editor').count());
  await p.click('#previewButton'); log.push('revisión: ' + (await p.textContent('#reviewBox')).slice(0, 160));
  await p.screenshot({ path: out + '/preview.png' });
  await p.keyboard.press('Escape');
  // cambios recientes se guardan al ocultar la pestaña
  await p.click('[data-tab="portada"]'); await p.fill('#city', 'Valparaíso');
  await p.evaluate(() => { Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await p.waitForTimeout(300); await p.reload(); await p.waitForTimeout(500);
  log.push('ciudad tras recargar: ' + await p.inputValue('#city'));
  answer = false; await p.click('#resetButton'); log.push('nombre tras cancelar reinicio: ' + await p.inputValue('#artistName'));
  answer = true; await p.click('#resetButton'); await p.waitForTimeout(300); log.push('nombre tras reiniciar: "' + await p.inputValue('#artistName') + '"');
  await p.reload(); await p.waitForTimeout(500); log.push('nombre tras reiniciar y recargar: "' + await p.inputValue('#artistName') + '"');
  const m = await b.newContext({ ...devices['iPhone 13'] }); const mp = await m.newPage(); mp.on('pageerror', e => errs.push(String(e)));
  await mp.goto('file://' + file); await mp.screenshot({ path: out + '/movil.png' });
  log.push('scroll horizontal en móvil: ' + await mp.evaluate(() => document.documentElement.scrollWidth > window.innerWidth));
  log.push('errores: ' + JSON.stringify(errs));
  console.log(log.join('\n')); await b.close();
})();
