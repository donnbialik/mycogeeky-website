import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

// Standalone tools live in public/investigate/<tool>/ (plain HTML), so the sitemap lists them by hand.
const tools = ['provisional-finder', 'its-bin-comparator', 'seasonality-explorer', 'ecology-profile', 'habitat-profiler', 'plan-a-visit', 'foray-report', 'survey-report', 'plate-tagger', 'collection-planner', 'collection-check', 'observation-footprint'];

export default defineConfig({
  output: 'static',
  site: 'https://mycoview.com',
  integrations: [
    react(),
    sitemap({
      customPages: tools.map((t) => `https://mycoview.com/investigate/${t}/`),
      // Keep out the restricted Explorer, the 404 page and the old addresses that only redirect.
      filter: (page) => { const path = new URL(page).pathname; return !path.startsWith('/explorer/') && !path.startsWith('/admin/') && !/^\/(404|curious|explore)\/?$/.test(path); },
    }),
  ],
});
