// Copie l'appli web (../index.html) dans www/, le dossier que Capacitor embarque dans l'APK, avec la configuration des
// caves Google Drive (prototypes/drive-direct/config.local.js, qui reste sur ce PC).
// Pampre n'ouvre plus les caves à script : android-app/cave.local.json (adresse du script et code des appareils) ne
// sert plus, aucun APK ne l'intègre. On partage une cave depuis Réglages › Inviter quelqu'un.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', '..', 'index.html');
const dir = path.join(__dirname, '..', 'www');
fs.mkdirSync(dir, { recursive: true });
let html = fs.readFileSync(src, 'utf8');
if (!html.includes('</head>')) throw new Error('index.html : balise </head> introuvable');
// Ancien prototype « cave dans Google Drive », embarqué jusqu'ici dans l'APK d'essai : retiré s'il traîne encore.
fs.rmSync(path.join(dir, 'essai-drive'), { recursive: true, force: true });
// Les caves Google Drive de l'appli : la configuration du projet Google Cloud (identifiant du client web, clé API
// limitée par site, numéro du projet) et l'adresse du relais de Pampre.
const cfg = path.join(__dirname, '..', '..', 'prototypes', 'drive-direct', 'config.local.js');
const sandbox = { window: {} };
if (fs.existsSync(cfg)) require('vm').runInNewContext(fs.readFileSync(cfg, 'utf8'), sandbox);
else console.warn("Attention : pas de prototypes/drive-direct/config.local.js, cet APK ne pourra ouvrir aucune cave Google Drive.");
const g = sandbox.window.PROTO_CONFIG || {};
html = html.replace('</head>', `<script>window.MACAVE_GOOGLE = ${JSON.stringify({ clientId: g.clientId || '', apiKey: g.apiKey || '', appId: g.appId || '', relais: g.relais || '' })};</script>\n</head>`);
fs.writeFileSync(path.join(dir, 'index.html'), html);
console.log(`index.html copié dans www/${fs.existsSync(cfg) ? ', caves Google Drive activées' : ''}`);
// Le catalogue des vins français (« Vins similaires »), lu par l'appli à côté de index.html.
const cat = path.join(__dirname, '..', '..', 'catalogue', 'lwin-france.json');
if (fs.existsSync(cat)) {
  fs.mkdirSync(path.join(dir, 'catalogue'), { recursive: true });
  fs.copyFileSync(cat, path.join(dir, 'catalogue', 'lwin-france.json'));
  console.log('catalogue/lwin-france.json copié dans www/');
}
