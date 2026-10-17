/* Relais Claude des caves Google Drive de Ma cave.
   Il garde la clé de l'API Claude (jamais dans l'appli), vérifie que la personne fait partie de la cave, et compte les
   crédits de chaque cave. Les consignes données à Claude sont fixées ici (relais/regles.js, recopiées du script de la
   cave) : le relais n'accepte que des données, jamais des consignes.

   Qui demande ? L'appli envoie le jeton Google de la personne (accès drive.file) et l'identifiant de la cave (son fichier
   cave.json). Le relais demande à Google : ce jeton a-t-il été délivré à l'appli Ma cave ? ouvre-t-il ce cave.json ?
   à qui appartient la cave ? Seul un membre qui a rejoint la cave avec l'appli passe.

   Indépendant de l'hébergeur : creerRelais() prend la configuration (env), un stockage (get/put JSON) et une fonction
   fetch, et renvoie handle(Request) → Response. worker.js (Cloudflare) et serveur-local.js (Node) l'utilisent. */
import Anthropic from '@anthropic-ai/sdk';
import * as R from './regles.js';

const DRIVE = 'https://www.googleapis.com/drive/v3';
const TOKENINFO = 'https://oauth2.googleapis.com/tokeninfo';
const DRIVE_FILE = 'https://www.googleapis.com/auth/drive.file';
// Ce que coûte chaque demande, en crédits (1 crédit ≈ une lecture d'étiquette, quelques centimes).
export const COUTS = { etiquette: 1, conseil: 1, similaires: 0.5, revoir: 0.5, cote: 1 };
const MAX_IMAGE = 7e6;       // caractères base64 par photo (comme le script)
const MAX_CORPS = 40e6;      // une demande Conseil peut porter plusieurs photos
const MAX_BOUTEILLES = 10;

const round1 = x => Math.round(x * 10) / 10;
const erreur = (status, message, code = '') => Object.assign(new Error(message), { status, code });
const entier = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : d; };
const liste = v => String(v || '').split(',').map(s => s.trim()).filter(Boolean);
const texte = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Jour et mois à Paris : les crédits repartent à minuit, heure française. */
function aujourdhui(maintenant = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(maintenant).map(x => [x.type, x.value]));
  const jour = `${p.year}-${p.month}-${p.day}`;
  return { jour, mois: jour.slice(0, 7) };
}

