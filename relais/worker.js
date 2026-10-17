/* Le relais sur Cloudflare Workers : la clé Claude est un secret du Worker, la configuration ses variables, et les
   bouchons de chaque cave sont dans l'espace KV « CAVES ». Mise en ligne : node relais/deploie-cloudflare.js. */
import { creerRelais } from './relais.js';

const kvStore = espace => ({ get: k => espace.get(k, 'json'), put: (k, v) => espace.put(k, JSON.stringify(v)) });
let relais = null;  // un par instance : les vérifications de jeton récentes restent en mémoire d'une demande à l'autre

export default {
  fetch(request, env) {
    relais = relais || creerRelais({ env, store: kvStore(env.CAVES) });
    return relais.handle(request);
  },
};
