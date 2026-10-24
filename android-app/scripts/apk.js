// Construit l'APK de Pampre (anciennement Ma cave, puis Pampre ; les fichiers gardent leur nom ma-cave*.apk).
//   node scripts/apk.js maison     → dist/ma-cave-maison.apk
//   node scripts/apk.js generique  → dist/ma-cave.apk (aujourd'hui identique à « maison » : Pampre n'intègre plus aucune cave)
//   node scripts/apk.js essai ["Pampre v2"] → dist/ma-cave-essai.apk : s'installe À CÔTÉ de l'appli habituelle
//                                    (identifiant fr.pampre.app.essai) pour essayer une nouvelle version ; il s'appelle
//                                    « Pampre » comme l'autre, sauf si on lui donne un nom à part
//   node scripts/apk.js play       → dist/pampre.aab : l'Android App Bundle à déposer dans la Play Console (identifiant
//                                    fr.pampre.app), signé avec la clé d'envoi (keystore.properties, pampre-upload.jks) ;
//                                    Google le signe ensuite avec sa propre clé avant de le distribuer
// Tous ouvrent les caves Google Drive (configuration de prototypes/drive-direct/config.local.js, sur ce PC).
// « maison » et « generique » portent le même identifiant (fr.pampre.app) et doivent être signés avec la même clé : on peut alors
// installer l'un par-dessus l'autre sans rien perdre (les réglages et les données de l'appareil sont gardés).
// L'appli d'essai a ses propres données : reliée à la même cave, elle se synchronise comme un appareil de plus.
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const kind = ['generique', 'essai', 'play'].includes(process.argv[2]) ? process.argv[2] : 'maison';
const label = kind === 'essai' ? (process.argv[3] || 'Pampre').replace(/"/g, '') : '';
const root = path.join(__dirname, '..');
const android = path.join(root, 'android');
const run = (cmd, cwd = root) => { console.log(`\n> ${cmd}`); execSync(cmd, { cwd, stdio: 'inherit' }); };
const gradlew = process.platform === 'win32' ? '.\\gradlew.bat' : './gradlew';

if (kind === 'play' && !fs.existsSync(path.join(root, 'keystore.properties'))) {
  console.error("Pas de keystore.properties dans android-app/ : sans la clé d'envoi, Google Play refuserait le fichier (voir ANDROID.md, « Google Play »).");
  process.exit(1);
}

run('node scripts/copy-web.js');
run('npx cap sync android');
if (process.platform !== 'win32') fs.chmodSync(path.join(android, 'gradlew'), 0o755);
if (kind === 'play') {
  // Le numéro de version doit monter à chaque envoi : les minutes écoulées depuis le 1er janvier 2026. Le nom, c'est la date.
  const now = new Date(), code = Math.floor((now - Date.UTC(2026, 0, 1)) / 60000);
  const nom = [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(n => String(n).padStart(2, '0')).join('.');
  run(`${gradlew} bundleRelease -PmacaveVersionCode=${code} -PmacaveVersionName=${nom}`, android);
  const aab = path.join(root, 'dist', 'pampre.aab');
  fs.mkdirSync(path.dirname(aab), { recursive: true });
  fs.copyFileSync(path.join(android, 'app', 'build', 'outputs', 'bundle', 'release', 'app-release.aab'), aab);
  console.log(`\nPour Google Play : ${path.relative(root, aab)} (version ${nom}, numéro ${code})`);
  process.exit(0);
}
const props = kind === 'essai' ? ` -PmacaveSuffix=.essai "-PmacaveLabel=${label}"` : '';
run(`${gradlew} assembleDebug${props}`, android);

const out = path.join(root, 'dist', { generique: 'ma-cave.apk', maison: 'ma-cave-maison.apk', essai: 'ma-cave-essai.apk' }[kind]);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.copyFileSync(path.join(android, 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk'), out);
console.log(`\nAPK ${kind}${label ? ` (« ${label} »)` : ''} : ${path.relative(root, out)}`);
