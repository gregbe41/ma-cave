"""Construit catalogue/lwin-france.json, le catalogue des vins français de l'appli, à partir de la base LWIN de Liv-ex.

La base LWIN est publiée sous licence Creative Commons Attribution 4.0 :
https://www.liv-ex.com/lwin-creative-commons-licence/
Ce script n'en garde qu'un extrait (vins français en activité), simplifie les colonnes,
rétablit les accents des mots courants et traduit couleurs et régions : ces changements
sont indiqués dans le fichier produit, comme la licence le demande.

Usage :
  python -I catalogue/construire.py                      télécharge la dernière base (25 Mo)
  python -I catalogue/construire.py LWINdatabase.xlsx    part d'un fichier déjà téléchargé
Bibliothèque standard uniquement : le .xlsx est lu comme une archive zip de XML.
"""
import datetime, json, re, sys, tempfile, urllib.request, zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

URL = 'https://s3-eu-west-1.amazonaws.com/lwin-dictionary/latest/LWINdatabase.xlsx'
OUT = Path(__file__).resolve().parent / 'lwin-france.json'
NS = '{http://schemas.openxmlformats.org/spreadsheetml/2006/main}'

# Régions LWIN → grandes régions de l'appli ; les autres gardent leur nom.
REGIONS = {
    'Burgundy': 'Bourgogne', 'Rhone': 'Rhône', 'Sud Ouest': 'Sud-Ouest', 'Corsica': 'Corse', "Pays d'Oc": 'Languedoc',
    'Cotes Catalanes': 'Roussillon', 'Mediterranee': 'Provence', 'Vaucluse': 'Rhône', 'Gard': 'Languedoc', 'Cevennes': 'Languedoc',
    'Comtes Rhodaniens': 'Rhône', 'Coteaux du Lyonnais': 'Rhône', 'Isere': 'Savoie', 'Coteaux Champenois': 'Champagne',
    'Franche-Comte': 'Jura', 'Dijon': 'Bourgogne', "Coteaux de l'Auxois": 'Bourgogne', 'Coteaux de Tannay': 'Bourgogne',
    'Brittany': 'Loire', 'Urfe': 'Loire', 'Auvergne': 'Loire', 'Puy de Dome': 'Loire', 'Ile de France': 'Île-de-France',
    'Normandy': 'Normandie', 'Charentais': 'Charentes',
}
# Appellations de vins liquoreux ou doux : LWIN ne distingue pas un blanc sec d'un liquoreux.
DOUX = re.compile(r"^(Sauternes|Barsac|Loupiac|Cadillac|Sainte-Croix-du-Mont|Cerons|Graves Superieures|Monbazillac|Saussignac|"
                  r"Coteaux du Layon.*|Bonnezeaux|Quarts de Chaume|Coteaux de l'Aubance|Banyuls.*|Maury|Rivesaltes|Muscat de .*|"
                  r"Beaumes de Venise|Pineau des Charentes|Macvin du Jura|Ratafia de Champagne)$")
DOUX_NOM = re.compile(r'\b(Vendanges Tardives|Selection de Grains Nobles|SGN|Moelleux|Liquoreux|Vin de Paille|Passerille|Vin Doux)\b', re.I)
# Mots courants dont LWIN a retiré les accents.
ACCENTS = dict(w.split('=') for w in '''
Chateau=Château Chateaux=Châteaux Chateauneuf=Châteauneuf Chateaumeillant=Châteaumeillant Chalon=Châlon Cote=Côte Cotes=Côtes
Rhone=Rhône Cuvee=Cuvée Cuvees=Cuvées Pere=Père Freres=Frères Aine=Aîné Romanee=Romanée Emilion=Émilion Medoc=Médoc
Leognan=Léognan Estephe=Estèphe Reserve=Réserve Selection=Sélection Cremant=Crémant Superieur=Supérieur Superieures=Supérieures
Premieres=Premières Fuisse=Fuissé Loche=Loché Veran=Véran Clesse=Clessé Aligote=Aligoté Echezeaux=Échezeaux Batard=Bâtard
Tache=Tâche Beze=Bèze Mazoyeres=Mazoyères Latricieres=Latricières Perrieres=Perrières Genevrieres=Genevrières Greves=Grèves
Millesime=Millésime Tete=Tête Prieure=Prieuré Chene=Chêne Elegance=Élégance Eglise=Église Annee=Année Vallee=Vallée
Mediterranee=Méditerranée Herault=Hérault Corbieres=Corbières Faugeres=Faugères Costieres=Costières Nimes=Nîmes Beziers=Béziers
Desert=Désert Duche=Duché Uzes=Uzès Cite=Cité Peray=Péray Ardeche=Ardèche Drome=Drôme Adhemar=Adhémar Gres=Grès
Jurancon=Jurançon Irouleguy=Irouléguy Pecharmant=Pécharmant Perigord=Périgord Cerons=Cérons Pourcain=Pourçain Regnie=Régnié
Julienas=Juliénas Chenas=Chénas Jasnieres=Jasnières Savennieres=Savennières Coulee=Coulée Sevre=Sèvre Vendomois=Vendômois
Valencay=Valençay Vendeens=Vendéens Orleans=Orléans Clery=Cléry Vezelay=Vézelay Cumieres=Cumières Ecueil=Écueil
Bergeres=Bergères Charite=Charité Etoile=Étoile Beaute=Beauté Ile=Île Sartene=Sartène Ribeauville=Ribeauvillé Rotie=Rôtie
Andre=André Rene=René Frederic=Frédéric Gerard=Gérard Francois=François Francoise=Françoise Stephane=Stéphane Jerome=Jérôme
Etienne=Étienne Leon=Léon Clement=Clément Benoit=Benoît Remy=Rémy Helene=Hélène Celine=Céline Valerie=Valérie Cecile=Cécile
Classe=Classé General=Général Sebastien=Sébastien Gregoire=Grégoire Frederique=Frédérique Theo=Théo Noel=Noël Joel=Joël Raphael=Raphaël Michele=Michèle
'''.split())
PARTICULES = {'Moulin-a-Vent': 'Moulin-à-Vent', 'Ay': 'Aÿ', 'Mareuil-sur-Ay': 'Mareuil-sur-Aÿ'}


