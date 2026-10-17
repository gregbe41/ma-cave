/* Met le relais en ligne sur Cloudflare Workers (offre gratuite, sans carte bancaire : au-delà de ses quotas, Cloudflare
   refuse les demandes, il ne facture rien). À lancer sur ton ordinateur, dans un terminal, depuis le dossier du dépôt :
       node relais/deploie-cloudflare.js
   Relancer le script met le relais à jour.

   Ce qu'il fait :
     1. connexion à Cloudflare (une page s'ouvre dans le navigateur), puis il te demande de confirmer le compte ;
     2. l'espace KV « CAVES », où le relais garde les bouchons de chaque cave (créé une fois) ;
     3. relais/wrangler.toml (jamais publié) : le numéro du projet Google Cloud (pris dans
        prototypes/drive-direct/config.local.js), les adresses autorisées, ton adresse Google ;
     4. la mise en ligne ;
     5. la clé de l'API Claude, en secret du Worker : tu la colles une fois, elle ne s'affiche pas ;
     6. un essai, puis l'adresse du relais recopiée dans config.local.js (ligne « relais »). */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const WRANGLER = 'wrangler@4.147.0';
const ETAT = path.join(ici, 'cloudflare.local.json');   // espace KV, adresses, URL : jamais publié
const CONFIG = path.join(ici, '..', 'prototypes', 'drive-direct', 'config.local.js');
const etat = fs.existsSync(ETAT) ? JSON.parse(fs.readFileSync(ETAT, 'utf8')) : {};
const garder = () => fs.writeFileSync(ETAT, JSON.stringify(etat, null, 1));
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const wrangler = (args, { voir = true, env = {} } = {}) => spawnSync('npx', ['--yes', WRANGLER, ...args], {
  cwd: ici, shell: true, encoding: 'utf8', stdio: voir ? 'inherit' : ['inherit', 'pipe', 'pipe'], env: { ...process.env, ...env },
});
const stop = msg => { console.error(`\n${msg}`); rl.close(); process.exit(1); };

// 1. Le compte Cloudflare
console.log('1/6 Compte Cloudflare…');
let qui = wrangler(['whoami'], { voir: false });
if (/not authenticated|You are not/i.test(qui.stdout + qui.stderr)) {
  console.log("Une page Cloudflare va s'ouvrir : connecte-toi avec le compte du relais (pas celui de ton autre service), puis autorise.");
  if (wrangler(['login']).status !== 0) stop('Connexion à Cloudflare interrompue.');
  qui = wrangler(['whoami'], { voir: false });
}
console.log(qui.stdout.split('\n').filter(l => /@|Account|compte|│/i.test(l)).join('\n'));
if (!/^o/i.test((await rl.question('Est-ce bien le compte Cloudflare du relais ? (o/n) ')).trim())) {
  stop("Déconnecte-toi avec « npx wrangler logout », reconnecte-toi au bon compte dans le navigateur, puis relance ce script.");
}

// 2. Les adresses : projet Google Cloud de l'appli, et la tienne
const sandbox = { window: {} };
if (!fs.existsSync(CONFIG)) stop('prototypes/drive-direct/config.local.js manque : il donne le numéro du projet Google Cloud.');
vm.runInNewContext(fs.readFileSync(CONFIG, 'utf8'), sandbox);
const projet = String((sandbox.window.PROTO_CONFIG || {}).appId || '').trim();
if (!/^\d+$/.test(projet)) stop('config.local.js : appId doit être le numéro du projet Google Cloud.');
if (!etat.admins) etat.admins = (await rl.question('Ton adresse Google (tes caves auront le plafond le plus haut ; plusieurs : séparées par des virgules) : ')).trim();
garder();

// 3. L'espace KV des bouchons
console.log('2/6 Espace KV des bouchons…');
if (!etat.kv) {
  const r = wrangler(['kv', 'namespace', 'create', 'CAVES'], { voir: false });
  const m = /id\s*=\s*"([0-9a-f]{32})"|"id":\s*"([0-9a-f]{32})"/.exec(r.stdout + r.stderr);
  if (!m) stop(`Création de l'espace KV impossible :\n${r.stdout}${r.stderr}`);
  etat.kv = m[1] || m[2];
  garder();
}

// 4. La configuration du Worker
console.log('3/6 Configuration…');
fs.writeFileSync(path.join(ici, 'wrangler.toml'), `# Écrit par deploie-cloudflare.js (jamais publié).
name = "ma-cave-relais"
main = "worker.js"
compatibility_date = "2026-09-01"
compatibility_flags = ["nodejs_compat"]
workers_dev = true

[[kv_namespaces]]
binding = "CAVES"
id = "${etat.kv}"

[vars]
GOOGLE_PROJET = "${projet}"
ORIGINES = "https://gregbe41.github.io,https://localhost,http://localhost:8765"
ADMINS = "${etat.admins.replace(/"/g, '')}"
`);

// 5. La mise en ligne (wrangler écrit l'adresse obtenue dans un fichier de sortie)
console.log('4/6 Mise en ligne…');
const sortie = fs.mkdtempSync(path.join(os.tmpdir(), 'macave-wrangler-'));
if (wrangler(['deploy'], { env: { WRANGLER_OUTPUT_FILE_DIRECTORY: sortie } }).status !== 0) stop('La mise en ligne a échoué (voir ci-dessus).');
for (const f of fs.readdirSync(sortie)) {
  for (const ligne of fs.readFileSync(path.join(sortie, f), 'utf8').split('\n')) {
    try { const j = JSON.parse(ligne); if (j.type === 'deploy' && j.targets && j.targets[0]) etat.url = j.targets[0]; } catch { /* ligne vide */ }
  }
}
fs.rmSync(sortie, { recursive: true, force: true });
garder();

// 6. La clé Claude, en secret du Worker
console.log('5/6 Clé de l\'API Claude…');
const secrets = wrangler(['secret', 'list'], { voir: false });
if (!/ANTHROPIC_API_KEY/.test(secrets.stdout)) {
  console.log('Colle ta clé de l\'API Claude (elle commence par sk-ant-) quand wrangler la demande. Elle ne s\'affiche pas.');
  if (wrangler(['secret', 'put', 'ANTHROPIC_API_KEY']).status !== 0) stop('Clé non enregistrée.');
} else console.log('   déjà enregistrée (pour la changer : npx wrangler secret put ANTHROPIC_API_KEY, dans relais/)');

// 7. Essai, et l'adresse dans config.local.js
console.log('6/6 Essai…');
if (!etat.url) etat.url = (await rl.question("Adresse du relais affichée ci-dessus (https://…workers.dev) : ")).trim();
garder();
let rep = '';
try { rep = await (await fetch(etat.url)).text(); } catch (e) { rep = e.message; }
console.log(`Réponse du relais : ${rep}`);
let cfg = fs.readFileSync(CONFIG, 'utf8');
cfg = /relais\s*:/.test(cfg) ? cfg.replace(/relais\s*:\s*'[^']*'/, `relais: '${etat.url}'`) : cfg.replace(/\n\};\s*$/, `\n  relais: '${etat.url}',\n};\n`);
fs.writeFileSync(CONFIG, cfg);
console.log(`\nRelais en ligne : ${etat.url}\nAdresse recopiée dans config.local.js : la prochaine construction de l'APK d'essai le branchera.`);
rl.close();
