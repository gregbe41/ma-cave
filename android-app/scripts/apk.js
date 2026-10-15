// Construit l'APK de Ma cave.
//   node scripts/apk.js maison     → dist/ma-cave-maison.apk : relié d'office à la cave de cave.local.json (sur ce PC seulement, jamais publié)
//   node scripts/apk.js generique  → dist/ma-cave.apk : vierge, publiable ; chacun le relie à sa propre cave
// Les deux portent le même identifiant (fr.macave.app) et doivent être signés avec la même clé : on peut alors installer
// l'un par-dessus l'autre sans rien perdre (les réglages et les données de l'appareil sont gardés).
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const kind = process.argv[2] === 'generique' ? 'generique' : 'maison';
const root = path.join(__dirname, '..');
const android = path.join(root, 'android');
const run = (cmd, cwd = root) => { console.log(`\n> ${cmd}`); execSync(cmd, { cwd, stdio: 'inherit' }); };

if (kind === 'maison' && !fs.existsSync(path.join(root, 'cave.local.json'))) {
  console.warn('Attention : pas de cave.local.json, cet APK « maison » sera vierge comme le générique.');
}
run(`node scripts/copy-web.js${kind === 'generique' ? ' --generique' : ''}`);
run('npx cap sync android');
if (process.platform !== 'win32') fs.chmodSync(path.join(android, 'gradlew'), 0o755);
run(process.platform === 'win32' ? '.\\gradlew.bat assembleDebug' : './gradlew assembleDebug', android);

const out = path.join(root, 'dist', kind === 'generique' ? 'ma-cave.apk' : 'ma-cave-maison.apk');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.copyFileSync(path.join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), out);
console.log(`\nAPK ${kind} : ${path.relative(root, out)}`);
