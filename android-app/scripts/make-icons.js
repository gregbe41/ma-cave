// Dessine l'icône de l'appli (le logo de Tastevin, scripts/logo.js) dans toutes les tailles Android, directement dans
// android/app/src/main/res/mipmap-* : ic_launcher (carré arrondi, Android 7 et avant), ic_launcher_round, et les deux
// calques de l'icône adaptative (ic_launcher_foreground, ic_launcher_background) que mipmap-anydpi-v26 assemble.
// Copie aussi le logo en 1024 px dans assets/. Usage : node scripts/make-icons.js "<chemin vers msedge.exe ou chrome.exe>"
// (playwright-core doit être trouvable : par exemple NODE_PATH=<dossier node_modules qui le contient>).
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');
const { COULEURS, svg } = require('./logo');

const res = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');
const TAILLES = { ldpi: 36, mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
const fichiers = px => ({
  'ic_launcher.png': svg(px, 'arrondi'),
  'ic_launcher_round.png': svg(px, 'rond'),
  'ic_launcher_foreground.png': svg(px, ''),
  'ic_launcher_background.png': `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}"><rect width="${px}" height="${px}" fill="${COULEURS.bg}"/></svg>`,
});

(async () => {
  const browser = await chromium.launch({ executablePath: process.argv[2], headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  const rendre = async (content, px, out) => {
    await page.setContent(`<html><body style="margin:0;background:transparent">${content.replace('<svg ', '<svg style="display:block" ')}</body></html>`);
    await page.screenshot({ path: out, clip: { x: 0, y: 0, width: px, height: px }, omitBackground: true });
  };
  for (const [d, px] of Object.entries(TAILLES)) {
    for (const [name, content] of Object.entries(fichiers(px))) {
      await rendre(content, px, path.join(res, `mipmap-${d}`, name));
    }
    console.log(`mipmap-${d} (${px} px)`);
  }
  const assets = path.join(__dirname, '..', 'assets');
  fs.mkdirSync(assets, { recursive: true });
  await rendre(svg(1024, 'carre'), 1024, path.join(assets, 'icon-only.png'));
  await rendre(svg(1024, ''), 1024, path.join(assets, 'icon-foreground.png'));
  await rendre(fichiers(1024)['ic_launcher_background.png'], 1024, path.join(assets, 'icon-background.png'));
  console.log('assets/icon-only.png, icon-foreground.png, icon-background.png');
  await browser.close();
})();
