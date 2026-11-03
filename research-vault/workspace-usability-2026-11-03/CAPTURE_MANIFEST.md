# Native capture packet — 03.11.2026

Artifact: E:/project/TASTIQ. Direction/complaints: docs/superpowers/specs/2026-11-03-workspace-usability-design.md (U01–U15). Operate, existing approved Cobalt02/5B/uppercase02 world. No approved new comp: code-led scoped product redesign, frozen landing remains outside edit scope. Old UI was explicitly rejected by the owner; earlier review verdicts are historical and cannot approve this build.

All required files below are in E:/project/TASTIQ/.impeccable/review/workspace-usability-2026-11-03/. Root opened every PNG and checked its actual section/state. Native screenshot bytes were JPEG; converted losslessly from decoded RGB into real PNG and checked pixel equality, without crop/resize. Native IAB excludes its scrollbar and scales height proportionally (for example CSS390×844 yields380×822). Names refer to CSS viewport, not raster pixels. These are viewport captures, not full-page composites; scrolling captures retain actual sticky header. Content continuing below the viewport is actual layout, not an image crop. No entrance-motion hidden state.

|Required PNG|CSS viewport|State|
|--|--|--|
|game-desktop1440.png|1440×900|Result top, actual portrait Victoria3 full image|
|game-alternatives1440.png|1440×900|Scrolled alternatives, complete art, independent height|
|game-feedback1440.png|1440×900|Scrolled Stellaris optional note open, Dune closed|
|game-mobile390.png|390×844|Result top, compact request with actual wish and explicit clarification|
|game-tiny320.png|320×740|Same result top, minimum width|
|question-tiny320.png|320×740|Fresh question, expanded summary preference retained, restore action visible|
|question-short1024.png|1024×600|Fresh question on short laptop viewport, restore action visible|
|editor-desktop1440.png|1440×900|Series uncertainty with central editable answer|
|editor-mobile390.png|390×844|Same editor focused/scrolled to field; apply/cancel visible|
|library-desktop1440.png|1440×900|130 records (seed128 plus native saves), list/search/filter/navigation|
|library-filter1440.png|1440×900|Custom relation popover open|
|library-mobile390.png|390×844|Same multi-record library top, keyboard focus ring retained|
|library-tiny320.png|320×740|Same library top, min width, no horizontal overflow|
|library-single1280.png|1280×720|Separate namespaced seed with one record|
|library-single390.png|390×844|One record, first content and selected list initially visible|
|library-single320.png|320×740|One record, minimum width|
|library-empty1280.png|1280×720|Separate empty namespace, meaningful empty heading/explanation visible initially|
|library-empty390.png|390×844|Empty library, explanation and entry to pick|
|library-empty320.png|320×740|Empty library, selected list and empty heading initially visible|
|film-fallback1680.png|1680×1000|Real film result with deliberately missing cover URL → title fallback|
|cartoon-user1280.png|1280×720|Four cartoon results after actual review→pick controller request|

The planner/picker is an injected offline fixture. Actual controllers, stores, catalogs and UI are used; synthetic request text/reasons are not human-fit evidence. Strategy fixture has3 eligible actual catalog cards after recommendation filtering; CivilizationVI from owner's screenshot is absent from this base catalog and was not fabricated. The original art-crop mechanism is separately covered by natural ratios: loaded300×450 renders280×420 featured and146.656×220 alternatives, object-fit:contain. Legacy media landscape art also verified.

Behavior evidence: ACTION_MATRIX.md, feedback-baseline.json and feedback-independent.json, SOURCE_REVIEW.md, worker reports. Baseline note open stretched all three alternatives680→1211px; after fix, only the edited card changes height, neighbor heights identical. Native notes survive reload and resume in library; choice/start/outcome and familiarity replacement/restore tested. CSS320/390/1024/1280/1440/1680 checked; no horizontal overflow found. Physical touch and a real screen reader remain unmeasured.

Detector once on changed targets: detector.json (exit0),58 findings:52 design-system advisories and6 warnings. Warning categories each twice: cramped-padding reads old journey bottom border; actual modern border0. Marquee is inherited unused .skel loading from old stylesheet; new central status has no .skel. Dark-glow reads inherited dark base; actual product background light and app-shell shadow has positive4px offset. No mechanical finding repaired by altering frozen/shared legacy files. Existing sidecar advisory drift is passed to documentation, not silently repaired.

No paid model calls, no commit/push/deploy. Source review Task1/2/3 Pass, including actual-client successful correction regression and final mobile preview delta. Full suite/build rerun after any material finish fixes.

## Recapture after material fixes F1/F2

All original17 files replaced after corrections and4 library0/1 mobile files added:21 required PNG. Root opened all21 again and verified states. F1 removes duplicate introduction, reduces spacing, puts mobile lists in a row and secondary filters under explicit disclosure; search, counts and reset remain visible. F2 places title/meta before complete art on mobile and combines labelled steps with44×44 back arrow. Native geometry: first Victoria3 title y641–671 at320×740 and621–654 at390×844. Single1280 first title y598–623; tiny320 first title y695–717, empty heading y678–738. No horizontal overflow. Final suite540/540 and build exit0. SOURCE_REVIEW final F1/F2 delta Pass, focused46/46. ACTION_MATRIX updated with actual outcomes. Documentation F3 completed by fresh shipped documenter; same reviewer opened all21 and scored all4 fixes resolved, remainingclear/dispositionship for scoredfixes only; no second detector.
