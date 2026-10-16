# Prototype : Ma cave sans script

Ce prototype vérifie, avant de toucher à l'appli, que la cave peut vivre dans le Drive du propriétaire sans script Google, avec le seul accès « fichiers créés ou désignés dans l'appli » (`drive.file`). Il répond à quatre questions :

1. L'appli d'un invité voit-elle la cave partagée sans qu'il la désigne ? (attendu : non)
2. Désigner le **dossier** de la cave suffit-il, ou faut-il désigner le **fichier** `cave.json` ?
3. Les photos partagées par lien sont-elles lisibles par les applis des autres membres ?
4. Le propriétaire peut-il « adopter » les photos d'un invité (les recréer à son nom), puis l'invité supprimer ses originaux ?

C'est une page web : la connexion Google dans l'appli Android se vérifiera dans un second temps.

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

## Lancer le test

Il faut deux comptes Google et deux profils de navigateur (ton profil habituel, et un autre profil ou une fenêtre InPrivate connectée au compte invité).

```
node prototypes/drive-direct/serve.js
```

Puis ouvre `http://localhost:8765` dans les deux profils.

| Où | Étapes |
|---|---|
| Profil 1, **Propriétaire** | Se connecter, cocher « Synchroniser mes photos », **P1**, **P2** deux fois, **P3** avec l'adresse de l'invité |
| Profil 2, **Invité** | Se connecter, cocher la case, **I1** (coller l'ID affiché chez le propriétaire), **I2**, **I3**, **I4**, **I5** |
| Profil 1 | **P4** (adopter), puis **P5** |
| Profil 2 | **I6**, puis **I4** |

Termine par **Copier le journal** dans chaque profil, et colle les deux journaux dans la conversation.

Pour recommencer : « Tout oublier sur ce navigateur », puis supprime le dossier « Ma cave (prototype) » du Drive.
