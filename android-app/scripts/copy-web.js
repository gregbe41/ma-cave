// Copie l'appli web (../index.html) dans www/, le dossier que Capacitor embarque dans l'APK.
// Si android-app/cave.local.json existe, l'adresse du script et le code de la cave sont intégrés à l'APK :
// l'appli installée à la main chez un proche est reliée à la cave dès le premier lancement.
// Ce fichier reste sur ce PC : il n'est jamais copié dans la version web (GitHub Pages).
// Avec --generique, il est ignoré : l'APK est vierge, publiable, et chacun le relie à sa propre cave.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', '..', 'index.html');
const dir = path.join(__dirname, '..', 'www');
const conf = path.join(__dirname, '..', 'cave.local.json');
fs.mkdirSync(dir, { recursive: true });
let html = fs.readFileSync(src, 'utf8');
const generique = process.argv.includes('--generique');
if (!generique && fs.existsSync(conf)) {
  const c = JSON.parse(fs.readFileSync(conf, 'utf8'));
  const u = String(c.adresse || '').trim(), s = String(c.code || '').trim();
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(u)) throw new Error("cave.local.json : « adresse » doit être l'adresse du script, en https://script.google.com/macros/s/…/exec");
  if (!/^[0-9a-f]{4}(-[0-9a-f]{4}){3}$/.test(s)) throw new Error('cave.local.json : « code » doit être le code des appareils, de la forme 1a2b-3c4d-5e6f-7a8b');
  const tag = `<script>window.MACAVE_PRESET = ${JSON.stringify({ u, s })};</script>\n`;
  if (!html.includes('</head>')) throw new Error('index.html : balise </head> introuvable');
  html = html.replace('</head>', tag + '</head>');
  console.log('index.html copié dans www/, avec l\'adresse et le code de la cave intégrés');
} else {
  console.log(generique ? "index.html copié dans www/ pour l'APK générique (aucune cave intégrée)" : 'index.html copié dans www/ (sans cave.local.json : chaque appareil se relie à la main)');
}
// APK d'essai (--essai) : le prototype « cave dans Google Drive » est embarqué à côté de l'appli, avec un lien en bas
// des Réglages. Il passe par le plugin GoogleDrive (services Google du téléphone). Jamais dans les autres APK.
const essaiDir = path.join(dir, 'essai-drive');
fs.rmSync(essaiDir, { recursive: true, force: true });
if (process.argv.includes('--essai')) {
  const proto = path.join(__dirname, '..', '..', 'prototypes', 'drive-direct');
  fs.mkdirSync(essaiDir, { recursive: true });
  fs.copyFileSync(path.join(proto, 'index.html'), path.join(essaiDir, 'index.html'));
  const cfg = path.join(proto, 'config.local.js');
  if (fs.existsSync(cfg)) fs.copyFileSync(cfg, path.join(essaiDir, 'config.local.js'));
  else fs.writeFileSync(path.join(essaiDir, 'config.local.js'), 'window.PROTO_CONFIG = {};\n');
  const link = `<script>addEventListener('DOMContentLoaded', () => { const v = document.getElementById('v-reglages'); if (!v) return;
  const p = document.createElement('p'); p.style.cssText = 'margin:28px 0 8px;text-align:center';
  p.innerHTML = '<a href="essai-drive/index.html">Essai : une cave dans Google Drive</a>'; v.appendChild(p); });</script>\n`;
  html = html.replace('</body>', link + '</body>');
  console.log(`prototype Google Drive copié dans www/essai-drive/${fs.existsSync(cfg) ? ', avec config.local.js' : ' (sans config.local.js : pas de lecture des photos par lien)'}`);
  // Les caves Google Drive de l'appli : la configuration du projet Google Cloud (identifiant du client web, clé API
  // limitée par site, numéro du projet). Sa présence active « Créer une cave » dans « Mes caves ».
  const sandbox = { window: {} };
  if (fs.existsSync(cfg)) require('vm').runInNewContext(fs.readFileSync(cfg, 'utf8'), sandbox);
  const g = sandbox.window.PROTO_CONFIG || {};
  html = html.replace('</head>', `<script>window.MACAVE_GOOGLE = ${JSON.stringify({ clientId: g.clientId || '', apiKey: g.apiKey || '', appId: g.appId || '', relais: g.relais || '' })};</script>\n</head>`);
  console.log('caves Google Drive activées dans cet APK');
}
fs.writeFileSync(path.join(dir, 'index.html'), html);
// Le catalogue des vins français (« Vins similaires »), lu par l'appli à côté de index.html.
const cat = path.join(__dirname, '..', '..', 'catalogue', 'lwin-france.json');
if (fs.existsSync(cat)) {
  fs.mkdirSync(path.join(dir, 'catalogue'), { recursive: true });
  fs.copyFileSync(cat, path.join(dir, 'catalogue', 'lwin-france.json'));
  console.log('catalogue/lwin-france.json copié dans www/');
}
