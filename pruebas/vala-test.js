// Prueba de las funciones inspiradas en el material VALA: tipos de documento, convocatorias,
// correo de presentación y certificados de autenticidad.
// Uso: node pruebas/vala-test.js index.html salida/
const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');
const [file, out = '.'] = process.argv.slice(2);
const url = 'file://' + path.resolve(file);

function isoInDays(days) {
  const d = new Date(); d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
  const p = await context.newPage();
  const log = [];
  const errors = [];
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('dialog', (d) => { errors.push('diálogo nativo: ' + d.message()); d.dismiss(); });
  await p.addInitScript(() => { window.print = () => { window.__printed = (window.__printed || 0) + 1; }; });
  const labels = () => p.$$eval('#previewPages .page-label', (items) => items.map((i) => i.textContent));
  const openPreview = async () => { await p.click('#previewButton'); await p.waitForSelector('#previewModal:not([hidden])'); };
  const closePreview = async () => { await p.click('#closePreviewButton'); await p.waitForSelector('#previewModal', { state: 'hidden' }); };

  // --- Datos base del dossier
  await p.goto(url + '#portada');
  await p.fill('#artistName', 'Ana Prueba'); await p.fill('#city', 'Valparaíso'); await p.fill('#dossierTitle', 'Mareas');
  await p.click('[data-tab="statement"]'); await p.fill('#statement', 'Mi obra investiga la memoria del borde costero a través de la cerámica. Trabajo con arcillas locales.');
  await p.click('[data-tab="obras"]'); await p.click('#addWorkButton');
  const inputs = p.locator('.work-editor input');
  await inputs.nth(0).fill('Archivo de mareas'); await inputs.nth(1).fill('2025');
  await p.click('[data-tab="contacto"]'); await p.fill('#email', 'ana@example.com');

  // --- 1. Tipos de documento
  await p.click('[data-tab="configurar"]');
  for (const [type, label] of [['Catálogo artístico', 'catalogo'], ['Propuesta expositiva', 'propuesta'], ['Portafolio comercial', 'portafolio']]) {
    await p.click('[data-tab="configurar"]'); await p.click(`#docTypeGrid button:has-text("${type}")`);
    if (label === 'catalogo') {
      await p.click('[data-tab="statement"]');
      await p.fill('[data-bind="curatorial.text"]', 'Un texto curatorial de prueba.');
      log.push('catálogo → campos curatoriales visibles: ' + (await p.isVisible('[data-bind="curatorial.text"]')));
    }
    if (label === 'propuesta') {
      log.push('propuesta → pestaña Propuesta visible: ' + (await p.isVisible('.nav-button[data-tab="propuesta"]')));
      await p.click('.nav-button[data-tab="propuesta"]');
      await p.fill('[data-bind="proposal.concept"]', 'Instalación de piezas cerámicas en la sala.');
    }
    if (label === 'portafolio') {
      await p.click('[data-tab="obras"]');
      await p.selectOption('.work-editor select', 'Disponible');
      await p.fill('.work-editor input[placeholder="Ej. CLP 450.000"]', 'CLP 450.000');
    }
    await openPreview();
    const text = await p.textContent('#previewPages');
    log.push(`${label} → páginas: ${(await labels()).join(' | ')}`);
    if (label === 'portafolio') log.push(`  precio en PDF sin activar: ${text.includes('CLP 450.000')} | disponibilidad: ${text.includes('Disponible')}`);
    await closePreview();
  }
  await p.click('[data-tab="obras"]'); await p.check('[data-bind="showPrices"]');
  await openPreview(); log.push('  precio en PDF tras activarlo: ' + (await p.textContent('#previewPages')).includes('CLP 450.000')); await closePreview();
  log.push('navegación numerada: ' + (await p.$$eval('.nav-button:not([hidden]) span', (s) => s.map((x) => x.textContent).join(' '))));
  await p.click('[data-tab="configurar"]'); await p.click('#docTypeGrid button:has-text("Dossier artístico")');
  log.push('dossier → pestaña Propuesta oculta: ' + (await p.isHidden('.nav-button[data-tab="propuesta"]')));

  // --- 2. Convocatorias
  await p.click('.brand'); await p.click('.p-module[href="#convocatorias"]');
  await p.click('#addOpportunity');
  let card = p.locator('#opportunityList details').last();
  await card.locator('input').nth(0).fill('Fondo de creación de prueba');
  await card.locator('input').nth(1).fill('Centro Cultural Ficticio');
  await card.locator('input[type="date"]').fill(isoInDays(5));
  log.push('convocatoria nueva → ' + (await card.locator('.pills').textContent()));
  await card.locator('button:has-text("Marcar bases verificadas hoy")').click();
  await card.locator('button:has-text("entregables frecuentes")').click();
  await card.locator('.checklist input[type="checkbox"]').first().check();
  log.push('tras verificar y marcar un entregable → ' + (await card.locator('.pills').textContent()) + ' | ' + (await card.locator('summary small').textContent()));
  await p.click('#addOpportunity');
  card = p.locator('#opportunityList details').last();
  await card.locator('input').nth(0).fill('Convocatoria antigua');
  await card.locator('input[type="date"]').fill(isoInDays(-30));
  await p.selectOption('#opportunityFilter', 'activas');
  log.push('filtro activas: ' + (await p.$$eval('#opportunityList summary strong', (s) => s.map((x) => x.textContent).join(', '))));
  await p.selectOption('#opportunityFilter', 'cerradas');
  log.push('filtro cerradas: ' + (await p.$$eval('#opportunityList summary', (s) => s.map((x) => x.textContent).join(' / '))));
  await p.selectOption('#opportunityFilter', 'activas');

  // --- 3. Correo de presentación
  await p.locator('#opportunityList details').first().locator('button:has-text("Redactar correo")').click();
  const email = await p.inputValue('#emailOutput');
  log.push('correo → ' + email.split('\n').slice(0, 5).join(' ⏎ '));
  await p.screenshot({ path: `${out}/convocatorias.png`, fullPage: true });

  // --- 4. Certificados
  await p.click('a[data-section-link="estudio"]');
  await p.selectOption('#certFromWork', { label: 'Archivo de mareas (2025)' });
  await p.click('#addCertificate');
  const cert = p.locator('#certificateList details').first();
  log.push('certificado → ' + (await cert.locator('summary').textContent()));
  await cert.locator('input[placeholder="Ej. 3/5"]').fill('1/1');
  await cert.locator('button:has-text("Vista previa")').click();
  await p.waitForSelector('#previewModal:not([hidden])');
  log.push('vista previa del certificado: ' + (await p.textContent('#previewTitle')) + ' | revisión oculta: ' + (await p.isHidden('#reviewBox')));
  await p.screenshot({ path: `${out}/certificado-preview.png` });
  await p.click('#modalPrintButton');
  await p.waitForTimeout(300);
  log.push('imprimir certificado → print llamado: ' + (await p.evaluate(() => window.__printed)) + ' | hoja: ' + (await p.$eval('#printArea', (a) => a.querySelector('.certificate h1')?.textContent)));
  await p.emulateMedia({ media: 'print' });
  await p.pdf({ path: `${out}/certificado.pdf`, preferCSSPageSize: true, printBackground: true });
  await p.emulateMedia({ media: 'screen' });
  await p.click('#closePreviewButton');

  // --- Persistencia y panel
  await p.waitForTimeout(900);
  await p.reload(); await p.waitForTimeout(700);
  await p.click('a[data-section-link="inicio"]');
  log.push('panel tras recargar → ' + (await p.textContent('#pOppMeta')) + ' | ' + (await p.textContent('#pCertMeta')) + ' | ' + (await p.textContent('#pDiscipline')));
  await p.screenshot({ path: `${out}/panel-vala.png`, fullPage: true });

  // --- Respaldo incluye el estudio
  await p.goto(url + '#configurar');
  const [download] = await Promise.all([p.waitForEvent('download'), p.click('#exportButton')]);
  const backup = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
  log.push(`respaldo → convocatorias: ${backup.studio?.opportunities?.length}, certificados: ${backup.studio?.certificates?.length}, tipo: ${backup.documentType}`);

  // --- Móvil
  const mobile = await browser.newContext({ ...devices['iPhone 13'] });
  const m = await mobile.newPage();
  m.on('pageerror', (e) => errors.push(String(e)));
  for (const hash of ['#convocatorias', '#estudio', '#configurar']) {
    await m.goto(url + hash); await m.waitForTimeout(300);
    log.push(`móvil ${hash}: scroll horizontal ${await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)}`);
  }
  log.push('errores: ' + JSON.stringify(errors));
  console.log(log.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
