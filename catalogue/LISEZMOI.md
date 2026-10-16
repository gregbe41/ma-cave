# Catalogue des vins français

`lwin-france.json` sert à la fenêtre **« Vins similaires »** de la fiche d'un vin : autres vins du même domaine, de la même appellation, du même cépage ou de la même région. L'appli le charge à la première ouverture de cette fenêtre. Sans lui (hors ligne, page ouverte en fichier), elle propose quand même les vins proches de la cave et l'avis de Claude.

## Source et licence

C'est un extrait de la base **LWIN** de Liv-ex ([liv-ex.com/lwin](https://www.liv-ex.com/lwin/)), publiée sous licence Creative Commons Attribution 4.0 ([conditions](https://www.liv-ex.com/lwin-creative-commons-licence/)). La licence permet de la redistribuer et de la modifier, y compris pour un usage commercial, à condition de citer Liv-ex, de donner le lien vers la licence et de signaler les modifications. L'appli le fait en bas de la fenêtre « Vins similaires », et le fichier lui-même le rappelle (`source`, `modifications`).

Modifications apportées par `construire.py` :

- seuls les vins français en activité sont gardés (environ 62 600 sur 212 000 lignes), sans les alcools, cidres ni caisses assorties ;
- cinq colonnes : producteur, nom (appellation, cuvée, climat), appellation, région et couleur ;
- les accents des mots courants sont rétablis (« Chateau » → « Château », « Cotes du Rhone » → « Côtes du Rhône ») ;
- couleurs et régions sont traduites dans celles de l'appli : les effervescents et les liquoreux (vins doux naturels, Sauternes, vendanges tardives…) ont leur couleur propre, « Burgundy » devient « Bourgogne ».

LWIN ne donne ni cépage, ni millésime, ni garde, ni prix. Les cépages viennent de la fiche, du nom du vin (« Riesling », « Blanc de Blancs ») ou de l'appellation (table `APP_GRAPES` de index.html).

## Mettre à jour

```
python -I catalogue/construire.py
```

télécharge la dernière base (environ 25 Mo, sans formulaire) depuis `https://s3-eu-west-1.amazonaws.com/lwin-dictionary/latest/LWINdatabase.xlsx` et réécrit `lwin-france.json` (environ 3 Mo, 750 Ko compressé). Pour partir d'un fichier déjà téléchargé : `python -I catalogue/construire.py chemin/LWINdatabase.xlsx`. Bibliothèque standard de Python seulement.

Le fichier .xlsx n'est jamais versionné. L'appli Android embarque `lwin-france.json` (copié par `android-app/scripts/copy-web.js`), et GitHub Pages le sert à côté de index.html.
