import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotDir = path.join(__dirname, 'temporary screenshots');

const url = process.argv[2] || 'http://localhost:3000';
const selector = process.argv[3] || '#resources';
const label = process.argv[4] || 'section';

const existing = fs.readdirSync(screenshotDir).filter(f => f.startsWith('screenshot-'));
const nums = existing.map(f => parseInt(f.match(/screenshot-(\d+)/)?.[1] || 0));
const next = Math.max(0, ...nums) + 1;
const filename = `screenshot-${next}-${label}.png`;

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

  // Auto-scroll
  await page.evaluate(async () => {
    await new Promise(resolve => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= document.body.scrollHeight) {
          clearInterval(timer);
          setTimeout(resolve, 500);
        }
      }, 100);
    });
  });

  // Force visible
  await page.evaluate(() => {
    document.querySelectorAll('[style]').forEach(el => {
      if (el.style.opacity === '0') {
        el.style.opacity = '1';
        el.style.transform = 'translateY(0)';
      }
    });
  });

  await new Promise(r => setTimeout(r, 500));

  const element = await page.$(selector);
  if (!element) {
    console.error(`Selector "${selector}" not found`);
    await browser.close();
    process.exit(1);
  }

  const filePath = path.join(screenshotDir, filename);
  await element.screenshot({ path: filePath });
  console.log(`Saved: ${filePath}`);
  await browser.close();
})();
