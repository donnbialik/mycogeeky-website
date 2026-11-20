#!/usr/bin/env node
/**
 * Print the provisional taxonomist beginner guide to the downloadable PDF, from the same page the website serves,
 * so the web page and the PDF never drift apart. Re-run after editing the guide page.
 *
 *   npm run build && npx astro preview &      # serves the built site on http://localhost:4321
 *   node scripts/guide-pdf.mjs                 # or give another local port: node scripts/guide-pdf.mjs 4322
 *
 * The page is opened with ?pdf, which makes it point its own links at https://mycoview.com, so links in the
 * PDF go to the real site rather than to localhost.
 *
 * Needs Google Chrome or Chromium (set CHROME=/path/to/chrome if it isn't found).
 * Writes public/downloads/provisional-taxonomist-beginner-guide.pdf. The page's print styles live in site.css.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';

const port = process.argv[2] || '4321';
const out = 'public/downloads/provisional-taxonomist-beginner-guide.pdf';
const candidates = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const chrome = candidates.find((c) => existsSync(c));
if (!chrome) { console.error('Chrome not found; set CHROME=/path/to/chrome'); process.exit(1); }

mkdirSync('public/downloads', { recursive: true });
execFileSync(chrome, [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-pdf-header-footer',
  '--no-proxy-server',
  '--virtual-time-budget=8000', `--print-to-pdf=${out}`,
  `http://localhost:${port}/investigate/provisional-taxonomist/guide/?pdf`,
], { stdio: 'inherit' });
console.log(`${out} (${Math.round(statSync(out).size / 1024)} KB)`);
