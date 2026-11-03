# MycoGeeky.com — Astro + React Starter

A static-first, modular website foundation for MycoGeeky. **This is a scaffold, not a production deployment.**

## Requirements
Node.js 20.3+ (22 LTS recommended), npm, Git.

## Run locally
```bash
npm install
npm run dev
```
Open http://localhost:4321. Before committing: `npm run check` and `npm run build`.

## Site map
- `/` — Homepage
- `/explore/` — Stories, photography, podcast
- `/curious/` — Curiosity Generator
- `/investigate/` — Research pathway
- `/investigate/learn/` — Research learning
- `/investigate/tools/` — Tool registry
- `/investigate/resources/` — External scientific resources
- `/connect/` — Collaborations, Neo Myco, MycoView
- `/about/` — Personal story and philosophy

## Tools
`src/data/tools.ts` is the central registry. Adding a tool to the registry displays it in the Workbench automatically. **Do not add an `href` until the tool is actually deployed.** Status labels are not scientific certification. Tools can live in separate repositories and be deployed separately, then linked here.

## Deployment
Static output is suitable for Cloudflare Pages or other static hosting. Typical build command: `npm run build`; output directory: `dist`. Hosting costs and API policies should be checked before choosing a provider. Do not cancel Squarespace until the new site and domain are tested.

## Security
Never commit tokens, API secrets, private specimen coordinates, or credentials. `PUBLIC_` environment variables are exposed to browsers. Server-only APIs and compute pipelines should live in separate, secured services when needed. Respect third-party API rate limits and terms.

## Collaboration
ChatGPT and Claude should work from one GitHub repository, use branches and pull requests, and review each other's changes. See `docs/ARCHITECTURE.md` and `docs/DESIGN-SYSTEM.md`.
