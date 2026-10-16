# Prototype : Ma cave sans script

Ce prototype vérifie, avant de toucher à l'appli, que la cave peut vivre dans le Drive du propriétaire sans script Google, avec le seul accès « fichiers créés ou désignés dans l'appli » (`drive.file`). Il répond à quatre questions :

1. L'appli d'un invité voit-elle la cave partagée sans qu'il la désigne ? (attendu : non)
2. Désigner le **dossier** de la cave suffit-il, ou faut-il désigner le **fichier** `cave.json` ?
3. Les photos partagées par lien sont-elles lisibles par les applis des autres membres ?
4. Le propriétaire peut-il « adopter » les photos d'un invité (les recréer à son nom), puis l'invité supprimer ses originaux ?

C'est une page web. Le même prototype tourne aussi dans l'APK d'essai, pour une cinquième question :

5. Dans l'appli Android, la connexion Google et le sélecteur de fichiers marchent-ils ? Google les refuse dans une WebView : l'appli passe par les services Google du téléphone (voir « Dans l'appli Android », plus bas).

## Préparer le projet Google Cloud (une fois, 15 minutes)

1. Sur [console.cloud.google.com](https://console.cloud.google.com/), crée un projet nommé « Ma cave ».
2. **API et services › Bibliothèque** : active **Google Drive API** et **Google Picker API**.
3. **Google Auth Platform** (écran de consentement OAuth) › **Commencer** :
   - nom de l'appli : « Ma cave », ton adresse en e-mail d'assistance ;
   - audience : **Externe** ;
   - dans **Accès aux données**, ajoute le champ d'application `https://www.googleapis.com/auth/drive.file` ;
   - dans **Audience › Utilisateurs test**, ajoute ton compte Google et celui qui jouera l'invité.
4. **Clients › Créer un client** : type **Application Web**, origine JavaScript autorisée `http://localhost:8765`. Note l'**ID client**.
5. **API et services › Identifiants › Créer des identifiants › Clé API**. Dans ses restrictions :
   - restriction d'application **Sites Web** : `http://localhost:8765/*` ;
   - restriction d'API : **Google Drive API** et **Google Picker API**.
   Note la **clé**.
6. Sur l'accueil du projet, note le **numéro du projet** (« Project number », des chiffres seulement).
7. Copie `config.example.js` en `config.local.js` et remplis les trois valeurs. Ce fichier n'est jamais publié.
8. Pour l'appli Android, deux ajouts dans le même projet :
   - **Clients › Créer un client**, type **Android** : nom du paquet `fr.macave.app.essai`, empreinte du certificat SHA-1 `74:59:60:62:67:BD:D8:B6:A1:A8:24:F2:93:93:AA:DC:6D:C6:01:02` (celle de la clé qui signe tes APK). Rien à recopier ensuite : Google reconnaît l'appli à son paquet et à sa signature. Tu peux créer tout de suite un second client Android pour `fr.macave.app`, avec la même empreinte : il servira à l'appli habituelle ;
   - dans les restrictions de la **clé API**, ajoute le site `https://localhost/*` (l'adresse des pages dans l'appli) à côté de `http://localhost:8765/*`.

## Lancer le test

Il faut deux comptes Google et deux profils de navigateur (ton profil habituel, et un autre profil ou une fenêtre InPrivate connectée au compte invité).

```
node prototypes/drive-direct/serve.js
```

Puis ouvre `http://localhost:8765` dans les deux profils.

### D'abord le parcours simple (5 minutes)

C'est celui que vivrait chacun dans l'appli : rien à installer, aucun identifiant à recopier.

| Où | Étapes |
|---|---|
| Profil 1, toi | Se connecter, **A** (donne un nom à la cave), **B** avec l'adresse Google de l'invité : le lien d'invitation est copié |
| Profil 2, l'invité | Colle le lien dans la barre d'adresse, se connecter, **C** (confirmer la cave dans le sélecteur de Google), puis **D** |
| Profil 1 | **D** : ta cave apparaît dans « Mes caves » |

À vérifier : l'invité confirme la cave en un seul geste, et « Mes caves » retrouve chaque cave avec son rôle (propriétaire ou invité). Ouvre aussi le prototype dans une **troisième** fenêtre, connectée au compte de l'invité, et touche **D** : la cave doit y apparaître sans rien refaire (c'est ce qui permettra de retrouver ses caves sur un nouveau téléphone).

### Ensuite les tests détaillés

| Où | Étapes |
|---|---|
| Profil 1, **Propriétaire** | Se connecter, cocher « Synchroniser mes photos », **P1**, **P2** deux fois, **P3** avec l'adresse de l'invité |
| Profil 2, **Invité** | Se connecter, cocher la case, **I1** (coller l'ID affiché chez le propriétaire), **I2**, **I3**, **I4**, **I5** |
| Profil 1 | **P4** (adopter), puis **P5** |
| Profil 2 | **I6**, puis **I4** |

Termine par **Copier le journal** dans chaque profil, et colle les deux journaux dans la conversation.

Pour recommencer : « Tout oublier sur ce navigateur », puis supprime le dossier « Ma cave (prototype) » du Drive.

## Dans l'appli Android

L'APK d'essai (« Ma cave v2 ») embarque ce prototype : **Réglages**, tout en bas, **Essai : une cave dans Google Drive**. La page est la même, mais « Se connecter » et les sélecteurs ouvrent les écrans Google du téléphone au lieu de ceux du navigateur (plugin GoogleDrive de l'appli, accès `drive.file` seulement).

Il faut l'étape 8 ci-dessus. Puis, sur le téléphone :

1. **Se connecter avec Google** : choisis ton compte, accepte l'accès aux fichiers créés ou désignés dans l'appli.
2. **A**, puis **B** avec l'adresse Google de l'invité : le lien d'invitation est copié (il mène au prototype web, `http://localhost:8765`).
3. Côté invité (un autre téléphone avec l'APK d'essai, ou le même après avoir changé de compte à la connexion) : colle le lien dans le champ de l'étape **C**, puis **Rejoindre** : le sélecteur de Google ne doit montrer que le fichier de la cave. Confirme, puis **D**.

On peut aussi mélanger : la cave créée dans le navigateur, rejointe depuis le téléphone, ou l'inverse. **Copier le journal** ouvre la feuille de partage d'Android : envoie-le-toi, puis colle-le dans la conversation.

Si « Se connecter » répond une erreur 10 (DEVELOPER_ERROR), c'est que le client Android manque ou que son empreinte SHA-1 ne correspond pas.
