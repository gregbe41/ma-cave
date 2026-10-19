// Logo de Pampre : une jeune pousse de vigne ambre (le pampre), deux feuilles, sa vrille, et l'étincelle de l'IA, sur
// fond nuit. Dessin sur 100×100 = la zone visible d'une icône Android (le cercle inscrit) ; réduit à 85 % autour du
// centre, tout tient dans un rayon de 42, la zone sûre de tous les masques.
// Le même dessin est recopié dans index.html (en-tête du grand écran et icône de l'onglet).
const COULEURS = { bg: '#0E1311', pousse: '#E8A13A', nervure: '#0E1311', etincelle: '#F4F2EE' };

function dessin(c = COULEURS) {
  return `<g transform="translate(7.5 7.5) scale(.85)">
    <path d="M50 88 C50 72 46 60 51 46 C55 37 55 31 52 26" fill="none" stroke="${c.pousse}" stroke-width="5" stroke-linecap="round"/>
    <path d="M52 55 C59 42 73 37 85 41 C81 55 67 62 52 55 Z" fill="${c.pousse}"/>
    <path d="M55 53 C64 49 72 46 80 43" fill="none" stroke="${c.nervure}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M49 41 C42 31 31 28 19 32 C24 45 37 48 49 41 Z" fill="${c.pousse}"/>
    <path d="M46 40 C39 37 32 35 24 34" fill="none" stroke="${c.nervure}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M52 26 C49 19 55 13 61 16 C66 19 64 26 59 25 C56.5 24.5 56.8 21.5 59 21.5" fill="none" stroke="${c.pousse}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M74 9 C75 14 77 16 82 17 C77 18 75 20 74 25 C73 20 71 18 66 17 C71 16 73 14 74 9 Z" fill="${c.etincelle}"/>
  </g>`;
}
/** fond : 'carre' (plein), 'rond', 'arrondi' (icône d'avant Android 8, avec une petite marge) ou '' (dessin seul). */
function svg(px, fond = 'carre', c = COULEURS) {
  const bg = { carre: `<rect width="100" height="100" fill="${c.bg}"/>`, rond: `<circle cx="50" cy="50" r="50" fill="${c.bg}"/>`, arrondi: `<rect x="4" y="4" width="92" height="92" rx="18" fill="${c.bg}"/>` }[fond] || '';
  const inner = fond === 'arrondi' ? `<g transform="translate(4 4) scale(.92)">${dessin(c)}</g>` : dessin(c);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}">${bg}${inner}</svg>`;
}
module.exports = { COULEURS, dessin, svg };
