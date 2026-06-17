import puppeteer from 'puppeteer';

const ADMIN_URL = 'http://localhost:5173/admin';
const OVERLAY_URL = 'http://localhost:5173/overlay';

const browser = await puppeteer.launch({
  headless: true,
  executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  args: ['--no-sandbox', '--disable-gpu'],
  defaultViewport: { width: 1920, height: 1080 },
});

// Admin screenshot
const adminPage = await browser.newPage();
await adminPage.goto(ADMIN_URL, { waitUntil: 'networkidle2', timeout: 15000 });
await adminPage.screenshot({ path: 'admin.png', fullPage: false });
console.log('admin.png saved');

// Overlay screenshot
const overlayPage = await browser.newPage();
await overlayPage.goto(OVERLAY_URL, { waitUntil: 'networkidle2', timeout: 15000 });
await overlayPage.screenshot({ path: 'overlay.png', fullPage: false });
console.log('overlay.png saved');

await browser.close();
console.log('Done.');
