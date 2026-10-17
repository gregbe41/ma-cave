#!/usr/bin/env bash
# Met le relais en ligne sur Cloud Run, dans le projet Google Cloud de l'appli, en restant dans la partie gratuite.
# À lancer dans Cloud Shell (le terminal de la console Google Cloud), depuis le dossier du relais :
#     bash deploie-cloudrun.sh
# Relancer le script met le relais à jour ; rien n'est recréé en double.
#
# Ce qui garde la facture à zéro :
#   - région us-central1, couverte par l'offre gratuite de Cloud Run (2 millions de demandes par mois, 180 000 s de calcul) ;
#   - au plus 1 instance, et aucune quand personne ne s'en sert (rien ne tourne à vide) ; 256 Mo de mémoire ;
#   - les bouchons dans Firestore, base « (default) » : 50 000 lectures et 20 000 écritures offertes par jour ;
#   - la clé Claude dans Secret Manager : une seule version, sous les 6 offertes ;
#   - une image Node légère, et seules les 2 dernières gardées : sous les 500 Mo offerts d'Artifact Registry.
# Les appels à Claude, eux, sont facturés par Anthropic sur ta clé : les bouchons de chaque cave les plafonnent.
set -euo pipefail
REGION=us-central1
SERVICE=ma-cave-relais
COMPTE=ma-cave-relais

cd "$(dirname "$0")"
PROJET=$(gcloud config get-value project 2>/dev/null || true)
if [ -z "$PROJET" ]; then
  echo "Choisis d'abord le projet « Ma cave » : gcloud config set project <ID du projet>"
  exit 1
fi
NUMERO=$(gcloud projects describe "$PROJET" --format='value(projectNumber)')
echo "Projet : $PROJET (numéro $NUMERO), région $REGION"

if [ "$(gcloud billing projects describe "$PROJET" --format='value(billingEnabled)' 2>/dev/null)" != "True" ]; then
  echo "La facturation n'est pas activée sur ce projet. Console Google Cloud › Facturation › Associer un compte de facturation, puis relance."
  exit 1
fi

echo "1/6 Services du projet…"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com \
  firestore.googleapis.com secretmanager.googleapis.com iam.googleapis.com compute.googleapis.com --quiet

echo "2/6 Base Firestore des bouchons…"
if ! gcloud firestore databases describe --database='(default)' >/dev/null 2>&1; then
  gcloud firestore databases create --location="$REGION" --type=firestore-native --quiet
fi

echo "3/6 Clé de l'API Claude…"
if ! gcloud secrets describe anthropic-api-key >/dev/null 2>&1; then
  read -rsp "Colle ta clé de l'API Claude (elle commence par sk-ant-), puis Entrée. Elle ne s'affiche pas : " CLE; echo
  case "$CLE" in sk-ant-*) ;; *) echo "Ce n'est pas une clé de l'API Claude."; exit 1 ;; esac
  printf '%s' "$CLE" | gcloud secrets create anthropic-api-key --replication-policy=automatic --data-file=- --quiet
  unset CLE
else
  echo "   déjà enregistrée (pour la changer : gcloud secrets versions add anthropic-api-key --data-file=-)"
fi

echo "4/6 Compte de service du relais (il ne peut que lire la clé et écrire les bouchons)…"
SA="$COMPTE@$PROJET.iam.gserviceaccount.com"
gcloud iam service-accounts describe "$SA" >/dev/null 2>&1 || gcloud iam service-accounts create "$COMPTE" --display-name="Relais Ma cave" --quiet
gcloud secrets add-iam-policy-binding anthropic-api-key --member="serviceAccount:$SA" --role=roles/secretmanager.secretAccessor --quiet >/dev/null
gcloud projects add-iam-policy-binding "$PROJET" --member="serviceAccount:$SA" --role=roles/datastore.user --condition=None --quiet >/dev/null
# La construction de l'image passe par le compte de service par défaut du projet : il lui faut ce rôle.
gcloud projects add-iam-policy-binding "$PROJET" --member="serviceAccount:$NUMERO-compute@developer.gserviceaccount.com" --role=roles/run.builder --condition=None --quiet >/dev/null

# Une mise à jour garde les adresses déjà données.
ADMINS=$(gcloud run services describe "$SERVICE" --region "$REGION" --format=json 2>/dev/null \
  | jq -r '.spec.template.spec.containers[0].env[]? | select(.name == "ADMINS") | .value' 2>/dev/null || true)
if [ -z "$ADMINS" ]; then
  read -rp "Ton adresse Google (tes caves auront le plafond le plus haut ; plusieurs : séparées par des virgules) : " ADMINS
fi

echo "5/6 Construction et mise en ligne (2 à 4 minutes)…"
gcloud run deploy "$SERVICE" --source . --region "$REGION" --service-account "$SA" --allow-unauthenticated \
  --min-instances 0 --max-instances 1 --memory 256Mi --cpu 1 --concurrency 20 --timeout 300 \
  --set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest \
  --set-env-vars "^@^GOOGLE_PROJET=$NUMERO@ORIGINES=https://gregbe41.github.io,https://localhost,http://localhost:8765@ADMINS=$ADMINS" \
  --quiet

echo "6/6 Nettoyage des anciennes images (seules les 2 dernières restent)…"
POLITIQUE=$(mktemp)
cat > "$POLITIQUE" <<'JSON'
[
  { "name": "garder-les-2-dernieres", "action": { "type": "Keep" }, "mostRecentVersions": { "keepCount": 2 } },
  { "name": "supprimer-le-reste", "action": { "type": "Delete" }, "condition": { "tagState": "any" } }
]
JSON
gcloud artifacts repositories set-cleanup-policies cloud-run-source-deploy --location="$REGION" --policy="$POLITIQUE" --no-dry-run --quiet >/dev/null
rm -f "$POLITIQUE"

URL=$(gcloud run services describe "$SERVICE" --region "$REGION" --format='value(status.url)')
echo
echo "Relais en ligne : $URL"
echo "Réponse du relais : $(curl -s "$URL/")"
echo "Recopie cette adresse dans prototypes/drive-direct/config.local.js, ligne relais."
