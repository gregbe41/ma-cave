/* Le relais sur Cloudflare Workers : la clé Claude et la configuration sont des variables du Worker, les crédits de
   chaque cave sont dans l'espace KV « CAVES ». Voir relais/LISEZMOI.md. */
import { creerRelais } from './relais.js';

const kvStore = espace => ({ get: k => espace.get(k, 'json'), put: (k, v) => espace.put(k, JSON.stringify(v)) });

export default {
  fetch(request, env) {
    return creerRelais({ env, store: kvStore(env.CAVES) }).handle(request);
  },
};
