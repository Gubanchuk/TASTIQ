# Finish source review — /pick/game/

Method: read-only review of card-view.js, app.js, style.css and index.html, with dependency inspection where needed to check contracts. No second detector run, no browser, no API, no server changes. Product edits belong to the parent. API cost $0.

## Finding

**[P2] Result view hides the warning that this conversation cannot be persisted.**

Evidence: app.js:139 sets #notice to «Этот подбор сохранится только до закрытия окна.» when client.persistent is false. app.js:171 independently sets #actions.hidden for a result with no marked cards, no undo/removal undo, error, busy work or localNotice. The hiding condition ignores client.persistent and the actual nonempty #notice. Thus an ordinary result suppresses this warning when storage is unavailable or a localStorage write fails.

The client explicitly supports that situation: shared/conversation-client.js:10 initializes persistent from storage availability and line14 switches it false on failed writes. Losing this warning hides a consequential limitation at the point a person might leave the result to play and expect to return to it.

Fix: include !client.persistent among the conditions keeping this notice visible, or place the persistence warning outside the optional result action footer. Verify a result with persistent=false, marked=[], no undo, error=null, busy=false and localNotice='': the warning must remain visible.

This is source-confirmed by the branches; no live storage failure was induced.

## Other reviewed contracts

- New card-view.js escapes game identity, metadata, model reason/caveat, media URLs and attribute values. http(s) allowlisting rejects executable/data URL schemes. The internal raw button label is only called with fixed local strings; no untrusted label reaches it.
- Familiar mark/unmark/keep use the controller's existing action names and data-focus identities. Marked cards retain cancel, return and explicit exclusion checkbox. Normal cards keep the feedback mount point.
- Alternatives are nested under an h2 section heading and render h3 card titles. Store links include the title in aria-label. Poster decoration is aria-hidden beside visible headings.
- Journey stage IDs match core direction/platform/company/party question IDs; aria-current is updated on the current step.
- Main heading focus, same-screen focus/selection restoration, feedback draft preservation, busy controls and dynamic ResizeObserver footer spacing remain in place.
- Local control styling raises buttons/disclosures to44px and preserves focus-visible outline. The reviewed responsive structure has no source-established blocker; actual viewport rendering belongs to the parent's fixture checks.

Not re-reported: parent's existing Escape/outside-click menu closure batch, compact top/marked cards and narrow430 changes, duplicate review time chip. No other material bug established from this review. No readiness or human-fit claim.
## Closure after parent fix batch — 01.11.2026

**Verdict: Pass for this source review; no open material finding.**

Read-only reinspection confirms app.js:171 now ends the footer hiding predicate with &&client.persistent. For persistent=false the predicate is false, so the result footer remains visible and the nonempty persistence notice set at line139 is preserved. The P2 above is closed.

Reviewed the final picture/fallback change: card-view.js:9–11 separately validates portrait and landscape URLs with the http(s) allowlist, escapes the source srcset and img src attributes, uses a portrait source only below760px, and eagerly loads the main poster while alternatives remain lazy. style.css:127 sizes the picture wrapper to its poster. app.js:354 finds the poster container through closest('.game-poster'), takes fallback text through textContent, and replaces the entire picture subtree. This handles the new wrapper without relying on img.parentElement being the poster and does not introduce HTML injection. No new material regression established.

Source also confirms outside-click menu closure updates stored disclosure state, and Escape closes it, updates that state and returns focus to its summary. Parent's other listed fixes were not re-reported as new issues.

The parent separately reports actual Chrome backend-fixture error → Retry → two replacements → undo preserving the chosen Prey card and unsent note; Escape focus restoration;44px visible buttons; short390×430 textarea bottom344 above footer top359; no overflow at446/1024; and361passing tests. Those are attributed parent verification, not tests or browser work performed by this reviewer.

No additional detector run, browser action, server/API call, product edit or ledger change. Reviewer API cost remains$0. Human-fit and overall readiness remain outside this source-only verdict.
