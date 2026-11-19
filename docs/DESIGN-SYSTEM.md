# MycoGeeky design system — draft

## Voice
Curious, scientifically rigorous, warm, irreverent without becoming frivolous. Explain uncertainty rather than overselling results. Invite people to contribute without implying expertise is irrelevant.

## Palette
The live tokens are the `--mv-*` custom properties at the top of `src/styles/mycoview.css` (dark forest `#10382c`, ink `#17372e`, cream `#f8f7f1`, mist `#e9efe5`, chartreuse accent). Older token sets remain in `global.css` and `v5.css` and should be retired. NEO Myco has its own palette in `src/styles/neomyco.css`.

## Typography
Source Serif 4 for editorial headings; IBM Plex Sans for navigation, body, forms and research interfaces; IBM Plex Mono for kickers, labels and data. Web fonts currently load from Google Fonts; self-host later if performance/privacy require it.

## Components
Base layout, feature cards, tool cards, interactive React question picker. Add buttons, filters, data tables, evidence/provenance panels and forms as tools mature. Respect reduced motion, keyboard access, visible focus, and WCAG contrast.

## UX
No forced progression. Direct Workbench access. Each scientific tool should state purpose, inputs, outputs, limitations, source provenance, development lifecycle, validation status and version.
