# Review packet: three design prototypes

Artifact: E:/project/TASTIQ/src/server/public/design/ served at http://localhost:5177/design/ . This is a design selection deliverable, NOT a production redesign. The owner explicitly asked for three clickable mini mockups to choose the direction before implementation. Confirmed mixed light/dark surfaces. Requests: clarify global navigation vs restart; replace My with a useful library, filters and media lists; refresh lower landing; show stages as progress, not tabs. Existing game question blocks generally accepted.

Contract: E:/project/TASTIQ/docs/superpowers/specs/2026-11-02-site-design-comparison.md . Code-led, no approved comp. No generated imagery. Fonts from official Google Fonts Onest OFL; catalogue poster URLs in content.json. Root DESIGN.md is existing unselected incumbent, intentionally not a palette authority for these alternatives. Do not request rewriting the production world before the owner chooses. Craft floor: C:/Users/Dusik/.codex/skills/impeccable/reference/craft-floor.md . Detector: detector.json in this folder, run once before mechanical typography fixes; obsolete palette/font mismatches expected; sizes under 12px were raised. No second detector.

Directions: programme (pine shell, lit warm paper), cinema (slate stage, full cover), collection (pale workspace, dark rail). Four scenes in each: result/library/question/landing. All visible data is labelled demo. No generation/API POST or writes to real state. The selection button writes only tastiq.design-choice.v1 when explicitly pressed.

Parent interactions confirmed in Chrome390: select answer -> Next -> result; add alternative to planned list (7->8), film filter (2/8), absent search, reset, remove/undo (back to8), details/Escape, history3. JS errors0 in captured console. Functional scope of this prototype is in-page, not persistence across reload.

## Required visual evidence

Directory E:/project/TASTIQ/research-vault/site-design-2026-11-02/ . Valid final captures are ONLY the 24 files matching `final-{programme|cinema|collection}-{result|library|question|landing}-{desktop|mobile}.png`, plus user-in-app-top.png. Desktop CSS1440x900; mobile CSS390x844; actual in-app319x884. Every final file is a full document captured as an explicit document-coordinate clip, with fullPage:false, avoiding the native stitching path. Primary screen set: all12 result/library captures, programme question/landing, user-in-app-top. Other scenes are also required and shown on the contact sheets; open originals where needed.

`final-contact-desktop.png` and `final-contact-mobile.png` decode and display every final image once. `final-captures.json` records exact document dimensions. `browser-verification.json` checks overflow at1440/390 and library1024/446; the two latter widths have metrics only. In-app319 now has overflow:false after removing an unnecessary body min-width320.

Important capture limitation: ALL older files without the `final-` prefix (except user-in-app-top) are INVALID for review. Chrome fullPage stitching intermittently repeated the top; unbounded normal screenshots also captured a physical window larger than the emulated viewport. The parent caught both and replaced evidence using explicit document clips with native fullPage:false. The final captures are coherent, exact width, no duplicate tops or empty side area. Do NOT judge older files or older contact sheets. No approved-comp fidelity claim.

Review the comparison at its actual purpose: are the options coherent, different enough, usable enough to choose? Only material issues. Return the five contract sections with disposition. Write findings to FINISH_REVIEW.md here if possible. No browser, no API, no app edits, no root DESIGN edits.
