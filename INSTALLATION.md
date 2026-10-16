# Installer le serveur de Ma cave

Ce guide s'adresse à la personne qui héberge la cave. Les autres n'ont rien à installer : un lien d'invitation leur suffit.

L'appli elle-même est déjà en ligne, sur [gregbe41.github.io/ma-cave](https://gregbe41.github.io/ma-cave/), et pour Android dans les [versions du dépôt](https://github.com/gregbe41/ma-cave/releases/latest). Ce guide installe le **serveur de ta cave** : un Google Sheet et un script, dans ton Drive. Pour partager l'appli avec d'autres, voir [PARTAGE.md](PARTAGE.md).

Compte environ 20 minutes, lecture des étiquettes comprise.

## Comment ça marche

- **Le Google Sheet** contient la cave : onglets Vins, Mouvements, Corbeille, Personnes, Avis, Conseils, Suggestions et Lectures IA.
- **Le script** est attaché à ce Sheet. Les appareils lui envoient leurs modifications, il les fusionne et range les photos d'étiquettes dans un dossier Drive « Ma cave – étiquettes ».
- **Chaque appareil** (page web ou appli Android) connaît l'adresse du script et un code secret. Personne n'a besoin de se connecter à Google, sauf toi pour l'installation.
- **Une routine Claude** passe chaque nuit : elle lit les photos d'étiquettes en attente, complète les fiches et cherche la valeur du jour des bouteilles. C'est compris dans ton abonnement Claude, sans clé API à payer.
- **Sans Claude** (ni routine, ni clé API), tout fonctionne en saisie manuelle : l'appli le détecte et ne promet aucune lecture automatique.

---

## 1. Créer le Google Sheet

