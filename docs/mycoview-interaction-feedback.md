# MycoView Interaction Feedback System — draft v1

## Goal
Every meaningful interaction visibly confirms **what happened**, **what it means**, and **what is possible next**. Never use the same treatment for a choice of interest and a judgment about scientific evidence.

## Five feedback categories

| Category | Visual treatment | Meaning | Appropriate examples |
| --- | --- | --- | --- |
| Selected | Soft green + checkmark + selected text | Visitor chose this option; no correctness implied | Research area, framework, evidence checkbox, result view |
| Evidence-supported | Green + check + explanatory text | Specific interpretation fits the evidence in the exercise | Clathrus research case study |
| Possible, unproven | Amber + question mark + explanation | Plausible hypothesis, insufficient evidence or qualification | Case study scientific inference |
| Not supported | Red + exclamation + explanation | The specific claim goes beyond evidence available | Incorrect causal conclusions, invalid observation inference |
| Informational / incomplete | Neutral gray-green + concrete instructions | Not wrong; information unavailable, tool unreleased, step incomplete | Survey loading, uncertain sampling, planned Workbench tool |

Success confirmation (e.g. a brief copied) is green; operational failure is red or amber as appropriate, with a retry or alternate route.

**Accessibility:** Never rely on color alone. Provide explicit words and icons, aria-pressed for button selections, semantic radio and checkbox controls, live status for async feedback, and visible focus outlines.

**Research integrity:** Do not rate questions, goals, user expertise, or exploratory curiosity as right/wrong. Only judge a particular scientific claim in relation to specified evidence. Keep experimental status separate from scientific validation.

## Implementation
- Research Navigator: selection checkmarks, the meaning of chosen inquiry, evidence count and reminders, sample-effort and comparison guidance, and copy/download success or caution.
- Flagship Clathrus case study: green/amber/red interpretation feedback and clear description without grading visitors.
- Workbench ToolCard: available/planned, lifecycle maturity, scientific review and methodology limitations displayed separately. Unavailable cards do not invent routes.
- Live Crane Hollow SurveyDashboard: loading, partial response, failed response, fully loaded; retry for partial/failed; missing values remain dashes.
- Tokens, styles and responsive behavior: src/styles/mycoview.css.

## Before merging
- [ ] npm run check and npm run build
- [ ] Navigate all 15 Research Navigator frameworks, choose/check/uncheck evidence, change sampling effort and comparison, export, then restart.
- [ ] Test each Clathrus case question with all 3 choices, inspect colors, text and keyboard focus.
- [ ] Tool cards: interactive URL only when actually deployed; other cards say not available. Scientific review status never claims validation without evidence.
- [ ] Test live dashboard with normal API data, one request failing and all requests failing; retry button recovers and loading state returns.
- [ ] Test screen reader, color blindness simulation, narrow mobile screens, contrast ratios and reduced-motion preference.
- [ ] Verify no promise of offline or retained research progress, and no automatic study validation.

## Next iterations
Apply these primitives to additional Research Workbench utilities when actual interactive applications are implemented. This document establishes conventions, not a claim that every future tool already complies.