def accents(s):
    s = PARTICULES.get(s, s)
    s = re.sub(r"[A-Za-z]+", lambda m: ACCENTS.get(m.group(0), m.group(0)), s)
    s = re.sub(r"\b(\d)eme\b", r"\1e", s)  # « 3eme Cru Classe » → « 3e Cru Classé »
    # « Rose » est la couleur (Brut Rose, Rose de Loire), sauf dans un nom (Clos de la Rose).
    return re.sub(r"(?<!la )(?<!La )\bRose\b", 'Rosé', s).replace('Moulin-a-Vent', 'Moulin-à-Vent')


def rows(path):
    with zipfile.ZipFile(path) as z:
        shared = [''.join(t.text or '' for t in si.iter(NS + 't')) for si in ET.parse(z.open('xl/sharedStrings.xml')).getroot().findall(NS + 'si')]
        sheet = sorted(n for n in z.namelist() if n.startswith('xl/worksheets/sheet'))[0]
        head = None
        for _, el in ET.iterparse(z.open(sheet)):
            if el.tag != NS + 'row':
                continue
            row = {}
            for c in el.findall(NS + 'c'):
                v = c.find(NS + 'v')
                if c.get('t') == 'inlineStr':
                    val = ''.join(t.text or '' for t in c.iter(NS + 't'))
                else:
                    val = (shared[int(v.text)] if c.get('t') == 's' else v.text) if v is not None else ''
                row[re.match(r'[A-Z]+', c.get('r')).group(0)] = (val or '').strip()
            el.clear()
            if head is None:
                head = {k: v.upper() for k, v in row.items()}
                continue
            yield {head[k]: ('' if v == 'NA' else v) for k, v in row.items() if k in head}


def colour(r):
    if r.get('SUB_TYPE') == 'Sparkling':
        return 'e'
    if r.get('TYPE') == 'Fortified Wine' or r.get('SUB_TYPE') == 'Vin Doux Naturel' or DOUX.match(r.get('SUB_REGION', '')) or DOUX_NOM.search(r.get('DISPLAY_NAME', '')):
        return 'l'
    return {'Red': 'r', 'White': 'b', 'Rose': 'o'}.get(r.get('COLOUR'), '')


def main():
    src = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    tmp = None
    if src is None:
        tmp = tempfile.TemporaryDirectory()
        src = Path(tmp.name) / 'LWINdatabase.xlsx'
        print('Téléchargement de', URL)
        urllib.request.urlretrieve(URL, src)
    dicts = {'producteurs': [''], 'appellations': [''], 'regions': ['']}
    index = {k: {'': 0} for k in dicts}

    def ref(kind, v):
        if v not in index[kind]:
            index[kind][v] = len(dicts[kind])
            dicts[kind].append(v)
        return index[kind][v]

    vins, seen = [], 0
    for r in rows(src):
        seen += 1
        if r.get('COUNTRY') != 'France' or r.get('STATUS') != 'Live' or r.get('TYPE') not in ('Wine', 'Fortified Wine', 'Still'):
            continue
        name = r.get('DISPLAY_NAME', '')
        if not name or re.search(r'\b(Assortment|Case)\b', name) or r.get('COLOUR') == 'Mixed':
            continue
        prod = ' '.join(x for x in (r.get('PRODUCER_TITLE'), r.get('PRODUCER_NAME')) if x)
        # Le nom affiché commence en général par le producteur : on garde la suite (appellation, cuvée, climat).
        # Sinon (second vin d'un château, « Alter Ego, Margaux »), il reste entier.
        rest = name
        for p in (prod, r.get('PRODUCER_NAME', '')):
            if p and rest.startswith(p + ', '):
                rest = rest[len(p) + 2:]
                break
        reg = REGIONS.get(r.get('REGION', ''), r.get('REGION', ''))
        vins.append([ref('producteurs', accents(prod or r.get('PRODUCER_NAME', ''))), accents(rest), ref('appellations', accents(r.get('SUB_REGION', ''))), ref('regions', accents(reg)), colour(r)])
    out = {
        'source': 'LWIN, Liv-ex (https://www.liv-ex.com/lwin/), licence CC BY 4.0 (https://www.liv-ex.com/lwin-creative-commons-licence/)',
        'modifications': "Extrait par Ma cave : vins français en activité seulement ; producteur, nom, appellation, région et couleur ; "
                         "accents rétablis sur les mots courants ; couleurs (dont effervescent et liquoreux) et régions traduites.",
        'date': datetime.date.today().isoformat(),
        'colonnes': ['producteur', 'nom', 'appellation', 'region', 'couleur'],
        'couleurs': {'r': 'rouge', 'b': 'blanc', 'o': 'rose', 'e': 'effervescent', 'l': 'liquoreux'},
        **dicts,
        'vins': vins,
    }
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('%d lignes lues, %d vins français gardés, %d producteurs, %d appellations : %s (%d Ko)'
          % (seen, len(vins), len(dicts['producteurs']) - 1, len(dicts['appellations']) - 1, OUT, OUT.stat().st_size // 1024))
    if tmp:
        tmp.cleanup()


main()
