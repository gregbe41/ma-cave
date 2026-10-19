# Installer l'appli Android sur ton téléphone

L'appli Android est la même que la page web : le fichier `index.html`, embarqué avec Capacitor dans `android-app/`. Elle s'installe sans passer par le Play Store.

## Le plus simple : télécharger l'APK

1. Sur le téléphone, ouvre la [dernière version](https://github.com/gregbe41/ma-cave/releases/latest) et touche `ma-cave.apk` pour le télécharger.
2. Ouvre le fichier téléchargé. Android demande d'autoriser le navigateur (ou l'appli Fichiers) à installer des applis : accepte, pour cette source seulement.
3. Touche **Installer**. Pour une mise à jour, fais pareil avec le nouvel APK : il s'installe par-dessus, sans rien perdre.
4. Relie l'appli à ta cave (voir l'étape 4 plus bas).

La suite de ce guide sert à **construire l'APK sur ton PC**, par exemple pour préparer l'appli déjà reliée à ta cave pour ta famille ([PARTAGE.md](PARTAGE.md)). Prévois 10 minutes la première fois ; les mises à jour prennent ensuite une minute.

## 1. Activer le mode développeur sur le téléphone (une seule fois)

1. Ouvre **Paramètres › À propos du téléphone**. Sur un Samsung : **Paramètres › À propos du téléphone › Informations sur le logiciel**.
2. Touche **Numéro de build** (ou « Numéro de version ») **7 fois de suite**. Le téléphone annonce « Vous êtes développeur ».
3. Reviens dans **Paramètres › Système › Options pour les développeurs** (sur Samsung : directement en bas des Paramètres).
4. Active **Débogage USB**.

## 2. Brancher le téléphone

1. Branche le téléphone au PC avec un câble USB qui transmet les données (pas seulement la charge).
2. Sur le téléphone, accepte **Autoriser le débogage USB ?** en cochant « Toujours autoriser sur cet ordinateur ».
3. Sur le PC, dans le dossier `android-app`, vérifie que le téléphone est vu :

   ```
   npm run phones
   ```

   Une ligne avec le modèle de ton téléphone et le mot `device` doit apparaître. Si tu vois `unauthorized`, regarde l'écran du téléphone : la demande d'autorisation attend ta réponse.

## 3. Installer l'appli

Toujours dans `android-app` :

```
npm run apk
npm run install-phone
```

La première commande construit l'appli (l'APK). La seconde l'installe sur le téléphone. L'icône « Pampre » (une pousse de vigne sur fond nuit) apparaît avec les autres applis.

> **Autre méthode, avec Android Studio** : **File › Open**, choisis le dossier `android-app/android`, sélectionne ton téléphone en haut de la fenêtre, puis clique sur ▶ **Run**.

## 4. Relier l'appli à la cave

L'appli Android garde ses propres données, séparées de celles du navigateur. Il faut donc la relier une fois :

- **Avec un lien d'invitation** reçu par message : copie le lien entier, puis dans l'appli va dans **Réglages**, colle-le dans le champ **Adresse du script** et touche **Enregistrer et tester**. L'adresse et le code se remplissent tout seuls.
- **Ou à la main** : colle l'adresse du script et le code secret, comme sur le web.

Indique aussi ton prénom : il apparaît dans l'historique des bouteilles.

### Appli déjà reliée, pour tes proches

Tu installes l'appli toi-même, à la main, chez tes proches ? Mets l'adresse du script et le code des appareils dans un fichier `android-app/cave.local.json` :

```json
{ "adresse": "https://script.google.com/macros/s/…/exec", "code": "1a2b-3c4d-5e6f-7a8b" }
```

`npm run apk` les intègre alors à l'APK. Au premier lancement, l'appli est déjà reliée à la cave et demande seulement « Qui es-tu ? ». Un appareil déjà relié garde ses réglages.

- **Le code reste sur ce PC** : le fichier n'est copié ni dans la page web ni ailleurs que dans l'APK.
- **N'envoie pas l'APK par message ni par un lien public** : quiconque l'installe a accès à la cave. Installe-le toi-même avec le câble.
- **Si l'APK a circulé** : change le code dans les propriétés du script (efface `SECRET`, puis exécute `installer`), mets le nouveau code dans `cave.local.json`, reconstruis l'APK et réinstalle-le partout.
- C'est le code des **appareils**. Le jeton de la routine (`ROUTINE_TOKEN`) n'est jamais mis dans l'appli : il reste dans le script.

## Différences avec la page web

- **Photo** : « Photographier l'étiquette » ouvre le scanner de documents de Google. Il repère l'étiquette pendant qu'on vise, la recadre et la redresse, et on peut ajuster les coins à la main. Il en va de même pour « Prendre une photo » dans l'ajout par photos (plusieurs étiquettes d'un coup) et pour « Scanner une étiquette » dans Conseil. Réglages › Photos d'étiquettes permet de revenir à l'appareil photo habituel ; c'est aussi lui qui sert si le scanner manque sur l'appareil (pas de services Google). Le lien « Choisir dans la galerie » permet de prendre une photo déjà faite.
- **Vu en ligne** : sur la page d'un vin, dans le navigateur du téléphone, Partager › Pampre ouvre Conseil et lit la page aussitôt, gratuitement (catalogue, ta cave, vos avis). L'appli lit elle-même la page : pas besoin de relais, quelle que soit la cave. L'avis de Pampre reste derrière son bouton.
- **Bouton retour d'Android** : il ferme la fenêtre ouverte, puis revient à la cave, puis quitte l'appli.
- **Export des données** : le fichier passe par le menu de partage (Drive, e-mail…).
- **Invitation** : le lien envoyé pointe vers la page web, dont l'adresse est retenue par le script dès qu'elle a été ouverte une fois. Tant que ce n'est pas le cas, l'appli envoie un code à coller dans le champ « Adresse du script ».

## Mettre à jour l'appli

Quand `index.html` change, reprends l'étape 3 (`npm run apk` puis `npm run install-phone`). Les données de l'appli sont conservées.

L'appli est signée avec la clé de développement du PC : `~/.android/debug.keystore`. C'est aussi celle qui signe l'APK publié sur GitHub (secret `ANDROID_KEYSTORE_B64` du dépôt), si bien qu'on peut installer l'un par-dessus l'autre. **Sauvegarde ce fichier.** Un APK signé avec une autre clé ne peut pas mettre à jour l'appli : il faudrait d'abord la désinstaller, puis tout récupérer à la synchro après l'avoir reliée de nouveau.

`npm run apk` construit l'APK de ta famille (`dist/ma-cave-maison.apk`, relié à ta cave si `cave.local.json` existe) ; `npm run apk:generique` construit l'APK vierge (`dist/ma-cave.apk`).

## En cas de problème

| Problème | Solution |
|---|---|
| `npm run phones` n'affiche aucun appareil | Essaie un autre câble ou un autre port USB, et vérifie que le débogage USB est activé |
| `unauthorized` | Accepte la demande sur l'écran du téléphone ; au besoin, débranche et rebranche |
| `INSTALL_FAILED_UPDATE_INCOMPATIBLE` | L'appli installée a été signée ailleurs : désinstalle-la du téléphone, puis recommence |
| La construction échoue sur « non-ASCII characters » | Le réglage `android.overridePathCheck=true` doit rester dans `android-app/android/gradle.properties` (ton dossier utilisateur contient « é ») |
