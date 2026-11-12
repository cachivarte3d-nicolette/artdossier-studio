// Simula el entorno de artefacto de claude.ai (db privado, assets, downloads) para probar ese modo.
// Uso: python3 -m http.server 8123  (en la raíz del repo) y luego
//   node pruebas/artefacto-test.js http://127.0.0.1:8123/ proyecto.json salida/ [carpeta-libs]
// carpeta-libs (opcional): html2canvas.min.js y jspdf.umd.min.js locales si cdnjs no es accesible.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const [base, projectFile, out = '.', libs] = process.argv.slice(2);

const server = { doc: null, assets: new Map(), downloads: [], deleted: 0 };

async function preparePage(context) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('dialog', (d) => { errors.push('diálogo nativo: ' + d.message()); d.dismiss(); });
  if (libs) {
    await page.route('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/**', (r) => r.fulfill({ path: path.join(libs, 'html2canvas.min.js'), contentType: 'text/javascript' }));
    await page.route('https://cdnjs.cloudflare.com/ajax/libs/jspdf/**', (r) => r.fulfill({ path: path.join(libs, 'jspdf.umd.min.js'), contentType: 'text/javascript' }));
  }
  await page.route('**/_blob/*', (r) => {
    const asset = server.assets.get(r.request().url().split('/_blob/')[1]);
    return asset ? r.fulfill({ body: asset.body, contentType: asset.type }) : r.fulfill({ status: 404 });
  });
  await page.exposeBinding('__upload', (_, b64, type) => { const id = Math.random().toString(16).slice(2).padEnd(32, '0').slice(0, 32); server.assets.set(id, { body: Buffer.from(b64, 'base64'), type }); return id; });
  await page.exposeBinding('__deleteAsset', (_, id) => { server.deleted += server.assets.delete(id) ? 1 : 0; });
  await page.exposeBinding('__docGet', () => server.doc);
  await page.exposeBinding('__docSet', (_, json) => { if (json.length > 256 * 1024) throw new Error('too big'); server.doc = json; });
  await page.exposeBinding('__save', (_, filename, b64) => { const file = path.join(out, 'descarga-' + filename); fs.writeFileSync(file, Buffer.from(b64, 'base64')); server.downloads.push({ filename, bytes: Buffer.from(b64, 'base64').length, file }); });
  await page.addInitScript(() => {
    const toB64 = async (blob) => { const bytes = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
    const doc = {
      get: async () => { const json = await window.__docGet(); return { exists: Boolean(json), data: () => (json ? JSON.parse(json) : undefined) }; },
      set: async (data) => { try { await window.__docSet(JSON.stringify(data)); } catch { throw { code: 'invalid_argument', message: 'too big' }; } }
    };
    const caps = {
      db: Object.freeze({ collection: (p) => ({ doc: (id) => { if (!/^data\/users\/u1$/.test(p) || id !== 'artdossier') throw new Error('ruta inesperada ' + p); return doc; } }) }),
      user: Object.freeze({ id: async () => 'u1' }),
      assets: Object.freeze({ upload: async (blob) => { const id = await window.__upload(await toB64(blob), blob.type); return { id, url: '/_blob/' + id, sizeBytes: blob.size, contentType: blob.type }; }, delete: async (id) => { await window.__deleteAsset(id); return { deleted: true }; } }),
      downloads: Object.freeze({ save: async ({ filename, data }) => { const blob = data instanceof Blob ? data : new Blob([data]); await window.__save(filename, await toB64(blob)); return { status: 'saved' }; } })
    };
    window.claude = { use: (name) => new Promise((resolve) => setTimeout(() => resolve(caps[name] || null), 20)) };
  });
  return { page, errors };
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const log = [];

  // 1) Importar un respaldo dentro del "artefacto"
  const ctxA = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const a = await preparePage(ctxA);
  await a.page.goto(base + '#configurar');
  await a.page.waitForFunction(() => document.querySelector('#modeBadge').textContent.includes('PRIVADO'));
  log.push('modo: ' + (await a.page.textContent('#modeBadge')) + ' | botón PDF: ' + (await a.page.textContent('#printButton')));
  await a.page.setInputFiles('#importInput', projectFile);
  await a.page.waitForFunction(() => /importado|válido/.test(document.querySelector('#toast').textContent), null, { timeout: 120000 });
  await a.page.waitForTimeout(800);
  const doc = JSON.parse(server.doc || '{}');
  const refs = [doc.profile?.coverImage, doc.profile?.portraitImage, ...(doc.works || []).map((w) => w.image)].filter(Boolean);
  log.push(`documento privado: ${Math.round((server.doc || '').length / 1024)} KiB | imágenes como asset: ${refs.filter((r) => r.startsWith('asset:')).length}/${refs.length} | assets: ${server.assets.size}`);

  // 2) Abrir en otro navegador (sin copia local): se recupera desde el espacio privado
  const ctxB = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const b = await preparePage(ctxB);
  await b.page.goto(base);
  await b.page.waitForFunction(() => document.querySelector('#pInfo') && !document.querySelector('#pInfo').hidden, null, { timeout: 15000 });
  const coverOk = await b.page.$eval('#pCoverArt img', (img) => img.decode().then(() => img.naturalWidth > 0).catch(() => false));
  log.push('otro navegador → ' + (await b.page.textContent('#greeting')) + ' | obras ' + (await b.page.textContent('#pWorks')) + ' | portada carga: ' + coverOk);

  // 3) PDF descargable
  await b.page.click('#pOpen');
  await b.page.click('#printButton');
  await b.page.waitForFunction(() => /PDF listo|No se pudo/.test(document.querySelector('#toast').textContent), null, { timeout: 120000 });
  log.push('PDF: ' + (await b.page.textContent('#toast')));
  const pdf = server.downloads.find((d) => d.filename.endsWith('.pdf'));
  if (pdf) {
    const bytes = fs.readFileSync(pdf.file);
    log.push(`  ${pdf.filename}: ${Math.round(pdf.bytes / 1024)} KB, cabecera ${bytes.subarray(0, 4).toString()}, hojas ${(bytes.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length}`);
  }

  // 4) Respaldo JSON autónomo
  await b.page.click('#exportButton');
  await b.page.waitForFunction(() => /Respaldo JSON listo|No se pudo/.test(document.querySelector('#toast').textContent), null, { timeout: 60000 });
  const backup = server.downloads.find((d) => d.filename.endsWith('.json'));
  if (backup) {
    const data = JSON.parse(fs.readFileSync(backup.file, 'utf8'));
    const imgs = [data.profile.coverImage, ...data.works.map((w) => w.image)].filter(Boolean);
    log.push(`respaldo: ${Math.round(backup.bytes / 1024)} KB | imágenes incluidas (data:): ${imgs.filter((i) => i.startsWith('data:')).length}/${imgs.length}`);
  }

  // 5) Eliminar una obra borra su imagen del espacio privado
  const before = server.assets.size;
  await b.page.click('[data-tab="obras"]');
  await b.page.click('.work-actions .danger');
  await b.page.waitForSelector('#confirmDialog[open]');
  await b.page.click('#confirmOk');
  await b.page.waitForTimeout(800);
  log.push(`eliminar obra → assets ${before} → ${server.assets.size}`);
  await b.page.screenshot({ path: path.join(out, 'artefacto-obras.png') });

  log.push('errores: ' + JSON.stringify([...a.errors, ...b.errors]));
  console.log(log.join('\n'));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
