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
fs.writeFileSync(path.join(dir, 'index.html'), html);
// Le catalogue des vins français (« Vins similaires »), lu par l'appli à côté de index.html.
const cat = path.join(__dirname, '..', '..', 'catalogue', 'lwin-france.json');
if (fs.existsSync(cat)) {
  fs.mkdirSync(path.join(dir, 'catalogue'), { recursive: true });
  fs.copyFileSync(cat, path.join(dir, 'catalogue', 'lwin-france.json'));
  console.log('catalogue/lwin-france.json copié dans www/');
}
