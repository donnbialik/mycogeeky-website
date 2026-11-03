# MycoGeeky architecture — v1

## Product principles
- Layers, not levels. No mandatory progression, accounts, badges, or gates.
- Curiosity is a complete experience; understanding and investigation are optional depths.
- Collaboration is accessible from every depth.
- Tools may be introduced, changed, replaced, or retired without a site redesign.
- Scientific credibility requires source attribution, uncertainty, provenance, and method transparency.

## Technology
- Astro: public pages, editorial content, routing, site layout, tool catalog.
- React: only for interactive islands that benefit from stateful components.
- GitHub: version control, PR review, automated checks.
- Static hosting: inexpensive first release; do not assume it can perform molecular compute or hide API credentials.
- Independent backend services: introduce only where analysis, persistence, proxying, authentication, or rate limiting requires them.

## Modular tool contract
Each tool records: stable ID, title, summary, category, development lifecycle, scientific validation status, version, URL if deployed, source link if public, requirements, limitations. Future: data-source provenance, last reviewed date, method reference, changelog, import/export formats, support owner, accessibility and test status.

## Status semantics
- experimental: prototype, may change or fail.
- beta: usable for testing; limitations documented.
- stable: maintained release with expected interface behavior; not scientific validation.
- archived: retained for transparency, no longer maintained.
- not-evaluated / under-review / validated-for-scope: separate scientific methodology status; validation requires a documented scope and evidence.

## Existing prototypes
Do not rewrite the Fungal Ecological Intelligence or ITS comparison HTML prototypes blindly. Inventory dependencies and data flow, run tests, preserve original source and compare behavior before any migration. React migration is optional.

## Future decisions
Hosting, CMS, site analytics, newsletter integration, API caching, computation backends, privacy policy, search and accessibility audits, and Squarespace domain migration. No database required for initial scaffold.
