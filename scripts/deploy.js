// Sube el proyecto al hosting vía rsync sobre SSH.
//
// Uso:
//   npm run deploy            # dry-run, muestra qué se subiría
//   npm run deploy -- --go    # ejecuta de verdad
//
// Lee credenciales desde .env (DEPLOY_HOST, DEPLOY_PORT, DEPLOY_PATH).
// Excluye archivos del template/dev según .deployignore.

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const ENV_FILE = path.join(ROOT, '.env');
const IGNORE_FILE = path.join(ROOT, '.deployignore');

if (!fs.existsSync(ENV_FILE)) {
  console.error('✗ Falta .env. Copiá .env.example a .env y completá los datos del hosting.');
  process.exit(1);
}

const env = Object.fromEntries(
  fs.readFileSync(ENV_FILE, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'))
    .map(l => {
      const i = l.indexOf('=');
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    })
);

const { DEPLOY_HOST, DEPLOY_PATH, DEPLOY_PORT = '22' } = env;
if (!DEPLOY_HOST || !DEPLOY_PATH) {
  console.error('✗ .env debe definir DEPLOY_HOST y DEPLOY_PATH.');
  process.exit(1);
}

const go = process.argv.includes('--go');

if (go) {
  const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));
  let bumped = false;
  for (const file of htmlFiles) {
    const filePath = path.join(ROOT, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const next = content.replace(/\?v=(\d+)/g, (_, n) => `?v=${parseInt(n) + 1}`);
    if (next !== content) {
      fs.writeFileSync(filePath, next);
      bumped = true;
    }
  }
  if (bumped) {
    const sample = fs.readFileSync(path.join(ROOT, htmlFiles[0]), 'utf8').match(/\?v=(\d+)/);
    console.log(`✓ Cache-busting bumped to v=${sample ? sample[1] : '?'}`);
  }
}

const args = [
  '-avz',
  '--itemize-changes',
  go ? null : '--dry-run',
  `--exclude-from=${IGNORE_FILE}`,
  '-e', `ssh -p ${DEPLOY_PORT}`,
  './',
  `${DEPLOY_HOST}:${DEPLOY_PATH}`,
].filter(Boolean);

console.log(`${go ? '➤ Subiendo' : '➤ DRY-RUN'}: ${DEPLOY_HOST}:${DEPLOY_PATH}`);
console.log(`  rsync ${args.join(' ')}\n`);
const r = spawnSync('rsync', args, { cwd: ROOT, stdio: 'inherit' });

if (r.error) {
  console.error(`\n✗ No se pudo ejecutar rsync: ${r.error.message}`);
  process.exit(1);
}
if (r.status !== 0) {
  console.error(`\n✗ rsync terminó con código ${r.status}`);
  process.exit(r.status || 1);
}
if (!go) console.log('\nDry-run OK. Repetí con: npm run deploy -- --go');
