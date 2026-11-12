// Prueba P0 de ArtDossier: carga, guardado, recarga, PDF con 1/5/15 obras y recortes de contenido.
// Uso: node p0-test.js /ruta/a/index.html /carpeta/salida
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const file = path.resolve(process.argv[2]);
const out = path.resolve(process.argv[3] || '.');
fs.mkdirSync(out, { recursive: true });
const url = 'file://' + file;

const long = (n, word = 'investigación') => Array.from({ length: n }, (_, i) => `${word}${i % 7 ? '' : '.'}`).join(' ');

async function makeImage(page, w, h, hue) {
  return page.evaluate(([w, h, hue]) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, `hsl(${hue},70%,55%)`); grad.addColorStop(1, `hsl(${(hue + 120) % 360},60%,30%)`);
    g.fillStyle = grad; g.fillRect(0, 0, w, h);
    return c.toDataURL('image/png');
  }, [w, h, hue]);
}

async function run() {
  const browser = await chromium.launch();
  const results = [];
  for (const count of [1, 5, 15]) {
    const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(url + '#configurar');
    await page.waitForTimeout(300);

    const cover = await makeImage(page, 2400, 1600, 10);
    const works = [];
    for (let i = 0; i < count; i++) {
      const portrait = i % 3 === 1;
      works.push({
        id: 'w' + i, title: `Obra de prueba ${i + 1}`, year: '2025', medium: 'Óleo sobre lino',
        dimensions: '120 × 90 cm', edition: 'Única',
        description: i === 0 ? long(240, 'descripción') : 'Nota breve.',
        image: await makeImage(page, portrait ? 1500 : 2400, portrait ? 2400 : 1500, i * 30)
      });
    }
    const project = {
      discipline: 'painting', purpose: 'gallery', template: process.env.TPL || 'museo',
      profile: { artistName: 'Artista de Prueba', professionalTitle: 'Artista visual', dossierTitle: 'Obras seleccionadas 2024–2026', city: 'Santiago, Chile',
        statement: long(700), bio: long(550, 'trayectoria'), coverImage: cover, portraitImage: await makeImage(page, 1200, 1600, 200) },
      works,
      cv: { education: Array.from({ length: 12 }, (_, i) => ({ year: String(2000 + i), description: 'Formación de prueba con una descripción bastante larga para llenar la línea' })),
        solo: Array.from({ length: 15 }, (_, i) => ({ year: String(2010 + i), description: 'Exposición individual de prueba, Galería Ficticia, Ciudad' })),
        group: Array.from({ length: 20 }, (_, i) => ({ year: String(2005 + i), description: 'Exposición colectiva de prueba, Museo Ficticio, Ciudad' })), awards: [], collections: [], press: [] },
      contact: { email: 'prueba@example.com', phone: '+56 9 0000 0000', website: 'https://example.com', instagram: '@prueba', gallery: '', studio: '' }
    };

    // Importar como lo haría la persona usuaria (input de archivo)
    const jsonPath = path.join(out, `proyecto-${count}.json`);
    fs.writeFileSync(jsonPath, JSON.stringify(project));
    
    await page.setInputFiles('#importInput', jsonPath);
    const t0 = Date.now();
    await page.waitForFunction(() => /Guardado|válido|pesar/.test(document.querySelector('#saveStatus').textContent + document.querySelector('#toast').textContent), null, { timeout: 120000 });
    const importMs = Date.now() - t0;
    const toast = await page.textContent('#toast');

    // Persistencia: recargar y comprobar que sigue ahí
    await page.reload();
    await page.waitForTimeout(800);
    const persisted = await page.evaluate(() => ({ name: document.querySelector('#artistName').value, works: document.querySelectorAll('.work-editor').length }));

    // Preparar impresión sin abrir el diálogo
    await page.evaluate(() => { window.print = () => {}; });
    await page.click('#printButton');
    await page.waitForTimeout(800);
    await page.emulateMedia({ media: 'print' });
    const pages = await page.evaluate(() => [...document.querySelectorAll('#printArea .doc-page')].map((p) => {
      const label = p.querySelector('.page-label')?.textContent || '';
      const imgs = [...p.querySelectorAll('img')];
      return { label, clipped: p.scrollHeight - p.clientHeight, imgsLoaded: imgs.every((i) => i.complete && i.naturalWidth > 0) };
    }));
    const pdfPath = path.join(out, `dossier-${count}-obras.pdf`);
    const pdf = await page.pdf({ path: pdfPath, preferCSSPageSize: true, printBackground: true });
    const pdfPages = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
    const stored = await page.evaluate(() => new Promise((res) => {
      const r = indexedDB.open('artdossier-studio'); r.onsuccess = () => { const g = r.result.transaction('projects').objectStore('projects').get('current'); g.onsuccess = () => res(JSON.stringify(g.result || {}).length); };
    }));
    results.push({ count, importMs, toast, errors, persisted, docPages: pages.length, pdfPages, pdfKB: Math.round(pdf.length / 1024), storedKB: Math.round(stored / 1024),
      clippedPages: pages.filter((p) => p.clipped > 2).map((p) => `${p.label} (+${p.clipped}px)`), imagesNotLoaded: pages.filter((p) => !p.imgsLoaded).map((p) => p.label) });
    await context.close();
  }
  await browser.close();
  console.log(JSON.stringify(results, null, 2));
}
run().catch((e) => { console.error(e); process.exit(1); });
