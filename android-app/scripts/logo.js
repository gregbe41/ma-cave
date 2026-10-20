// Logo de Pampre : une bouteille crème, et la pousse de vigne ambre (le pampre) qui grimpe le long de son flanc, pose
// une feuille sur elle et enroule sa vrille autour du col ; l'étincelle de l'IA en haut à droite ; fond nuit.
// Dessin sur 100×100 = la zone visible d'une icône Android (le cercle inscrit) ; tout tient dans un rayon de 42 autour
// du centre, la zone sûre de tous les masques. Là où la pousse passe devant la bouteille, un liseré nuit les sépare.
// Le même dessin est recopié dans index.html (en-tête du grand écran et icône de l'onglet).
const COULEURS = { bg: '#0E1311', bouteille: '#EFE6D4', pousse: '#E8A13A', etincelle: '#F4F2EE' };

function dessin(c = COULEURS) {
  const tige = 'M62 88 C60 79 57.5 71 57.5 62 C57.5 53 55.5 45 50 38.5 C47.5 35.5 46 33 45.5 30.5';
  const vrille = 'M45.5 30.5 C42 27.5 36.5 28.5 34.5 25 C33 22 36.5 19.5 39.2 21 C41.2 22.2 40.4 24.8 38.6 24.6';
  const feuille = 'M0 0 C7 -13 21 -18 33 -14 C29 0 15 7 0 0 Z';
  const nervure = `<path d="M3 -2 C12 -6 20 -9 28 -12" fill="none" stroke="${c.bg}" stroke-width="1.8" stroke-linecap="round"/>`;
  const trait = (d, w, lisere) => `<path d="${d}" fill="none" stroke="${c.bg}" stroke-width="${w + lisere}" stroke-linecap="round" stroke-linejoin="round"/><path d="${d}" fill="none" stroke="${c.pousse}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<path d="M35.8 11 H46.2 V14.2 H45.3 V33 C45.3 40 53.5 40 53.5 47 V84 Q53.5 88 49.5 88 H32.5 Q28.5 88 28.5 84 V47 C28.5 40 36.7 40 36.7 33 V14.2 H35.8 Z" fill="${c.bouteille}"/>
    ${trait(tige, 4, 3.2)}
    <g transform="translate(58.5 74) scale(.62) rotate(-18)"><path d="${feuille}" fill="${c.pousse}"/>${nervure}</g>
    <g transform="translate(57.5 60) scale(-.6 .6) rotate(-26)"><path d="${feuille}" fill="none" stroke="${c.bg}" stroke-width="4.33" stroke-linejoin="round"/><path d="${feuille}" fill="${c.pousse}"/>${nervure}</g>
    ${trait(vrille, 3, 3)}
    <path d="M70 23 C71 28 73 30 78 31 C73 32 71 34 70 39 C69 34 67 32 62 31 C67 30 69 28 70 23 Z" fill="${c.etincelle}"/>`;
}
/** fond : 'carre' (plein), 'rond', 'arrondi' (icône d'avant Android 8, avec une petite marge) ou '' (dessin seul). */
function svg(px, fond = 'carre', c = COULEURS) {
  const bg = { carre: `<rect width="100" height="100" fill="${c.bg}"/>`, rond: `<circle cx="50" cy="50" r="50" fill="${c.bg}"/>`, arrondi: `<rect x="4" y="4" width="92" height="92" rx="18" fill="${c.bg}"/>` }[fond] || '';
  const inner = fond === 'arrondi' ? `<g transform="translate(4 4) scale(.92)">${dessin(c)}</g>` : dessin(c);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}">${bg}${inner}</svg>`;
}
module.exports = { COULEURS, dessin, svg };
