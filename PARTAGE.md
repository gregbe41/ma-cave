# Partager Ma cave

Un seul code sert à tout le monde, et chaque cave reste chez son propriétaire. Ce guide explique :

1. comment un ami crée **sa propre cave** ;
2. comment préparer **l'appli de ta famille**, déjà reliée à ta cave ;
3. comment se passent **les mises à jour** ;
4. ce qu'il faut **garder en lieu sûr** pour ne rien perdre.

## Le principe

| Ce qui est commun | Ce qui est à chacun |
|---|---|
| L'appli web : [gregbe41.github.io/ma-cave](https://gregbe41.github.io/ma-cave/) | Son Google Sheet (la cave) et le dossier Drive des photos |
| L'APK Android générique, dans les [versions](https://github.com/gregbe41/ma-cave/releases/latest) | Son script Google, son adresse et son code secret |
| Le code, sur ce dépôt | Sa routine ou sa clé Claude, s'il en veut |

Les données d'une cave ne passent jamais par GitHub, ni par le compte de quelqu'un d'autre. Un appareil est relié à une seule cave à la fois. En changeant de cave, il envoie d'abord à l'ancienne ce qui restait, puis il se vide : les vins ne passent jamais d'une cave à l'autre.

---

## 1. Un ami crée sa propre cave

Compte une quinzaine de minutes, une seule fois.

1. **Le Google Sheet et le script** : il suit [INSTALLATION.md](INSTALLATION.md), étapes 1 à 4. Il obtient une adresse en `…/exec` et un code secret.
   - Google affiche « Google n'a pas validé cette appli » : c'est normal pour un script personnel. Il clique sur « Paramètres avancés », puis « Accéder à Ma cave ».
2. **L'appli** : il ouvre [gregbe41.github.io/ma-cave](https://gregbe41.github.io/ma-cave/), ou installe l'APK générique (voir [ANDROID.md](ANDROID.md)). Dans **Réglages**, il colle son adresse et son code, puis touche **Enregistrer et tester**.
3. **Ses proches** : **Réglages › Inviter quelqu'un** leur envoie un lien qui relie leur appareil à sa cave.
4. **Claude, s'il le souhaite** : une clé API pour la lecture immédiate (étape 8 d'INSTALLATION.md), ou une routine Claude s'il a un abonnement (étape 7). Sans l'un ni l'autre, l'appli fonctionne en saisie manuelle et ne promet aucune lecture automatique.

> **Un Sheet modèle à copier** fait gagner les étapes 1 et 2 d'INSTALLATION.md. Pour le préparer : crée un Google Sheet vide, colle `Code.gs` et `appsscript.json` dans Extensions › Apps Script, **sans exécuter `installer`**, puis partage-le « Tous les utilisateurs disposant du lien : lecteur ». Le lien à envoyer est celui du Sheet, en remplaçant la fin `/edit…` par `/copy`. Chaque copie reçoit le script ; l'ami lance `installer` dans SA copie, ce qui crée SES codes.

---

## 2. L'appli de ta famille, déjà reliée à ta cave

C'est le même APK que le générique, avec l'adresse et le code de ta cave intégrés. Tes proches n'ont rien à régler au premier lancement. Il se construit **sur ton PC uniquement** et ne doit jamais être publié, puisqu'il contient ton code secret.

1. Dans `android-app/`, crée le fichier `cave.local.json`. Il est ignoré par git.

   ```json
   { "adresse": "https://script.google.com/macros/s/…/exec", "code": "xxxx-xxxx-xxxx-xxxx" }
   ```

2. Construis l'APK :

   ```
   cd android-app
   npm run apk
   ```

   Le fichier obtenu est `android-app/dist/ma-cave-maison.apk`.
3. Installe-le : par câble avec `npm run install-phone` (voir [ANDROID.md](ANDROID.md)), ou envoie le fichier directement à tes proches.

**APK maison et APK générique sont interchangeables.** Ils portent le même identifiant (`fr.pampre.app`) et la même signature, donc on peut installer l'un par-dessus l'autre. L'appareil garde ses réglages et ses données, et le préréglage ne s'applique qu'à un appareil pas encore relié. Tes proches peuvent donc aussi prendre les mises à jour publiées dans les versions.

---

## 3. Les mises à jour

| Quoi | Comment | Pour qui |
|---|---|---|
| **La page web** | Automatique dès que le code est poussé sur GitHub (une minute) | Tout le monde, d'un coup |
| **L'APK générique** | Une nouvelle version (`git tag v…`) ; GitHub construit l'APK et le joint à la version | Chacun l'installe par-dessus l'ancien, sans rien perdre |
| **L'APK maison** | `npm run apk` sur ton PC, puis installation comme au début | Ta famille |
| **Le script de chaque cave** | Chaque propriétaire colle le nouveau `Code.gs`, puis **Gérer les déploiements › Nouvelle version** ([INSTALLATION.md](INSTALLATION.md#mettre-à-jour-le-script)) | Chaque cave, à son rythme |

Quand la page est plus récente que le script d'une cave, l'appli le signale dans **Réglages**, avec le lien vers la marche à suivre. Un script plus ancien continue de fonctionner : l'appli masque ce qu'il ne sait pas encore faire.

---

## 4. Ne rien perdre

- **Les données** sont dans le Google Sheet, qui garde l'historique de ses versions (Fichier › Historique des versions), et les photos dans le dossier Drive. Les appareils n'en sont que des copies. Pour une sauvegarde de plus : **Réglages › Exporter les données**.
- **Avant de réinstaller ou de changer de téléphone**, synchronise : ce qui n'a pas été envoyé n'existe que sur l'appareil.
- **À garder en lieu sûr**, dans un gestionnaire de mots de passe par exemple :
  - **la clé de signature de l'APK** (`~/.android/debug.keystore` sur le PC qui construit les APK). Sans elle, on ne peut plus mettre à jour l'appli installée : il faudrait la désinstaller, puis tout récupérer à la synchro ;
  - **l'adresse et le code de ta cave** (`android-app/cave.local.json`) ;
  - **les propriétés du script**, dans l'éditeur Apps Script › Paramètres du projet : `SECRET`, `SECRET_ROUTINE` et, s'ils existent, `ANTHROPIC_API_KEY`, `ROUTINE_URL` et `ROUTINE_TOKEN`.
- **Le code** a tout son historique sur GitHub.

## Sécurité

- Le lien d'invitation et l'APK maison contiennent le code secret de la cave : ne les envoie qu'à des personnes de confiance. Pour couper l'accès à quelqu'un, change `SECRET` dans les propriétés du script, puis renvoie une invitation aux autres.
- Le script n'a accès qu'à son Google Sheet et aux fichiers qu'il crée, jamais au reste du Drive.
