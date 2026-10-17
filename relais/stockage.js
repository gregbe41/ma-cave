/* Où le relais garde les crédits de chaque cave, une petite valeur JSON par cave, quand il tourne sous Node.
   (Sur Cloudflare, worker.js utilise l'espace KV du Worker.) */
import fs from 'node:fs';

/** En mémoire : pour les tests. */
export function memoire() {
  const m = new Map();
  return { get: async k => (m.has(k) ? JSON.parse(m.get(k)) : null), put: async (k, v) => { m.set(k, JSON.stringify(v)); }, _m: m };
}

/** Dans un fichier JSON : pour faire tourner le relais sur un ordinateur. */
export function fichier(chemin) {
  const lire = () => { try { return JSON.parse(fs.readFileSync(chemin, 'utf8')); } catch { return {}; } };
  return {
    get: async k => lire()[k] ?? null,
    put: async (k, v) => { const d = lire(); d[k] = v; fs.writeFileSync(chemin, JSON.stringify(d, null, 1)); },
  };
}
