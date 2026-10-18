// Recopie depuis le script de la cave (apps-script/Code.gs) ce que Claude reçoit : consignes, schémas de réponse, et les
// petites fonctions qui nettoient ses réponses. Le relais et le script disent ainsi exactement la même chose à Claude.
//   node relais/genere-regles.js          → réécrit relais/regles.js
//   node relais/genere-regles.js --verifie → échoue si regles.js n'est plus à jour
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ici = path.dirname(fileURLToPath(import.meta.url));
const code = fs.readFileSync(path.join(ici, '..', 'apps-script', 'Code.gs'), 'utf8');
const ctx = vm.createContext({ console });
vm.runInContext(code, ctx, { filename: 'Code.gs' });
const val = n => vm.runInContext(n, ctx);

const CONSTANTES = ['MODEL', 'MAX_TOKENS', 'COLORS', 'FORMATS', 'ACCORDS', 'LABEL_FIELDS', 'NO_CHECK', 'PROFIL_KEYS', 'BUDGETS', 'LIENS', 'IMAGE_TYPES',
  'LABEL_SCHEMA', 'LABEL_PROMPT', 'REVOIR_PROMPT', 'CONSEIL_SCHEMA', 'CONSEIL_PROMPT', 'SUGG_SCHEMA', 'SUGG_PROMPT', 'COTE_SCHEMA', 'COTE_PROMPT',
  'PORTRAIT_SCHEMA', 'PORTRAIT_PROMPT'];
const FONCTIONS = ['list', 'num', 'int', 'str', 'norm', 'colorKey', 'accordList', 'profilLu', 'profilTexte', 'tidyLabel', 'tidyConseil', 'tidySuggest', 'tidyPortrait'];

// Limites de l'API Claude pour les sorties structurées, par requête : au-delà, elle répond 400 « Schema is too complex ».
// (16 champs à union, anyOf ou liste de types ; 24 propriétés facultatives.) Le profil du vin les a dépassées une fois.
for (const n of ['LABEL_SCHEMA', 'CONSEIL_SCHEMA', 'SUGG_SCHEMA', 'COTE_SCHEMA', 'PORTRAIT_SCHEMA']) {
  let unions = 0, facultatifs = 0;
  const parcours = o => {
    if (!o || typeof o !== 'object') return;
    if (o.anyOf || Array.isArray(o.type)) unions++;
    if (o.type === 'object' && o.properties) facultatifs += Object.keys(o.properties).filter(k => !(o.required || []).includes(k)).length;
    Object.values(o).forEach(parcours);
  };
  parcours(val(n));
  if (unions > 16 || facultatifs > 24) {
    console.error(`${n} : ${unions} champs à union (16 au plus) et ${facultatifs} facultatifs (24 au plus) : l'API Claude le refuserait.`);
    process.exit(1);
  }
}

let out = `// Fichier généré par relais/genere-regles.js à partir de apps-script/Code.gs : ne pas le modifier à la main.\n\n`;
for (const n of CONSTANTES) out += `export const ${n} = ${JSON.stringify(val(n), null, 1)};\n`;
out += '\n';
for (const f of FONCTIONS) out += `export ${val(f).toString()}\n`;

const cible = path.join(ici, 'regles.js');
if (process.argv.includes('--verifie')) {
  if (!fs.existsSync(cible) || fs.readFileSync(cible, 'utf8') !== out) {
    console.error('relais/regles.js n\'est plus à jour : lance node relais/genere-regles.js');
    process.exit(1);
  }
  console.log('relais/regles.js est à jour.');
} else {
  fs.writeFileSync(cible, out);
  console.log(`relais/regles.js écrit (${CONSTANTES.length} constantes, ${FONCTIONS.length} fonctions).`);
}
