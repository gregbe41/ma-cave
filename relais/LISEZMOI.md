# Relais Claude des caves Google Drive

Une cave Google Drive n'a pas de script Google, donc pas d'endroit où garder la clé de l'API Claude. Le relais est ce
petit service : il est mis en place une seule fois, par l'éditeur de l'appli, pour toutes les caves. Les utilisateurs
n'ont rien à installer.

Ce qu'il fait :

- **il garde la clé Claude** : elle n'est jamais dans l'appli ;
- **il vérifie qui demande**. L'appli envoie le jeton Google de la personne, avec l'accès « fichiers créés ou désignés
  dans l'appli » seulement, et l'identifiant de la cave. Le relais demande à Google trois choses : le jeton a-t-il été
  délivré à l'appli Ma cave ? Ouvre-t-il le fichier `cave.json` de cette cave ? À qui appartient la cave ? Seul un
  membre qui a rejoint la cave avec l'appli passe ;
- **il compte les bouchons de chaque cave** : l'unité des demandes à Tastevin, l'IA de l'appli (propulsée par Claude). Il y a une limite par jour et par mois, et une part par membre. Le
  propriétaire de la cave règle ces limites, toujours sous le plafond fixé par le relais ; les caves de l'éditeur ont
  un plafond plus haut. Une demande qui échoue ne coûte rien ;
- **il parle à Claude avec les consignes du script**. Elles sont recopiées de `apps-script/Code.gs` dans `regles.js`
  par `node relais/genere-regles.js`. Le relais n'accepte que des données (photos, fiche, question), jamais de
  consignes : il ne peut pas servir à autre chose.

| Demande | Bouchons | Ce que fait Claude |
|---|---|---|
| `etiquette` | 2 | lit la photo d'une étiquette |
| `revoir` | 1 | complète ou affine une fiche (style, accords, fenêtre de garde), avec ou sans photo |
| `conseil` | 2 par photo | conseil devant un rayon |
| `similaires` | 1 | cinq vins à découvrir |
| `cote` | 2 | valeur du jour, cherchée en ligne (trois recherches au plus) |
| `etat`, `reglages` | 0 | ce qui reste ; réglages du propriétaire |

Chaque demande est un `POST /v1/<demande>` avec l'en-tête `Authorization: Bearer <jeton Google>` et un corps JSON
`{ "cave": "<id de cave.json>", … }`.

## Configuration

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | la clé de l'API Claude (secret) |
| `GOOGLE_CLIENTS` | les identifiants des clients OAuth de l'appli (web et Android), séparés par des virgules |
| `ORIGINES` | les adresses autorisées à appeler le relais : l'appli web (`https://gregbe41.github.io`) et l'appli Android (`https://localhost`) |
| `ADMINS` | les adresses Google de l'éditeur : ses caves ont le plafond `ADMIN_JOUR` / `ADMIN_MOIS` (100 / 800 bouchons par défaut) |
| `PLAFOND_JOUR`, `PLAFOND_MOIS` | le plafond des autres caves (20 / 80 bouchons par défaut) |
| `PART_MEMBRE` | la part de chaque membre par mois, au départ (20 bouchons par défaut) |

## L'essayer sur un ordinateur

Crée `relais/config.local.json` (ce fichier n'est jamais publié) :

```json
{ "ANTHROPIC_API_KEY": "sk-ant-…", "GOOGLE_CLIENTS": "…-web.apps.googleusercontent.com,…-android.apps.googleusercontent.com",
  "ORIGINES": "http://localhost:8765,https://localhost", "ADMINS": "ton.adresse@gmail.com" }
```

puis `npm install` dans `relais/` et `node relais/serveur-local.js` : le relais répond sur `http://localhost:8787`.

## Le mettre en ligne

Pas encore choisi. Le code ne dépend pas de l'hébergeur : `relais.js` prend une demande web et rend une réponse.

- **Cloudflare Workers** (recommandé, gratuit sans carte bancaire) : `worker.js` est prêt. Il faut un compte
  Cloudflare, un espace KV nommé `CAVES` pour les bouchons, la clé en secret, puis une commande de mise en ligne.
- **Google Cloud** : dans le projet « Ma cave », mais Google demande une carte bancaire.
