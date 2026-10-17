/* Le relais sous Node.
   - Sur Cloud Run : la configuration vient des variables du service (la clé Claude, de Secret Manager), les bouchons
     de Firestore. Voir deploie-cloudrun.sh.
   - Sur un ordinateur, pour l'essayer : la configuration vient de relais/config.local.json (jamais publié), les bouchons
     de relais/credits.local.json. node relais/serveur.js, puis http://localhost:8787. */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { creerRelais } from './relais.js';

const ici = path.dirname(fileURLToPath(import.meta.url));
const surCloudRun = !!process.env.K_SERVICE;
const env = { ...process.env };
if (!surCloudRun) {
  try { Object.assign(env, JSON.parse(fs.readFileSync(path.join(ici, 'config.local.json'), 'utf8'))); }
  catch { console.warn('relais/config.local.json absent : le relais refusera les demandes.'); }
}
const store = surCloudRun
  ? (await import('./stockage-firestore.js')).firestore()
  : (await import('./stockage.js')).fichier(path.join(ici, 'credits.local.json'));
const relais = creerRelais({ env, store });
const port = +process.env.PORT || +env.PORT || 8787;

http.createServer(async (req, res) => {
  try {
    const morceaux = [];
    for await (const m of req) morceaux.push(m);
    const r = await relais.handle(new Request(`http://localhost:${port}${req.url}`, {
      method: req.method, headers: req.headers,
      body: ['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? undefined : Buffer.concat(morceaux),
    }));
    res.writeHead(r.status, Object.fromEntries(r.headers));
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    console.error(e);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end('{"ok":false,"error":"Erreur du relais."}');
  }
}).listen(port, () => console.log(`Relais Ma cave sur le port ${port}${surCloudRun ? ' (Cloud Run)' : ''}`));
