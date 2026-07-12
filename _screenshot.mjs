import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
await page.goto('https://www.embark-studios.com/', { waitUntil: 'load', timeout: 30000 });
await page.waitForTimeout(5000);

const info = await page.evaluate(() => {
  // Check videos more carefully
  const videos = document.querySelectorAll('video');
  const videoDetails = Array.from(videos).map(v => {
    const src = v.querySelector('source')?.src || v.src;
    const cs = window.getComputedStyle(v);
    return {
      src,
      currentSrc: v.currentSrc,
      width: v.videoWidth,
      height: v.videoHeight,
      duration: v.duration,
      position: cs.position,
      zIndex: cs.zIndex,
      opacity: cs.opacity,
      top: cs.top,
      left: cs.left,
      width_css: cs.width,
      height_css: cs.height,
      objectFit: cs.objectFit,
      parent: v.parentElement?.tagName,
      parentClasses: v.parentElement?.className
    };
  });
  
  // Check for iframes
  const iframes = document.querySelectorAll('iframe');
  const iframeDetails = Array.from(iframes).map(f => ({ src: f.src, id: f.id }));
  
  // Check all background-images in the page
  const allBgImages = new Set();
  document.querySelectorAll('*').forEach(el => {
    const bg = window.getComputedStyle(el).backgroundImage;
    if (bg && bg !== 'none') allBgImages.add(bg);
  });
  
  // Check first section's inner elements
  const firstSection = document.querySelector('section');
  const sectionHTML = firstSection?.innerHTML?.substring(0, 2000);
  
  return {
    videos: videoDetails,
    iframes: iframeDetails,
    bgImages: Array.from(allBgImages).slice(0, 10),
    firstSectionHTML: sectionHTML,
    // Look for Squarespace background wrapper
    bgWrapper: document.querySelector('.section-background')?.innerHTML?.substring(0, 1000),
  };
});

console.log(JSON.stringify(info, null, 2));
await browser.close();
