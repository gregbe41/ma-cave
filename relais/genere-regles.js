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

const CONSTANTES = ['MODEL', 'MAX_TOKENS', 'COLORS', 'FORMATS', 'ACCORDS', 'LABEL_FIELDS', 'NO_CHECK', 'BUDGETS', 'LIENS', 'IMAGE_TYPES',
  'LABEL_SCHEMA', 'LABEL_PROMPT', 'REVOIR_PROMPT', 'CONSEIL_SCHEMA', 'CONSEIL_PROMPT', 'SUGG_SCHEMA', 'SUGG_PROMPT', 'COTE_SCHEMA', 'COTE_PROMPT'];
const FONCTIONS = ['list', 'num', 'int', 'str', 'norm', 'colorKey', 'accordList', 'tidyLabel', 'tidyConseil', 'tidySuggest'];

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
