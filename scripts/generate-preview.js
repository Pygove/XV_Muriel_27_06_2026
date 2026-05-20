// Genera las imágenes de preview (og:image) para WhatsApp/redes.
//
// Salida:
//   preview.png        → hero de la invitación de casamiento (index.html)
//   preview-adulto.png → hero de la invitación XV adulto (adulto.html)
//   preview-teen.png   → hero de la invitación XV teen (teen.html)
//   preview-std.png    → hero del save-the-date sin la fecha (save-the-date.html)
//   preview-d12.png    → hero de la invitación al baile (post-cena) de XV (despues-12.html)
//
// Uso: npm run preview
//
// Levanta un server estático local en el puerto 5510, carga cada página con
// Playwright a 1200×630, remueve el entry gate, neutraliza animaciones y saca
// la screenshot. Las fuentes Google se esperan vía document.fonts.ready.

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const ROOT = path.resolve(__dirname, '..');
const PORT = 5510;
const VIEWPORT = { width: 1200, height: 630 };

// Detectar tipo de evento leyendo CONFIG.tipo de app.js (sin parsear JS).
// Para XV se generan adulto/teen/save-the-date/despues-12; para casamiento,
// solo index/save-the-date. Se omiten también los archivos que no existan
// en disco (p. ej. si la quinceañera no usa despues-12).
function readTipo() {
  const src = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  const m = src.match(/tipo:\s*['"]([^'"]+)['"]/);
  if (!m) throw new Error('No se pudo detectar CONFIG.tipo en app.js');
  return m[1];
}

const TIPO = readTipo();
const TARGETS = (TIPO === 'casamiento'
  ? [
      { url: '/index.html',         out: 'preview.png' },
      { url: '/save-the-date.html', out: 'preview-std.png', opts: { hideDate: true } },
    ]
  : [
      { url: '/adulto.html',        out: 'preview-adulto.png' },
      { url: '/teen.html',          out: 'preview-teen.png' },
      { url: '/save-the-date.html', out: 'preview-std.png', opts: { hideDate: true } },
      { url: '/despues-12.html',    out: 'preview-d12.png' },
    ]
).filter(t => fs.existsSync(path.join(ROOT, t.url.replace(/^\//, ''))));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg':  'image/svg+xml',
  '.mp3':  'audio/mpeg',
  '.ico':  'image/x-icon',
};

function serve() {
  return http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    const rel = url === '/' ? '/index.html' : url;
    const file = path.join(ROOT, rel);
    if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      res.end(data);
    });
  });
}

const KILL_ANIM_CSS = `
  *, *::before, *::after {
    animation: none !important;
    transition: none !important;
  }
  .fade-up, .reveal { opacity: 1 !important; transform: none !important; }
`;

async function shoot(browser, urlPath, outFile, { hideDate = false } = {}) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${PORT}${urlPath}`, { waitUntil: 'networkidle' });

  await page.addStyleTag({ content: KILL_ANIM_CSS });

  await page.evaluate((hideDate) => {
    const gate = document.getElementById('entryGate');
    if (gate) gate.remove();
    document.body.classList.remove('gate-active');
    const music = document.getElementById('musicToggle');
    if (music) music.style.display = 'none';
    if (hideDate) {
      const d = document.getElementById('heroDate');
      if (d) d.style.display = 'none';
      const cd = document.querySelector('.countdown');
      if (cd) cd.style.display = 'none';
      const msg = document.getElementById('countdownMsg');
      if (msg) msg.style.display = 'none';
    }
  }, hideDate);

  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);

  const out = path.join(ROOT, outFile);
  const { width, height } = VIEWPORT;
  const cropX = Math.round(width * 0.1);
  await page.screenshot({
    path: out,
    fullPage: false,
    omitBackground: false,
    clip: { x: cropX, y: 0, width: width - cropX * 2, height },
  });
  console.log(`✓ ${outFile}`);
  await ctx.close();
}

(async () => {
  const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  let bumped = false;
  for (const file of htmlFiles) {
    const filePath = path.join(ROOT, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const next = content.replace(/\?v=(\d+)/g, (_, n) => `?v=${parseInt(n) + 1}`);
    if (next !== content) { fs.writeFileSync(filePath, next); bumped = true; }
  }
  if (bumped) {
    const sample = fs.readFileSync(path.join(ROOT, htmlFiles[0]), 'utf8').match(/\?v=(\d+)/);
    console.log(`✓ Cache-busting bumped to v=${sample ? sample[1] : '?'}`);
  }

  console.log(`➤ tipo=${TIPO} · generando ${TARGETS.length} preview(s)`);
  const server = serve().listen(PORT);
  const browser = await chromium.launch();
  try {
    for (const t of TARGETS) {
      await shoot(browser, t.url, t.out, t.opts || {});
    }
  } finally {
    await browser.close();
    server.close();
  }
})().catch(err => { console.error(err); process.exit(1); });
