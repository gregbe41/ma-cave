// Logo de Tastevin : une bouteille et, devant elle, le tastevin (la coupelle du sommelier) avec son vin et son anneau,
// et l'étincelle de Tastevin. Dessin sur 100×100 = la zone visible d'une icône Android (le cercle inscrit) ;
// tout tient dans un rayon de 42 autour du centre, la zone sûre de tous les masques.
// Le même dessin est recopié dans index.html (en-tête du grand écran et icône de l'onglet).
const COULEURS = { bg: '#E8A13A', bottle: '#1E1610', label: '#E8A13A', ink: '#1E1610', cup: '#F4EFE7', cupShade: '#D9D1C4', wine: '#7A1E2C', shine: '#B8485A', spark: '#1E1610' };

function dessin(c = COULEURS) {
  return `
    <path d="M36.6 14.6h6.8v8.2c0 3.2 1.1 5 3.4 7.3 2.9 2.9 4.2 5.6 4.2 9.8V80a4 4 0 0 1-4 4H33a4 4 0 0 1-4-4V39.9c0-4.2 1.3-6.9 4.2-9.8 2.3-2.3 3.4-4.1 3.4-7.3z" fill="${c.bottle}"/>
    <rect x="36.2" y="13.4" width="7.6" height="5.6" rx="1.3" fill="${c.bottle}"/>
    <rect x="31.8" y="52" width="16.4" height="17" rx="1.8" fill="${c.label}"/>
    <path d="M35.6 58.2h8.8M37.2 62.6h5.6" stroke="${c.bottle}" stroke-width="1.6" stroke-linecap="round"/>
    <g transform="translate(62.5 71.2) scale(1.16) translate(-63 -69.6)">
      <path d="M47.6 69.6c.4 6.6 7 11.4 15.4 11.4s15-4.8 15.4-11.4z" fill="${c.cup}" stroke="${c.ink}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M51.8 75.6c3 2.2 6.9 3.4 11.2 3.4" fill="none" stroke="${c.cupShade}" stroke-width="1.7" stroke-linecap="round"/>
      <ellipse cx="63" cy="69.6" rx="15.4" ry="4.8" fill="${c.cup}" stroke="${c.ink}" stroke-width="2"/>
      <ellipse cx="63" cy="70" rx="12.2" ry="3.2" fill="${c.wine}"/>
      <path d="M59.6 70.5c1.1-1.4 5.7-1.4 6.8 0" fill="none" stroke="${c.shine}" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M78.2 69.4h2" stroke="${c.ink}" stroke-width="2.1" stroke-linecap="round"/>
      <circle cx="83.3" cy="69.4" r="3.3" fill="none" stroke="${c.ink}" stroke-width="2.3"/>
    </g>
    <path d="M70 41.2c.55 3 1.85 4.3 4.85 4.85-3 .55-4.3 1.85-4.85 4.85-.55-3-1.85-4.3-4.85-4.85 3-.55 4.3-1.85 4.85-4.85z" fill="${c.spark}"/>`;
}
/** fond : 'carre' (plein), 'rond', 'arrondi' (icône d'avant Android 8, avec une petite marge) ou '' (dessin seul). */
function svg(px, fond = 'carre', c = COULEURS) {
  const bg = { carre: `<rect width="100" height="100" fill="${c.bg}"/>`, rond: `<circle cx="50" cy="50" r="50" fill="${c.bg}"/>`, arrondi: `<rect x="4" y="4" width="92" height="92" rx="18" fill="${c.bg}"/>` }[fond] || '';
  const inner = fond === 'arrondi' ? `<g transform="translate(4 4) scale(.92)">${dessin(c)}</g>` : dessin(c);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${px}" height="${px}">${bg}${inner}</svg>`;
}
module.exports = { COULEURS, dessin, svg };
