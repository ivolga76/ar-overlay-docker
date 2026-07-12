import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });

// Try to access the CodePen directly
await page.goto('https://codepen.io/beshoooo/pen/jmbGNd', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(5000);

// Extract the code from CodePen's editor
const code = await page.evaluate(() => {
  // CodePen stores code in textareas or pre elements
  const htmlEditor = document.querySelector('.code-box .CodeMirror');
  const lines = document.querySelectorAll('.CodeMirror-line');
  
  // Try getting code from CodePen's data
  const penData = window.__DATA__ || window.__INITIAL_STATE__;
  
  // Also try grabbing from iframe
  const resultIframe = document.querySelector('iframe[name*="result"]');
  
  return {
    hasPenData: !!penData,
    linesCount: lines.length,
    lineTexts: Array.from(lines).slice(0, 30).map(l => l.textContent),
    title: document.title,
    bodyText: document.body.innerText?.substring(0, 500)
  };
});

console.log(JSON.stringify(code, null, 2));

// Try the "full page" version
await page.goto('https://codepen.io/beshoooo/full/jmbGNd', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(3000);

const fullPage = await page.evaluate(() => {
  const style = document.querySelector('style');
  const bodyStyle = window.getComputedStyle(document.body);
  const htmlStyle = window.getComputedStyle(document.documentElement);
  
  // Get all style tags
  const styles = Array.from(document.querySelectorAll('style')).map(s => s.textContent?.substring(0, 500));
  
  // Get background info of all elements
  const bgElements = Array.from(document.querySelectorAll('div, section, body, html')).filter(el => {
    const bg = window.getComputedStyle(el).backgroundImage;
    return bg && bg !== 'none';
  }).map(el => ({
    tag: el.tagName,
    classes: el.className,
    bg: window.getComputedStyle(el).background,
    bgImage: window.getComputedStyle(el).backgroundImage,
    animation: window.getComputedStyle(el).animation
  }));
  
  return {
    title: document.title,
    bodyBg: bodyStyle.background,
    bodyBgImage: bodyStyle.backgroundImage,
    bodyAnimation: bodyStyle.animation,
    htmlBg: htmlStyle.backgroundImage,
    styleTags: styles,
    bgElements,
    innerHTML: document.body.innerHTML?.substring(0, 2000)
  };
});

console.log(JSON.stringify(fullPage, null, 2));

await browser.close();
