// Sert l'appli v2 (le index.html du dépôt) sur http://localhost:8765, l'adresse déjà déclarée dans le projet
// Google Cloud, avec les caves Google Drive activées. Sert à jouer l'invité depuis un navigateur, avec un autre
// compte Google que celui du téléphone, sans rien publier sur GitHub Pages.
//   node prototypes/drive-direct/serve-appli.js
// Arrête d'abord serve.js s'il tourne : les deux utilisent le même port.
const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..'), PORT = +process.env.PORT || 8765;
const CFG = path.join(__dirname, 'config.local.js');
// Seuls ces fichiers sont servis : jamais cave.local.json ni le reste du dépôt.
const FILES = { '/': 'index.html', '/index.html': 'index.html', '/catalogue/lwin-france.json': 'catalogue/lwin-france.json' };

function page() {
  const sandbox = { window: {} };
  if (fs.existsSync(CFG)) vm.runInNewContext(fs.readFileSync(CFG, 'utf8'), sandbox);
  const g = sandbox.window.PROTO_CONFIG || {};
  const tag = `<script>window.MACAVE_GOOGLE = ${JSON.stringify({ clientId: g.clientId || '', apiKey: g.apiKey || '', appId: g.appId || '', relais: g.relais || '' })};</script>\n`;
  // Relu à chaque requête : un simple rechargement de la page prend la dernière version de index.html.
  return fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').replace('</head>', tag + '</head>');
}

const server = http.createServer((req, res) => {
  const f = FILES[new URL(req.url, 'http://localhost').pathname];
  if (!f) { res.writeHead(404); res.end('Introuvable'); return; }
  const html = f === 'index.html';
  res.writeHead(200, { 'content-type': html ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(html ? page() : fs.readFileSync(path.join(ROOT, f)));
});
server.on('error', e => {
  if (e.code !== 'EADDRINUSE') throw e;
  console.error(`Le port ${PORT} est déjà pris, sans doute par le prototype (serve.js). Arrête-le (Ctrl+C dans sa fenêtre), puis relance cette commande.`);
  process.exit(1);
});
server.listen(PORT, 'localhost', () => {
  console.log(`Appli v2 : http://localhost:${PORT}/`);
  if (!fs.existsSync(CFG)) console.log('config.local.js absent : les caves Google Drive ne seront pas proposées (voir LISEZMOI.md).');
});
