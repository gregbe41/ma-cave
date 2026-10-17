/* Les bouchons de chaque cave dans Firestore, quand le relais tourne sur Cloud Run : la base « (default) » du projet,
   offerte jusqu'à 50 000 lectures et 20 000 écritures par jour (une demande à Tastevin en fait une de chaque).
   Le jeton vient du serveur de métadonnées de Cloud Run : ni clé, ni bibliothèque. */
const META = 'http://metadata.google.internal/computeMetadata/v1';

export function firestore({ fetch: f = globalThis.fetch, projet = '' } = {}) {
  let jeton = '', jusqua = 0, pid = projet;
  async function auth() {
    if (jeton && Date.now() < jusqua) return jeton;
    const r = await f(`${META}/instance/service-accounts/default/token`, { headers: { 'Metadata-Flavor': 'Google' } });
    if (!r.ok) throw new Error(`Jeton Cloud Run indisponible (${r.status}).`);
    const j = await r.json();
    jeton = j.access_token; jusqua = Date.now() + (Number(j.expires_in || 300) - 60) * 1e3;
    if (!pid) pid = (await (await f(`${META}/project/project-id`, { headers: { 'Metadata-Flavor': 'Google' } })).text()).trim();
    return jeton;
  }
  const doc = k => `https://firestore.googleapis.com/v1/projects/${pid}/databases/(default)/documents/caves/${encodeURIComponent(k)}`;
  return {
    async get(k) {
      const t = await auth();
      const r = await f(doc(k), { headers: { Authorization: 'Bearer ' + t } });
      if (r.status === 404) return null;
      if (!r.ok) throw new Error(`Firestore a répondu ${r.status}.`);
      const d = await r.json();
      try { return JSON.parse(d.fields.json.stringValue); } catch { return null; }
    },
    async put(k, v) {
      const t = await auth();
      const r = await f(doc(k), {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + t, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { json: { stringValue: JSON.stringify(v) } } }),
      });
      if (!r.ok) throw new Error(`Firestore a répondu ${r.status}.`);
    },
  };
}