export function creerRelais({ env = {}, store, fetch: f = globalThis.fetch, maintenant = () => new Date() }) {
  const clients = liste(env.GOOGLE_CLIENTS);
  const origines = liste(env.ORIGINES);
  const admins = liste(env.ADMINS).map(s => s.toLowerCase());
  const plafond = admin => (admin
    ? { jour: entier(env.ADMIN_JOUR, 50), mois: entier(env.ADMIN_MOIS, 400) }
    : { jour: entier(env.PLAFOND_JOUR, 10), mois: entier(env.PLAFOND_MOIS, 40) });
  const partDefaut = entier(env.PART_MEMBRE, 10);
  const claude = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY || 'absente', baseURL: env.ANTHROPIC_BASE_URL || undefined, fetch: f, maxRetries: 1 });
  const verifies = new Map();  // jeton + cave → qui, pour quelques minutes

  /* ---------- Qui demande ? ---------- */
  async function google(url, jeton) {
    const r = await f(url, jeton ? { headers: { Authorization: 'Bearer ' + jeton } } : {});
    const t = await r.text();
    let j = {};
    try { j = t ? JSON.parse(t) : {}; } catch { /* réponse illisible : traitée par l'appelant */ }
    return { ok: r.ok, status: r.status, j };
  }
  async function verifier(jeton, cave) {
    if (!jeton) throw erreur(401, 'Connexion à Google nécessaire.', 'auth');
    if (!/^[\w-]{10,200}$/.test(cave || '')) throw erreur(400, 'Cave inconnue.');
    const cle = jeton.slice(-24) + '|' + cave, deja = verifies.get(cle);
    if (deja && deja.jusqua > Date.now()) return deja.qui;
    const ti = await google(`${TOKENINFO}?access_token=${encodeURIComponent(jeton)}`);
    if (!ti.ok) throw erreur(401, 'Connexion à Google expirée : reconnecte-toi.', 'auth');
    // Un jeton délivré à une autre appli (même avec un accès plus large) ne passe pas.
    if (!clients.includes(ti.j.azp || ti.j.aud)) throw erreur(401, "Ce jeton n'a pas été délivré à l'appli Ma cave.", 'auth');
    if (!String(ti.j.scope || '').split(' ').includes(DRIVE_FILE)) throw erreur(401, 'Accès Google incomplet.', 'auth');
    const fic = await google(`${DRIVE}/files/${cave}?fields=id,name,ownedByMe,owners(emailAddress)`, jeton);
    if (fic.status === 401) throw erreur(401, 'Connexion à Google expirée : reconnecte-toi.', 'auth');
    if (!fic.ok || fic.j.name !== 'cave.json') throw erreur(403, "Tu ne fais pas partie de cette cave (ou tu ne l'as pas encore rejointe dans l'appli).", 'membre');
    const ab = await google(`${DRIVE}/about?fields=user(emailAddress,displayName)`, jeton);
    const email = String((ab.j.user && ab.j.user.emailAddress) || '').toLowerCase();
    if (!email) throw erreur(401, 'Compte Google illisible.', 'auth');
    const proprietaire = String((fic.j.owners && fic.j.owners[0] && fic.j.owners[0].emailAddress) || '').toLowerCase();
    const qui = { email, nom: (ab.j.user && ab.j.user.displayName) || '', proprio: !!fic.j.ownedByMe, admin: admins.includes(proprietaire) };
    verifies.set(cle, { qui, jusqua: Date.now() + Math.min(5 * 60e3, (entier(ti.j.expires_in, 300)) * 1e3) });
    return qui;
  }

  /* ---------- Crédits de la cave ---------- */
  async function etatCave(cave) {
    const { jour, mois } = aujourdhui(maintenant());
    const e = (await store.get('cave:' + cave)) || {};
    if (e.jour !== jour) Object.assign(e, { jour, nJour: 0 });
    if (e.mois !== mois) Object.assign(e, { mois, nMois: 0, qui: {} });
    if (!e.qui || typeof e.qui !== 'object') e.qui = {};
    if (!e.reglages || typeof e.reglages !== 'object') e.reglages = {};
    return e;
  }
  function limites(e, qui) {
    const p = plafond(qui.admin), g = e.reglages;
    return {
      plafond: p,
      jour: Math.min(entier(g.jour, p.jour), p.jour),
      mois: Math.min(entier(g.mois, p.mois), p.mois),
      part: entier(g.part, partDefaut),
    };
  }
  function statut(e, qui) {
    const L = limites(e, qui), moi = round1(e.qui[qui.email] || 0), part = qui.proprio ? 0 : L.part;
    const st = {
      jour: round1(Math.max(0, L.jour - (e.nJour || 0))), mois: round1(Math.max(0, L.mois - (e.nMois || 0))),
      max: { jour: L.jour, mois: L.mois, part: L.part }, plafond: L.plafond, moi, part,
      partReste: part ? round1(Math.max(0, part - moi)) : null, couts: COUTS, coteMois: entier(e.reglages.coteMois, 12),
    };
    if (qui.proprio) st.parPersonne = Object.keys(e.qui).map(k => ({ qui: k, credits: round1(e.qui[k]) })).sort((a, b) => b.credits - a.credits || a.qui.localeCompare(b.qui));
    return st;
  }
  function verifierCredits(e, qui, cout) {
    const L = limites(e, qui);
    if ((e.nJour || 0) + cout > L.jour) throw erreur(429, `Plus de crédits Claude pour aujourd'hui sur cette cave (${L.jour} par jour). Réessaie demain, ou remplis la fiche à la main.`, 'quota');
    if ((e.nMois || 0) + cout > L.mois) throw erreur(429, `Les crédits Claude de la cave sont épuisés pour ce mois (${L.mois}).`, 'quota');
    if (!qui.proprio && L.part && (e.qui[qui.email] || 0) + cout > L.part) throw erreur(429, `Tu as utilisé ta part de crédits Claude pour ce mois (${L.part}). Le propriétaire de la cave peut l'augmenter.`, 'quota');
  }
  /** Décompte une demande réussie (une demande qui échoue ne coûte rien) ; relit l'état juste avant d'écrire. */
  async function debiter(cave, qui, cout) {
    const e = await etatCave(cave);
    e.nJour = round1((e.nJour || 0) + cout); e.nMois = round1((e.nMois || 0) + cout);
    e.qui[qui.email] = round1((e.qui[qui.email] || 0) + cout);
    await store.put('cave:' + cave, e);
    return statut(e, qui);
  }

  /* ---------- Claude ---------- */
  const annee = () => maintenant().getFullYear();
  const image = (data, mime) => {
    const d = String(data || '');
    if (!d) throw erreur(400, 'Photo absente.');
    if (d.length > MAX_IMAGE) throw erreur(413, 'Photo trop lourde pour être lue.');
    return { type: 'image', source: { type: 'base64', media_type: R.IMAGE_TYPES.includes(mime) ? mime : 'image/jpeg', data: d } };
  };
  async function demander({ system, schema, content, maxTokens, outils = null, effort = 'low' }) {
    const corps = {
      model: R.MODEL, max_tokens: maxTokens, system,
      betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default',
      output_config: schema ? { effort, format: { type: 'json_schema', schema } } : { effort },
      messages: [{ role: 'user', content }],
    };
    if (outils) corps.tools = outils;
    let r;
    try {
      r = await claude.beta.messages.create(corps);
      // Recherche web longue : Claude rend la main en cours de route, on le relance (trois fois au plus).
      for (let i = 0; i < 3 && r.stop_reason === 'pause_turn'; i++) {
        corps.messages = [...corps.messages, { role: 'assistant', content: r.content }];
        r = await claude.beta.messages.create(corps);
      }
    } catch (e) {
      if (e instanceof Anthropic.AuthenticationError || e instanceof Anthropic.PermissionDeniedError) throw erreur(502, 'La clé Claude du relais est refusée.', 'cle');
      if (e instanceof Anthropic.RateLimitError) throw erreur(503, 'Claude est très demandé en ce moment : réessaie dans un instant.', 'occupe');
      if (e instanceof Anthropic.BadRequestError && /credit|balance|billing/i.test(e.message)) throw erreur(503, 'Claude est indisponible pour le moment (plafond de dépense atteint). Remplis la fiche à la main.', 'occupe');
      if (e instanceof Anthropic.APIError) throw erreur(502, `Claude a répondu une erreur (${e.status || 'réseau'}).`, 'claude');
      throw erreur(502, 'Claude ne répond pas. Réessaie plus tard.', 'claude');
    }
    if (r.stop_reason === 'refusal') throw erreur(422, 'Claude a refusé de traiter cette demande.', 'refus');
    if (r.stop_reason === 'max_tokens') throw erreur(422, 'Réponse incomplète de Claude. Réessaie, avec une photo plus nette si besoin.', 'incomplet');
    const txt = r.content.filter(b => b.type === 'text').map(b => b.text).join('');
    try {
      if (schema) return { json: JSON.parse(txt), usage: r.usage };
      // Sans sortie structurée (recherche web) : le dernier objet JSON du texte.
      const m = txt.match(/\{[\s\S]*\}(?![\s\S]*\{)/);
      return { json: JSON.parse(m ? m[0] : txt), usage: r.usage };
    } catch { throw erreur(502, 'La réponse de Claude est illisible. Réessaie.', 'illisible'); }
  }

  /* ---------- Actions ---------- */
  const ACTIONS = {
    async etat({ cave, qui }) { return { credits: statut(await etatCave(cave), qui), role: qui.proprio ? 'proprio' : 'membre' }; },

    async reglages({ cave, qui, p }) {
      if (!qui.proprio) throw erreur(403, 'Seul le propriétaire de la cave règle ses crédits.', 'proprio');
      const e = await etatCave(cave), L = limites(e, qui);
      const g = e.reglages;
      if (p.jour != null) g.jour = Math.min(entier(p.jour, L.jour), L.plafond.jour);
      if (p.mois != null) g.mois = Math.min(entier(p.mois, L.mois), L.plafond.mois);
      if (p.part != null) g.part = Math.min(entier(p.part, L.part), 10000);
      if (p.coteMois != null && [3, 6, 12, 24].includes(+p.coteMois)) g.coteMois = +p.coteMois;
      await store.put('cave:' + cave, e);
      return { credits: statut(e, qui) };
    },

    async etiquette({ cave, qui, p }) {
      const img = image(p.data, p.mime);
      verifierCredits(await etatCave(cave), qui, COUTS.etiquette);
      const { json } = await demander({ system: R.LABEL_PROMPT, schema: R.LABEL_SCHEMA, maxTokens: R.MAX_TOKENS,
        content: [img, { type: 'text', text: `Année en cours : ${annee()}. Lis cette étiquette.` }] });
      return { result: R.tidyLabel(json), credits: await debiter(cave, qui, COUTS.etiquette) };
    },

    /** Fiche à revoir ou à compléter (style, accords, fenêtre de garde), avec ou sans photo. */
    async revoir({ cave, qui, p }) {
      const content = [];
      if (p.data) content.push(image(p.data, p.mime));
      const fiche = { connu: p.connu && typeof p.connu === 'object' ? p.connu : {}, precedent: p.precedent && typeof p.precedent === 'object' ? p.precedent : {} };
      content.push({ type: 'text', text: `Année en cours : ${annee()}. Fiche à revoir : ${JSON.stringify(fiche).slice(0, 4000)}` });
      verifierCredits(await etatCave(cave), qui, COUTS.revoir);
      const { json } = await demander({ system: `${R.LABEL_PROMPT}\n\n${R.REVOIR_PROMPT}`, schema: R.LABEL_SCHEMA, maxTokens: R.MAX_TOKENS, content });
      return { result: R.tidyLabel(json), credits: await debiter(cave, qui, COUTS.revoir) };
    },

    async conseil({ cave, qui, p }) {
      const b = Array.isArray(p.bouteilles) ? p.bouteilles.slice(0, MAX_BOUTEILLES) : [];
      if (!b.length) throw erreur(400, 'Aucune photo à analyser.');
      const content = [];
      b.forEach((x, i) => {
        const connu = x.connu && typeof x.connu === 'object' ? x.connu : {};
        content.push({ type: 'text', text: `Photo ${i + 1}${Object.keys(connu).length ? ', indiqué par la personne : ' + JSON.stringify(connu).slice(0, 1000) : ''}` });
        content.push(image(x.data, x.mime));
      });
      const question = texte(p.question, 600).trim();
      content.push({ type: 'text', text: `Année en cours : ${annee()}.${question ? ' Question de la personne : ' + question : ''}` });
      const cout = b.length * COUTS.conseil;
      verifierCredits(await etatCave(cave), qui, cout);
      const { json } = await demander({ system: R.CONSEIL_PROMPT, schema: R.CONSEIL_SCHEMA, maxTokens: 2000 + 1500 * b.length, content });
      return { result: R.tidyConseil(json, b.length), credits: await debiter(cave, qui, cout) };
    },

    /** Vins similaires : le vin, ses avis et les vins déjà en cave, préparés par l'appli. */
    async similaires({ cave, qui, p }) {
      const c = p.contexte && typeof p.contexte === 'object' ? p.contexte : {};
      const ctx = { vin: c.vin && typeof c.vin === 'object' ? c.vin : {}, avis: Array.isArray(c.avis) ? c.avis.slice(0, 40) : [], dejaEnCave: Array.isArray(c.dejaEnCave) ? c.dejaEnCave.slice(0, 80).map(x => texte(x, 200)) : [] };
      verifierCredits(await etatCave(cave), qui, COUTS.similaires);
      const { json } = await demander({ system: R.SUGG_PROMPT, schema: R.SUGG_SCHEMA, maxTokens: 2500,
        content: `Année en cours : ${annee()}.\n${JSON.stringify(ctx).slice(0, 20000)}` });
      return { result: R.tidySuggest(json), credits: await debiter(cave, qui, COUTS.similaires) };
    },

    /** Valeur du jour : Claude cherche en ligne le prix actuel d'une bouteille. */
    async cote({ cave, qui, p }) {
      const vin = p.vin && typeof p.vin === 'object' ? p.vin : {};
      if (!vin.domaine) throw erreur(400, 'Vin non identifié.');
      const demande = { vin, bouteilles: entier(p.bouteilles, 1) };
      if (typeof p.prixAchat === 'number') demande.prixAchat = p.prixAchat;
      if (p.precedent && typeof p.precedent === 'object') demande.precedent = p.precedent;
      verifierCredits(await etatCave(cave), qui, COUTS.cote);
      const { json } = await demander({
        system: `${R.COTE_PROMPT}\n\nRéponds pour finir par un seul objet JSON, sans texte autour, conforme à ce schéma : ${JSON.stringify(R.COTE_SCHEMA)}`,
        maxTokens: 6000, outils: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 3 }],
        content: `Mois en cours : ${aujourdhui(maintenant()).mois}.\n${JSON.stringify(demande).slice(0, 4000)}`,
      });
      const euro = v => (typeof v === 'number' && Number.isFinite(v) && v > 0 && v < 1e6 ? Math.round(v) : null);
      const trouve = json.trouve === true && euro(json.cote) != null;
      const result = { trouve, cote: trouve ? euro(json.cote) : null, bas: trouve ? euro(json.bas) : null, haut: trouve ? euro(json.haut) : null, note: texte(json.note, 300).trim(), mois: aujourdhui(maintenant()).mois };
      return { result, credits: await debiter(cave, qui, COUTS.cote) };
    },
  };

  /* ---------- HTTP ---------- */
  function cors(request) {
    const o = request.headers.get('Origin') || '';
    return origines.includes(o) ? { 'Access-Control-Allow-Origin': o, 'Vary': 'Origin' } : {};
  }
  const repondre = (request, status, corps) => new Response(JSON.stringify(corps), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...cors(request) } });

  return {
    async handle(request) {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: { ...cors(request), 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Max-Age': '86400' } });
      }
      const action = new URL(request.url).pathname.replace(/^\/+|\/+$/g, '').replace(/^v1\//, '');
      if (request.method === 'GET' && !action) return repondre(request, 200, { ok: true, app: 'ma-cave-relais' });
      if (request.method !== 'POST' || !Object.hasOwn(ACTIONS, action)) return repondre(request, 404, { ok: false, error: 'Action inconnue.' });
      try {
        if (!env.ANTHROPIC_API_KEY) throw erreur(503, "Le relais n'a pas de clé Claude.", 'cle');
        const taille = +(request.headers.get('Content-Length') || 0);
        if (taille > MAX_CORPS) throw erreur(413, 'Demande trop lourde.');
        const brut = await request.text();
        if (brut.length > MAX_CORPS) throw erreur(413, 'Demande trop lourde.');
        let p;
        try { p = JSON.parse(brut || '{}'); } catch { throw erreur(400, 'Demande illisible.'); }
        const jeton = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
        const qui = await verifier(jeton, p.cave);
        const r = await ACTIONS[action]({ cave: p.cave, qui, p });
        return repondre(request, 200, { ok: true, ...r });
      } catch (e) {
        if (!e.status) console.error(e);
        return repondre(request, e.status || 500, { ok: false, error: e.status ? e.message : 'Erreur du relais.', code: e.code || '' });
      }
    },
  };
}
