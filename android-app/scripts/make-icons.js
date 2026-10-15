// Dessine l'icône de l'appli (verre de vin) dans assets/, à partir de laquelle @capacitor/assets génère les icônes Android.
// Usage : node scripts/make-icons.js "<chemin vers msedge.exe ou chrome.exe>"
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright-core');

const WINE = '#6B1D2E', PALE = '#F3E6E9';
const glass = scale => `
  <g transform="translate(512 512) scale(${scale}) translate(-12 -12)" fill="none" stroke="#fff" stroke-width="1.15" stroke-linecap="round" stroke-linejoin="round">
    <path d="M7.3 6.6h9.4l-.25 2.05a4.45 4.45 0 0 1-8.9 0z" fill="${PALE}" stroke="none"/>
    <path d="M6.5 3h11l-.6 5.5a4.9 4.9 0 0 1-9.8 0z"/>
    <path d="M12 13.5V20M8 21h8"/>
  </g>`;
const svg = (bg, scale) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${bg}${glass(scale)}</svg>`;
const files = {
  'icon-only.png': svg(`<rect width="1024" height="1024" fill="${WINE}"/>`, 30),
  'icon-foreground.png': svg('', 22),
  'icon-background.png': `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024"><rect width="1024" height="1024" fill="${WINE}"/></svg>`,
};

(async () => {
  const dir = path.join(__dirname, '..', 'assets');
  fs.mkdirSync(dir, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.argv[2], headless: true });
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });
  for (const [name, content] of Object.entries(files)) {
    await page.setContent(`<html><body style="margin:0;background:transparent">${content}</body></html>`);
    await page.locator('svg').screenshot({ path: path.join(dir, name), omitBackground: true });
    console.log('assets/' + name);
  }
  await browser.close();
})();
