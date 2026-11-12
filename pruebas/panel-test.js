// Prueba del panel de Cachivarte: estado vacío, lectura del dossier guardado, enlaces y móvil.
// Uso: servir la raíz del repo por HTTP y ejecutar  node pruebas/panel-test.js http://localhost:8123/ salida/
const { chromium, devices } = require('playwright');
const [base, out = '.'] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch();
  const log = [];
  const errors = [];
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => d.accept());

  await page.goto(base);
  log.push('vacío → botón: ' + (await page.textContent('#openDossier')));
  await page.screenshot({ path: `${out}/panel-vacio.png`, fullPage: true });

  // Crear un dossier en ArtDossier
  await page.click('.module[href="artdossier/"]');
  await page.waitForSelector('#tab-configurar');
  await page.click('[data-tab="portada"]');
  await page.fill('#artistName', 'Ana Prueba');
  await page.fill('#dossierTitle', 'Mareas 2025');
  await page.click('[data-tab="statement"]');
  await page.fill('#statement', 'Un statement de prueba.');
  await page.click('[data-tab="obras"]');
  await page.click('#addWorkButton');
  await page.fill('.work-editor input', 'Pieza A');
  await page.waitForTimeout(900);

  // Volver al panel con el logo
  await page.click('.brand');
  await page.waitForSelector('#projectInfo:not([hidden])');
  log.push('saludo: ' + (await page.textContent('#greeting')));
  log.push('título: ' + (await page.textContent('#projectTitle')));
  log.push('obras: ' + (await page.textContent('#statWorks')) + ' | progreso: ' + (await page.textContent('#progressText')));
  log.push('pendientes: ' + (await page.$$eval('#todoList li', (items) => items.map((i) => i.textContent).join(' / '))));
  await page.screenshot({ path: `${out}/panel-con-dossier.png`, fullPage: true });

  // Enlace directo a la vista previa
  await page.click('#previewDossier');
  await page.waitForSelector('#previewModal:not([hidden])');
  log.push('vista previa abierta desde el panel: sí');

  const mobile = await browser.newContext({ ...devices['iPhone 13'] });
  const m = await mobile.newPage();
  m.on('pageerror', (e) => errors.push(String(e)));
  await m.goto(base);
  await m.screenshot({ path: `${out}/panel-movil.png`, fullPage: true });
  log.push('scroll horizontal en móvil: ' + (await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)));
  log.push('errores: ' + JSON.stringify(errors));
  console.log(log.join('\n'));
  await browser.close();
})();
