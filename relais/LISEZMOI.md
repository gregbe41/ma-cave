# Relais Claude des caves Google Drive

Une cave Google Drive n'a pas de script Google, donc pas d'endroit où garder la clé de l'API Claude. Le relais est ce
petit service : il est mis en place une seule fois, par l'éditeur de l'appli, pour toutes les caves. Les utilisateurs
n'ont rien à installer.

Ce qu'il fait :

- **il garde la clé Claude** : elle n'est jamais dans l'appli ;
- **il vérifie qui demande**. L'appli envoie le jeton Google de la personne, avec l'accès « fichiers créés ou désignés
  dans l'appli » seulement, et l'identifiant de la cave. Le relais demande à Google trois choses : le jeton a-t-il été
  délivré à l'appli Pampre ? Ouvre-t-il le fichier `cave.json` de cette cave ? À qui appartient la cave ? Seul un
  membre qui a rejoint la cave avec l'appli passe ;
- **il compte les bouchons de chaque cave** : l'unité des demandes à Pampre, l'IA de l'appli (propulsée par Claude). Il y a une limite par jour et par mois, et une part par membre. Le
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
| `portrait` | 2 | portrait de dégustateur d'une personne, d'après ses notes (« Mes stats ») |
| `lien` | 1 | l'avis de Pampre sur un vin vu en ligne (Conseil › « Vu en ligne ? »), d'après les goûts de la personne |
| `page` | 0 | lit la page d'un site marchand pour l'appli, sans IA : le navigateur ne le peut pas. Liens publics seulement (ni adresse IP, ni réseau local, redirections vérifiées), 2 Mo lus au plus, `PAGES_JOUR` pages par jour et par cave |
| `etat`, `reglages` | 0 | ce qui reste ; réglages du propriétaire |
| `depense` | 0 | ce que Pampre coûte vraiment chez Anthropic, en dollars, ce mois-ci et le mois d'avant : réservé à l'éditeur (`ADMINS`) |

**Coût réel** : après chaque réponse de Claude, le relais calcule son prix d'après l'usage renvoyé (jetons envoyés, reçus,
mis en cache, recherches web) et les prix d'Anthropic, et l'ajoute au total du mois (`depense:<mois>`), demande par
demande. Une réponse inutilisable (illisible, incomplète) est comptée aussi : elle coûte chez Anthropic, sans bouchon.
L'éditeur voit le total, le prix moyen d'un bouchon et combien de bouchons tiennent dans sa limite de dépense, dans
l'appli : Réglages › Pampre › Coût réel de Pampre.

Chaque demande est un `POST /v1/<demande>` avec l'en-tête `Authorization: Bearer <jeton Google>` et un corps JSON
`{ "cave": "<id de cave.json>", … }`.

## Configuration

| Variable | Rôle |
|---|---|
| `ANTHROPIC_API_KEY` | la clé de l'API Claude (secret) |
| `GOOGLE_PROJET` | le numéro du projet Google Cloud de l'appli : tous ses clients OAuth (web, Android) sont acceptés, et seulement eux |
| `GOOGLE_CLIENTS` | à la place, ou en plus : les identifiants des clients OAuth acceptés, séparés par des virgules |
| `ORIGINES` | les adresses autorisées à appeler le relais : l'appli web (`https://gregbe41.github.io`) et l'appli Android (`https://localhost`) |
| `ADMINS` | les adresses Google de l'éditeur : ses caves ont le plafond `ADMIN_JOUR` / `ADMIN_MOIS` (100 / 800 bouchons par défaut) |
| `PLAFOND_JOUR`, `PLAFOND_MOIS` | le plafond des autres caves (20 / 80 bouchons par défaut) |
| `PART_MEMBRE` | la part de chaque membre par mois, au départ (20 bouchons par défaut) |
| `LIMITE_USD` | la limite de dépense mensuelle de la clé, réglée dans la console Anthropic (100 $ par défaut) : pour dire combien de bouchons elle permet |
| `PRIX_ENTREE`, `PRIX_SORTIE`, `PRIX_CACHEECRIT5M`, `PRIX_CACHEECRIT1H`, `PRIX_CACHELU`, `PRIX_RECHERCHES` | les prix d'Anthropic, en dollars par million de jetons (pour 1 000 recherches web) ; par défaut ceux de Claude Opus 5.5 relus le 18 octobre 2026 : 4, 20, 5, 8, 0,2 et 10 |
| `PAGES_JOUR` | les pages de sites marchands lues par jour et par cave pour « Vu en ligne ? » (60 par défaut ; chacune compte une écriture KV) |

## L'essayer sur un ordinateur

Crée `relais/config.local.json` (ce fichier n'est jamais publié) :

```json
{ "ANTHROPIC_API_KEY": "sk-ant-…", "GOOGLE_PROJET": "123456789012",
  "ORIGINES": "http://localhost:8765,https://localhost", "ADMINS": "ton.adresse@gmail.com" }
```

puis `npm install` dans `relais/` et `node relais/serveur.js` : le relais répond sur `http://localhost:8787`.

## Le mettre en ligne : Cloudflare Workers (choisi)

L'offre gratuite ne demande pas de carte bancaire. Au-delà de ses quotas (100 000 demandes par jour, 1 000 écritures
KV par jour, soit environ 500 demandes à Pampre : chacune écrit les bouchons de la cave et le coût du mois), Cloudflare refuse les demandes : **il ne facture jamais rien**, même si le
relais est inondé de fausses demandes. Prends un compte Cloudflare réservé au relais : ses quotas ne sont pas partagés
avec un autre service.

Une demande y a droit à 10 ms de calcul. Une lecture d'étiquette en prend environ 7 ; c'est pourquoi les photos d'un
Conseil partent en 1024 px (environ 6 à 8 ms pour quatre photos).

1. Crée le compte Cloudflare (gratuit), avec une adresse à toi.
2. Dans un terminal, depuis le dossier du dépôt : `npm install --prefix relais`, puis `node relais/deploie-cloudflare.js`.
   - Une page Cloudflare s'ouvre : connecte-toi avec ce compte, autorise, puis confirme le compte dans le terminal.
   - Donne ton adresse Google (tes caves ont le plafond le plus haut), puis colle ta clé de l'API Claude quand elle est
     demandée : elle ne s'affiche pas.
3. Le script recopie l'adresse du relais dans `prototypes/drive-direct/config.local.js` (ligne `relais`). La prochaine
   construction de l'APK d'essai branche Pampre sur les caves Google Drive.

Relancer le script met le relais à jour. Les fichiers qu'il écrit (`wrangler.toml`, `cloudflare.local.json`) ne sont
jamais publiés.

**Conseil** : dans la console Anthropic, crée un espace de travail réservé au relais, avec une limite de dépense par
mois, et une clé dans cet espace. C'est le seul plafond strict sur ce que coûte Claude.

## Autre hébergement possible : Google Cloud Run

`deploie-cloudrun.sh` (à lancer dans Cloud Shell) met le relais sur Cloud Run dans les limites gratuites : région
`us-central1`, au plus une instance, bouchons dans Firestore, clé dans Secret Manager, images anciennes supprimées. Mais
Google demande une carte bancaire et ne coupe rien de lui-même : une inondation de demandes se paierait jusqu'à ce
qu'on réagisse. À ne choisir qu'avec un coupe-circuit de facturation, dans un projet séparé.
