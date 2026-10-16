// Construit l'APK de Ma cave.
//   node scripts/apk.js maison     → dist/ma-cave-maison.apk : relié d'office à la cave de cave.local.json (sur ce PC seulement, jamais publié)
//   node scripts/apk.js generique  → dist/ma-cave.apk : vierge, publiable ; chacun le relie à sa propre cave
//   node scripts/apk.js essai ["Ma cave v2"] → dist/ma-cave-essai.apk : comme « maison », mais s'installe À CÔTÉ de l'appli
//                                    habituelle (identifiant fr.macave.app.essai, nom à part) pour essayer une nouvelle version
// « maison » et « generique » portent le même identifiant (fr.macave.app) et doivent être signés avec la même clé : on peut alors
// installer l'un par-dessus l'autre sans rien perdre (les réglages et les données de l'appareil sont gardés).
// L'appli d'essai a ses propres données : reliée à la même cave, elle se synchronise comme un appareil de plus.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const kind = ['generique', 'essai'].includes(process.argv[2]) ? process.argv[2] : 'maison';
const label = kind === 'essai' ? (process.argv[3] || 'Ma cave (essai)').replace(/"/g, '') : '';
const root = path.join(__dirname, '..');
const android = path.join(root, 'android');
const run = (cmd, cwd = root) => { console.log(`\n> ${cmd}`); execSync(cmd, { cwd, stdio: 'inherit' }); };

if (kind !== 'generique' && !fs.existsSync(path.join(root, 'cave.local.json'))) {
  console.warn(`Attention : pas de cave.local.json, cet APK « ${kind} » sera vierge comme le générique.`);
}
run(`node scripts/copy-web.js${kind === 'generique' ? ' --generique' : ''}`);
run('npx cap sync android');
if (process.platform !== 'win32') fs.chmodSync(path.join(android, 'gradlew'), 0o755);
const props = kind === 'essai' ? ` -PmacaveSuffix=.essai "-PmacaveLabel=${label}"` : '';
run((process.platform === 'win32' ? '.\\gradlew.bat assembleDebug' : './gradlew assembleDebug') + props, android);

const out = path.join(root, 'dist', { generique: 'ma-cave.apk', maison: 'ma-cave-maison.apk', essai: 'ma-cave-essai.apk' }[kind]);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.copyFileSync(path.join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), out);
console.log(`\nAPK ${kind}${label ? ` (« ${label} »)` : ''} : ${path.relative(root, out)}`);
