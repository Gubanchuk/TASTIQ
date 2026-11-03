# Workspace usability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Checkbox steps are tracked in research-vault/workspace-usability-2026-11-03/PROGRESS.md. No automatic commits or publish.

**Goal:** устранить все15 групп замечаний владельца и проверить каждое действие на настоящем движке.
**Architecture:** vanilla modules; root owns shell/question/request; independent worker owns library/custom-select; independent worker owns result/feedback. Existing model controllers/state/storage preserved. Style modules load last with explicit product scope.
**Tech Stack:** vanillaJS/CSS/HTML, Node24/node:test, nativeCUA.
**Spec:** docs/superpowers/specs/2026-11-03-workspace-usability-design.md

## Global Constraints

Approvedlanding4files unchanged, brandfixed, legacy/core/catalog untouched, no dependencies, no paidcalls, no user data changes. Root owns all shared product.css and HTMLheaders; no worker reverts others. Reviews/scoped corrections precede completion.

## Review Focus

- Open feedback in one alternative; adjacent actions and card heights remain stable.
- Change/select/query/filter with keyboard and after rerender, large120+ library; preserve data/focus.
- Correction/clarification error/reload/cancel/restore retains independent drafts and result checkpoint.
- Responsive stepper/header/editor at320px and short viewport; no clipping or invisible actions.
- Nonposter landscape/portrait/unavailableimage and long real copy: readable complete imagery, no overflow.

### Task1 — shell, progress, questions and request (root)

Files: game/watch index.html/app.js, library/index.html header only, shared/product.css, new shared/app-shell.js, new shared/request-view.js as needed; test request UI pure helpers if introduced. Preserve #restart/#restore, #back and data-act transport; expose mainactions rather than2item menu. Editorhost inside stage for request/clarification, source draft keys unchanged. Stepper current/done/next status and aria-current retained. Include shared custom-select module/style on all3 pages. Root may adapt #request-panel UI, not worker-owned card/lib renderers.

- [x] Reproduce/record source failure forU03-U09,U14; write tests for changed request rendering/semantics.
- [x] Implement explicit shared shell + stepper + grouped request and central editor; maintain action bindings.
- [x] Run targeted tests; exercise every initial/question/context/edit action free in browser.

### Task2 — library and custom select (worker)

Files owned: library/app.js, library/style.css; new shared/custom-select.js and shared/custom-select.css; focused tests. Do NOT edit index.html header or root product.css. Contract: module auto enhances product-page select elements including dynamic rendering, exports initCustomSelects for explicit use if needed. True select remains source of value/change/form events. Menus use button rolecombobox/listbox/option, keyboard/typeahead/Escape/outside/focus, disabled and rerender safe, overlay not clipped. CSS scope semanticclasses. Native fallback works without enhancement. Renderer supports library tab/active lane,120+ entries, search/filter/sort/reset/loadmore/noresults; no fake stats/storage migration. Expose seed helper or document shape for root QA.

- [x] Write failing meaningful interaction/model tests; confirm RED.
- [x] Implement library and selectors with neutral brand tokens and no arbitrary lines; visible primaryactions.
- [x] Run focused library/store tests, record list of actions and root integration instructions.

### Task3 — result images/cards/feedback (worker)

Files owned: game/card-view.js, watch/card-view.js, shared/evening-view.js; new shared/results.css; tests. Do NOT edit app.js/product.css/header/library. New CSS loads after product.css. Preserve data-act/data-fk/form names used by current apps and storedfeedback; per-card open key run:id. Full image contain and naturalaspect, no row stretch when details open. Visible semantic evaluation and optional reasons/details; direct choose/save/familiar links. Improve same shared controls in library history without breaking storage. Truthful model reason labels/caveats stay.

- [x] Pin full-image and per-card feedback behavior with meaningful tests before implementation.
- [x] Implement composed result cards/feedback; independent geometry, no forced equalheight, full art.
- [x] Run focused feedback/client/media/card tests, record instructions and action inventory.

### Task4 — integration and full journey QA (root)

- [x] Add isolated QA server copied into thisstage, initial/review/result/error/replace/library120 cases with actualcatalog and improved groundedstub. No productionmodel usage.
- [x] ACTION_MATRIX records every button/input/selection; browser desktop/mobile/tiny + short, all4domains.
- [x] Check pending/disable/error/reload/back/restore/replace/undo/save/library filters andmanyresults; screenshot valid states.
- [x] Run npm test/build and once detector; fresh whole-code review and finish review, apply concrete findings and verdict until resolved.
- [x] Shipped documenter updates DESIGN/PRODUCT/sidecar/3briefs; rootupdates CODEX_CONTEXT and projectmemory, cleanupQA/viewport and leave localdeliverable. No automaticpublish.
## Preflight rulings

- Shared eveningControls must preserve legacy default, provide modern:true opt-in. Root passes modern:true in game/watch; library worker may pass it for history. No legacy markup/behavior changes.
- Central editor must adapt cancel-clarification to key-based lookup across DOM, preserve focus return and duplicate-id prevention; do not rely on parentElement.
- Custom-select native select source remains available to code. Auto-enhancement observes dynamic renders, disabled/options/value sync. Root includes custom-select.js/css on game/watch/library; results.css loads last after product.css.
