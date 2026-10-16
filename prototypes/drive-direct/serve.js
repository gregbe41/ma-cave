// Sert le prototype sur http://localhost:8765 (l'adresse déclarée dans le projet Google Cloud).
//   node prototypes/drive-direct/serve.js
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname, PORT = 8765;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.md': 'text/plain; charset=utf-8' };

http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const f = path.join(ROOT, p === '/' ? 'index.html' : p);
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); res.end('Introuvable'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(f).pipe(res);
}).listen(PORT, 'localhost', () => console.log(`Prototype : http://localhost:${PORT}/`));