1. Ouvre [sheets.new](https://sheets.new) avec ton compte Google.
2. Nomme-le, par exemple « Ma cave – inventaire ».

> **Tu avais déjà un Sheet créé par l'ancienne version de l'appli ?** Ouvre celui-là plutôt qu'un nouveau. Tes vins et tes photos sont repris, et la colonne « Boire avant » est renommée « Boire jusqu'en » sans perte.

## 2. Coller le script

1. Dans le Sheet : menu **Extensions › Apps Script**. L'éditeur s'ouvre dans un nouvel onglet.
2. En haut à gauche, clique sur « Projet sans titre » et renomme-le « Ma cave – serveur ».
3. Dans le fichier `Code.gs`, efface tout le contenu et colle celui du fichier [`apps-script/Code.gs`](apps-script/Code.gs). Sur GitHub, le bouton « Copy raw file », en haut à droite du fichier, copie tout d'un coup.
4. Enregistre (icône disquette ou `Ctrl+S`).
5. **Limiter les autorisations du script.** Ce réglage fait que le script ne peut voir que le Sheet de la cave et les fichiers qu'il crée lui-même, jamais le reste de ton Drive :
   - Dans la colonne de gauche, clique sur **Paramètres du projet** (roue dentée).
   - Coche **Afficher le fichier manifeste « appsscript.json » dans l'éditeur**.
   - Reviens dans l'**Éditeur** (icône `< >` dans la colonne de gauche) : un fichier `appsscript.json` apparaît sous `Code.gs`.
   - Ouvre-le, efface son contenu, colle celui du fichier [`apps-script/appsscript.json`](apps-script/appsscript.json), puis enregistre.

## 3. Lancer l'installation

1. Repère la petite barre d'outils **juste au-dessus du code** (pas le bouton bleu « Déployer » en haut à droite). Elle contient, de gauche à droite : annuler, rétablir, l'icône disquette, **▷ Exécuter**, **Déboguer**, une **liste déroulante** avec un nom de fonction, puis **Journal d'exécution**. Si la fenêtre est étroite, seules les icônes s'affichent.
   Dans la liste déroulante, choisis **`installer`**, puis clique sur **▷ Exécuter**. Si la liste affiche encore `myFunction`, le code n'est pas enregistré : fais `Ctrl+S` et elle se met à jour.
2. Google demande une autorisation :
   - **Examiner les autorisations**, puis choisis ton compte.
   - Un écran indique « Google n'a pas validé cette application ». C'est normal pour un script personnel : clique sur **Paramètres avancés**, puis sur **Accéder à Ma cave – serveur (non sécurisé)**.
   - Clique sur **Autoriser**.
3. Le **journal d'exécution** s'affiche en bas. Note les deux codes :
   - le **code secret des appareils**, par exemple `1a2b-3c4d-5e6f-7a8b` ;
   - le **code de la routine de lecture**, qui ne permet que de lire les étiquettes en attente et de compléter les fiches.

Dans le Sheet, les onglets Vins, Mouvements, Corbeille, Personnes, Avis, Conseils, Suggestions et Lectures IA apparaissent. Un dossier « Ma cave – étiquettes » est créé dans ton Drive.

> **Ce que tu autorises.** L'écran de Google doit lister trois accès : les feuilles de calcul **dans lesquelles l'application est installée** (ce Sheet seulement), les fichiers Google Drive **que tu utilises avec cette application** (ceux que le script crée : le dossier des étiquettes et les photos), et la connexion à un service externe (l'API Claude, pour la lecture immédiate facultative). Coche les trois. S'il manque la ligne sur Google Drive, c'est que l'étape 2.5 manque : `installer` s'arrête alors avec un message qui le dit. Refais l'étape 2.5, puis relance `installer`.

Pour retrouver les codes plus tard : **Paramètres du projet** (roue dentée dans la colonne de gauche) › **Propriétés du script**, lignes `SECRET` et `SECRET_ROUTINE`.

## 4. Publier le script

1. En haut à droite : **Déployer › Nouveau déploiement**.
2. Clique sur la roue dentée à côté de « Sélectionner le type », puis choisis **Application Web**.
3. Règle :
   - Description : `Ma cave`
   - Exécuter en tant que : **Moi** (ton adresse)
   - Qui a accès : **Tout le monde**. C'est indispensable : avec « Tous les utilisateurs disposant d'un compte Google », ni l'appli ni la routine ne peuvent joindre le script.
4. Clique sur **Déployer**. Copie l'**URL de l'application Web** : elle commence par `https://script.google.com/macros/s/` et se termine par `/exec`.

**Pour vérifier** : ouvre cette adresse dans ton navigateur. Elle doit afficher `"ok":true` et le message « Le script de Ma cave fonctionne ».

## 5. Ouvrir l'appli

- **Sur le web** (ordinateur, téléphone, tablette) : [gregbe41.github.io/ma-cave](https://gregbe41.github.io/ma-cave/).
- **Sur Android** : l'APK est dans la [dernière version](https://github.com/gregbe41/ma-cave/releases/latest). Le guide [ANDROID.md](ANDROID.md) détaille l'installation.

La page ne contient aucune donnée. Sans l'adresse du script et le code secret, elle n'affiche qu'une cave vide.

> **Héberger ta propre copie de la page ?** Fais un « Fork » de ce dépôt sur GitHub, puis dans **Settings › Pages**, choisis « Deploy from a branch », la branche `main` et le dossier `/ (root)`. Ta page sera à l'adresse `https://ton-pseudo.github.io/ma-cave/`.

## 6. Relier tes appareils

1. Ouvre l'appli, puis **Réglages**.
2. Colle l'**adresse du script** et le **code secret des appareils**.
3. Touche **Enregistrer et tester**. La pastille en haut doit passer à « Synchronisé ».
4. L'appli demande alors **« Qui es-tu ? »** : touche ton prénom dans la liste de la cave, ou écris-le si tu es nouveau. Tu pourras le changer dans Réglages › Personnes.

Si cet appareil avait déjà des vins (ancienne version, essais), ils sont envoyés dans le Sheet à cette première synchro.

**Pour inviter quelqu'un** : dans Réglages, touche **Inviter quelqu'un** et envoie le lien par message. En l'ouvrant dans son navigateur, la personne est reliée automatiquement. Dans l'appli Android, il suffit de coller ce lien dans le champ « Adresse du script ». Le lien contient le code secret : ne l'envoie qu'à des personnes de confiance.

---

## 7. Lecture des étiquettes chaque nuit (routine Claude)

Chez le caviste, il suffit de photographier l'étiquette et d'indiquer le nombre de bouteilles : la fiche apparaît comme « À identifier ». La nuit, une routine Claude lit les photos en attente et complète les fiches. Le lendemain, les champs estimés (région, cépages, fenêtre de garde…) sont marqués « à vérifier », et un doublon éventuel t'est signalé avec un bouton pour regrouper les deux fiches.

La routine utilise ton abonnement Claude : rien à payer en plus.

### a. Autoriser la routine à joindre le script

Par défaut, l'environnement cloud des routines bloque les adresses Google Apps Script. À faire une fois :

1. Sur [claude.ai/code](https://claude.ai/code), ouvre le sélecteur d'environnement (sous la zone de saisie) et survole l'environnement **Default**.
2. Clique sur sa **roue dentée**.
3. Dans **Accès réseau** (« Network access »), choisis **Personnalisé** (« Custom ») et ajoute ces deux domaines :
   - `script.google.com`
   - `script.googleusercontent.com`
4. Enregistre.

### b. Créer la routine

Je la crée pour toi avec la consigne du fichier [`routine/consigne.md`](routine/consigne.md). Donne-moi l'**adresse du script** et le **code de la routine** (pas celui des appareils). Elle passera tous les jours à 7 h, heure de Paris, et je lance un premier passage avec toi pour vérifier.

Pour suivre ses passages : [claude.ai/code/routines](https://claude.ai/code/routines). L'onglet « Lectures IA » du Sheet garde aussi une ligne par étiquette lue.

---

## 8. Lecture immédiate (facultatif, payant)

Si tu préfères que l'étiquette soit lue tout de suite, pendant la saisie, le script peut appeler l'API Claude (modèle Claude Opus 5.5, environ 0,03 $ par étiquette, au plus environ 0,07 $). Sans clé, rien ne change : la routine de nuit s'en charge.

1. Sur [console.anthropic.com](https://console.anthropic.com) : achète un petit crédit **sans recharge automatique** (Billing), crée un espace « Ma cave » avec une **limite de dépense mensuelle** (Settings › Workspaces), puis une **clé API** dans cet espace.
2. Dans l'éditeur Apps Script : **Paramètres du projet › Propriétés du script › Ajouter une propriété du script**, nom `ANTHROPIC_API_KEY`, valeur : ta clé.
3. Exécute la fonction **`testerCleClaude`** : le journal doit afficher « Clé valide ».

Garde-fous : quotas `QUOTA_JOUR` (20 par défaut) et `QUOTA_MOIS` (100 par défaut) dans les propriétés du script, coût plafonné par lecture, une seule lecture par photo, et chaque lecture notée dans l'onglet « Lectures IA ». Si une lecture immédiate échoue, l'étiquette est lue la nuit suivante.

La même clé rend aussi l'onglet **Conseil** immédiat : une quinzaine de secondes au lieu d'une à deux minutes. Chaque bouteille analysée compte pour une lecture dans les quotas. Sans clé, quota atteint ou API en panne, c'est la routine qui répond, lancée tout de suite.

Elle répond aussi tout de suite à **« Demander à Claude »** dans « Vins similaires » (depuis la version 15 du script) : une demande compte pour une lecture, pour un coût d'environ 2 centimes, puisqu'il n'y a pas de photo à lire. Sans clé, c'est la routine qui répond.

---

## Au quotidien

- **Corriger une valeur dans le Sheet** (un prix, une appellation) : fais-le directement. Le script note l'heure de modification, et ta correction l'emporte sur les appareils.
- **Qui a rempli quoi** : la colonne « Rempli par Claude » de l'onglet Vins liste les champs dont la valeur vient de Claude. Tout le reste a été saisi à la main, et Claude n'y touche jamais. Une valeur de Claude corrigée, dans l'appli ou dans le Sheet, devient la tienne. Claude repasse sur une fiche (photo ou non) quand on y ajoute un millésime, une appellation ou un domaine, ou sur demande (« Demander l'avis de Claude » dans la fiche) : il ne met alors à jour que les champs vides et les siens.
- **Valeur du jour** (depuis la version 13 du script) : la nuit, la routine cherche en ligne le prix actuel des bouteilles en cave, avec sa fourchette, sa source et le mois. Elle le fait pour 30 vins au plus par nuit, et revoit chaque valeur au bout d'un an. Cette recherche passe par le forfait Claude de la routine, pas par la clé API. Une valeur saisie à la main (colonne « Valeur du jour (€) » ou fiche de l'appli) n'est jamais remplacée. Vide-la pour que Claude la cherche de nouveau.
- **Ajouter ou supprimer un vin** : passe par l'appli. Une ligne effacée à la main dans le Sheet reviendrait à la synchro suivante.
- **N'ajoute pas de colonne** dans les onglets Vins, Mouvements, Corbeille, Personnes, Avis, Conseils et Suggestions : le script réécrit les lignes à chaque synchro.
- **Conseils** : une ligne par analyse demandée dans l'onglet Conseil de l'appli (bouteilles vues en magasin), avec un résumé lisible. Les colonnes « Bouteilles » et « Résultat » sont réservées à l'appli : ne les modifie pas à la main.
- **Suggestions** (depuis la version 15 du script) : une ligne par vin pour lequel quelqu'un a demandé à Claude des vins similaires, avec sa dernière réponse en résumé lisible. Elle reste dans la cave : tout le monde la retrouve dans la fiche, sans redemander. La colonne « Résultat » est réservée à l'appli.
- **Personnes** : la liste des propriétaires de bouteilles, commune à tous les appareils. Pour ajouter quelqu'un, tu peux écrire un prénom sur une nouvelle ligne de l'onglet. Pour renommer ou réunir deux personnes (« Manu » et « Emmanuel »), passe par l'appli, dans Réglages › Personnes : elle met aussi à jour l'historique, ce que l'onglet seul ne fait pas.
- **Couper l'accès à quelqu'un** : dans les propriétés du script, change la valeur de `SECRET`, puis renvoie une invitation aux autres appareils. Pour la routine, c'est `SECRET_ROUTINE`, à mettre à jour aussi dans la routine.

## Mettre à jour le script

Quand une nouvelle version de `Code.gs` arrive, l'appli le signale dans **Réglages**. La dernière version est toujours sur GitHub : [`apps-script/Code.gs`](apps-script/Code.gs).

1. Remplace le contenu de `Code.gs` dans l'éditeur (et celui d'`appsscript.json` s'il a changé), puis enregistre.
2. Exécute **`installer`** si la nouvelle version l'indique. C'est sans risque : rien n'est effacé, et les codes existants sont gardés.
3. **Déployer › Gérer les déploiements**, puis l'icône crayon.
4. Dans **Version**, choisis **Nouvelle version**, puis **Déployer**.

L'adresse reste la même : rien à changer sur les appareils ni dans la routine. Si tu oublies l'étape 4, c'est l'ancienne version qui continue de répondre.

## En cas de problème

| Message | Cause probable | Solution |
|---|---|---|
| « Impossible de joindre le script » | Accès du déploiement mal réglé, ou mauvaise adresse | Vérifie « Qui a accès : Tout le monde » et que l'adresse se termine par `/exec` |
| « Réponse inattendue du script » | Adresse de l'éditeur au lieu de celle du déploiement | Recopie l'URL de l'application Web (étape 4) |
| « Code secret refusé » | Code mal recopié ou changé | Recopie `SECRET` depuis les propriétés du script |
| « Le script n'est pas encore installé » | La fonction `installer` n'a pas été exécutée | Étape 3 |
| « Le script est trop ancien » | Le code a changé mais pas le déploiement | « Mettre à jour le script » ci-dessus |
| Les fiches restent « À identifier » | La routine ne passe pas, ou ne joint pas le script | Regarde le dernier passage sur claude.ai/code/routines ; une erreur `host_not_allowed` signifie que l'étape 7a manque |
| « Lecture échouée » sur une fiche | Photo floue ou sans étiquette | Reprends une photo, ou touche « Relancer la lecture cette nuit » |
| « Quota de lectures atteint » | Quota de la lecture immédiate atteint | Attends le lendemain, ou augmente `QUOTA_JOUR` / `QUOTA_MOIS` |

Les erreurs du script sont aussi visibles dans l'éditeur Apps Script, menu **Exécutions**.
