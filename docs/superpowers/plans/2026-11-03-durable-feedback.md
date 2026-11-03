# Durable selection feedback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ask for a verdict after each selection, persist feedback durably and feed bounded own feedback into future picks.

**Architecture:** Extend the existing feedback run/store/queue with optional selectionReview; save through a server-only Supabase RPC. Add one shared inline result form and a historical-feedback data argument to the existing pick call.

**Tech Stack:** Existing vanilla JS/Node24, IndexedDB, Supabase Postgres/REST; no extra AI call.

**Spec:** docs/superpowers/specs/2026-11-03-durable-feedback-design.md

## Global Constraints

- Four modern domains; existing card feedback/legacy payloads preserved.
- Drafts/private stores are not transmitted before explicit selection-review submission.
- No model fine-tuning claim; current request outranks historical soft feedback.
- No API spend for this stage's offline checks; new paid model tests require a separately announced cap.
- User explicitly selected existing Family and tastiq_ objects; no new paid resource.

## Review Focus

- Late/out-of-order ACK and duplicate revisions cannot erase newer feedback.
- More/undo/correction/reload must bind the form and transcript to the displayed list.
- QA must never contaminate the real feedback database.
- Untrusted feedback cannot become a hard stop/system instruction or expose another person's data.
- DB failure and unset production config must keep the client queue pending.

### Task1: Extend shared feedback contract and queue

Files: new shared/selection-review.js, modify shared/evening-feedback.js; test/selection-review.test.js.
Interfaces: normalizeSelectionReview(value), selectionReviewHtml(run,draft,status), historicalFeedback(runs,domain), store.review(id,value), store.learning(domain).
- [x] RED: field validation/privacy, no implicit submit, reload/late ACK/old payload compatibility, contextual learning boundaries.
- [x] GREEN: reuse existing exclusive transaction and publicFeedback serialization; bounded local drafts.

### Task2: Persist validated revisions

Files: src/server/feedback-repository.js, feedback-service.js; app.js; Supabase migration; .env.example; test/feedback-repository.test.js.
Interfaces: repository.save(run) → ACK only after durable RPC; service validates/canonicalizes and bypasses QA writes. Atomic insert/idempotence/conflict in SQL.
- [x] RED→GREEN: DB failures/timeouts/unset Vercel, invalid IDs, idempotence/conflict, QA isolation.
- [x] Inspect selected project/price/schema, provision only within authorization, apply isolated additive schema, RLS/advisors and synthetic roundtrip.

### Task3: Form and contextual recommendations

Files: both modern apps, shared result CSS, conversation-client.js; both services, ai/pick.js; dedicated regression tests.
Interfaces: form updates drafts, explicit review submit queues payload/current snapshot. qualityFeedback callback → validated body data → pick feedbackContext; cache keys include body.
- [x] RED→GREEN: same-list binding, live snapshots, no drafts or cross-domain history in request; bounded prompt argument, no additional API operation.
- [x] Native desktop/mobile batched inspection, fix material issues once and confirm.

### Task4: Verify and deliver

- [x] Full unit/HTTPstub/build; one fresh independent final review, material fixes RED→GREEN.
- [x] Owner analysis queries/summary; PRODUCT/context/memory; retire rejected tester-invitation proposal.
- [ ] Main push/manual deploy; production synthetic isolated durable ACK/readback/zero AI; cleanup.

## Execution ledger

- User replaced manual invitation approach explicitly; preparation document retained as superseded history.
- DB target question pending; continue independent local implementation. Two connected accounts are not write authorization for either existing general-purpose project.
- Learning choice: bounded historical own-feedback context in the same model call, not live weight updates or automatic global policy changes. Cost if wrong: history may be less useful than a later measured learning system; current-request priority prevents silent new bans.
- Preflight: shared selectionReview normalization must survive publicFeedback → queued revision → server canonicalization → durable RPC. DB ACK must match exact run/revision; selection form uses the currently observed run. Existing source/privacy boundaries remain for runs without explicit review.
- Task1 complete: contract/privacy/queue RED→GREEN; memory-only storage and newer draft preservation fixed with reproducing tests. Task3 complete: four-domain native, more/undo/opt-out,390/320overflow0/44px; historical context only in the same pick operation, body hash distinguishes edits.
- Task2 local complete:3actual PostgreSQL tests via pinned dev-only PGlite0.5.15; anon/authenticated denied, invoker backend granted, idempotence/conflict/old revisions/QA namespace verified. Hosted apply/credentials/roundtrip waits for user DB target. CLI3.0.0 migration authoring was local only. SQL integration verification followed the initial DDL draft; do not describe that authoring sequence as test-first.
- Final review:1GPT6Astra/19targetedtests,1Important. Fixed newer input being deleted by delayed review acknowledgement — actual controller test RED→GREEN, full620/620+HTTPstub+build. No deferred minors.
- Final ruling: remote Supabase/credentials and real model resistance to malicious feedback are unmeasured. Do not claim hosted persistence or semantic reliability; finish authenticated QA roundtrip/advisors after user selects target. Current data boundary is tested offline; a wrong boundary could admit misleading historical context, which remains subordinate to current hard criteria.
- Delivery pending: all local work verified,0paidAI/$0, no hosted writes; mainremote/productionffa1817 unchanged. Do not deploy until target/config/actual durable ACK are verified. Mainlocal5177PID59544 updated, QA5180stopped/38closed/reset. Post-delivery notes from prior stage remain locally dirty and should be included with eventual authorized delivery.
- User selected a separate TASTIQ in Primary. get_cost returned0/month; create_project failed because the administrator reached the2activefreeproject limit. No project/schema/environment mutation succeeded. Waiting for the user's new choice (existing Guban with private TASTIQ tables / paid separate project / user frees a slot). No authorization to pause/delete another project or upgrade billing is inferred.

- 04.11 target supersedes Primary: explicit Family authorization, only tastiq_ additive objects and dedicated Edge. Ruling: scoped append-only ingestion token instead of broad shared Family key — bounds TASTIQ credential to feedback; cost: Edge hop and paired token/digest rotation. Real hosted+localHTTP QA ACK/readback verified, productionrows0; no paid resources/model calls. Additional trust-boundary review:1GPT6Astra,11tests,material0. Own HTTP503/409 mapping fix actual-handler RED→GREEN; stub realDB isolation fixed; full624/624+HTTPstub+build. Main62976/env configured; delivery pending.
