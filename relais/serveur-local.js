/* Le relais sur un ordinateur, pour l'essayer avant de le mettre en ligne :
     node relais/serveur-local.js
   La configuration vient de relais/config.local.json (jamais publié), par exemple :
     { "ANTHROPIC_API_KEY": "sk-ant-…", "GOOGLE_CLIENTS": "123-web.apps.googleusercontent.com,123-android.apps.googleusercontent.com",
       "ORIGINES": "http://localhost:8765,https://localhost", "ADMINS": "toi@gmail.com", "PORT": 8787 }
   Les crédits des caves sont gardés dans relais/credits.local.json. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerRelais } from './relais.js';
import { fichier } from './stockage.js';

const ici = path.dirname(fileURLToPath(import.meta.url));
let env = {};
try { env = JSON.parse(fs.readFileSync(path.join(ici, 'config.local.json'), 'utf8')); } catch { console.warn('relais/config.local.json absent : le relais refusera les demandes.'); }
const relais = creerRelais({ env, store: fichier(path.join(ici, 'credits.local.json')) });
const port = +env.PORT || 8787;

http.createServer(async (req, res) => {
  const morceaux = [];
  for await (const m of req) morceaux.push(m);
  const corps = Buffer.concat(morceaux);
  const r = await relais.handle(new Request(`http://localhost:${port}${req.url}`, {
    method: req.method, headers: req.headers, body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : corps,
  }));
  res.writeHead(r.status, Object.fromEntries(r.headers));
  res.end(Buffer.from(await r.arrayBuffer()));
}).listen(port, () => console.log(`Relais Ma cave sur http://localhost:${port}`));
