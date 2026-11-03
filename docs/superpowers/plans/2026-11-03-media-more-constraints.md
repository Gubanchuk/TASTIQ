# Media more constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block known conflicts and unverified constraint contracts during adaptive media recommendations while preserving usable prior results.

**Architecture:** Add a bounded structured constraint contract to the existing one-call media picker. Validate active source-backed criteria and candidate checks before identity-verified picks reach the controller; preserve existing catalog sieves and model access/budget guards.

**Tech Stack:** Existing vanilla Node ES modules, OpenAI Responses JSON schema, node:test and native IAB.

**Spec:** docs/superpowers/specs/2026-11-03-media-more-constraints-design.md

## Global Constraints

- Adaptive film/series/cartoon only; game/legacy wire format unchanged.
- One pick model call per action, no extra verifier call or automatic paid retry.
- Unknown is not a guarantee; compatible is model opinion.
- No catalog/ranking/policy/env/financial-guard changes.
- All new fixtures synthetic/autonomous; no billing or user-journal dependency.

## Review Focus

- Conflicting duplicate IDs/aliases must not rescue a rejected identity.
- Retraction, correction and history must not reintroduce a hard criterion.
- Sole candidate cannot bypass semantic checks when criteria exist.
- Unknown age/content must remain visibly uncertain.
- Failed/empty/partial replacement must preserve untouched cards, marks and restore behavior.

### Task 1: Reproduce and enforce the pick contract

**Files:** Create src/ai/pick-constraints.js and test/media-pick-constraints.test.js; modify src/ai/pick.js; add synthetic recorded-conflict fixture.

**Interfaces:** criteriaOf(legacy), constraintSchema(base,criteria), validateConstraintChecks(pick,criteria) feed aiPick/checkPicks. Valid picks carry checks and unknown criteria; aggregate rejected counts remain diagnostic.

- [x] Save delivered known-conflict text with the existing autonomous request fixture; reproduce RED through the actual service.
- [x] Implement source-backed active criteria, dynamic strict schema and complete key/status validation in the existing call.
- [x] Filter declared conflicts and direct admissions; prevent duplicate/alias bypass and unverified filler.
- [x] Add GREEN coverage for empty/partial/unknown/foreign/missing/duplicate checks, soft/history/retracted facts and game/legacy compatibility.

### Task 2: Integrate all media selection paths

**Files:** Modify src/server/media-conversation-service.js; add controller regression cases.

**Interfaces:** semantic checks decorate existing feasibility unknowns; sole optimization remains free only when no semantic hard criteria exist.

- [x] Watch the sole-candidate bypass test fail, then route constrained sole candidates through the normal checked picker.
- [x] Verify conflict/no-fit preserves result/marks/history; accepted partial output supports undo and retained feedback.
- [x] Verify initial confirm, more and familiar replace use the same contract.

### Task 3: Verify and deliver

**Files:** research-vault/media-more-constraints-2026-11-03/, docs/MEDIA_MORE_CONSTRAINTS_2026-11-03.md, docs/CODEX_CONTEXT.md and project memory.

- [x] Full unit, HTTP stub and production build; native replay of blocked/unknown/successful partial/undo/reload states.
- [x] Decide and announce a justified bounded live check only after offline gates and fresh ledger accounting.
- [x] One fresh whole-change review at the end; fix material findings and rerun appropriate gates.
- [x] Update docs/memory; use existing main push/deploy authorization; verify production runtime without new paid calls.

## Rulings / execution ledger

- Scope ruling: confirmed failure belongs to media. Keep the game protocol stable and test its regressions; do not broaden a known media fix into an unmeasured game policy change.
- Unknown ruling: preserve visible uncertainty rather than filtering every unlabelled work or pretending age/content is verified.
- Contract ruling: use the existing single response, plus a narrow explicit-conflict admission guard; no extra model verifier call and no financial guard expansion.
- Context ruling: source-backed hard episode/film time and onlyEnded belong to the same contract. The sole optimization remains free when these are the only criteria and the catalog proves them; otherwise use the checked model path. Cost if wrong: fewer free sole-candidate responses or an unverified constraint.
- Offline ruling: an AI-off preliminary result is still available, with hard conditions explicitly unconfirmed. It is never decorated with invented model checks. Cost if wrong: the provisional result can still miss the request; the warning states this boundary.
- Interface preflight: criteriaOf → schema/checkPicks → service attach/sole paths agree on versioned keys, unknowns and aggregate drops. Source corrections require new key versions. Game/legacy retain their original schema and fill policy.
- Task1 complete: recorded conflict/duplicate alias/stale source RED→GREEN; full suite600/600.
- Task2 complete: constrained sole/partial/unknown/initial/familiar/AI-off regressions GREEN; native partial/sole/undo/reload/failed familiarity preserved.
- Final review: one fresh reviewer,54/54 targeted tests, no material findings and no deferred minor findings. Server-only neutral-kind plus nonempty text was assessed: current UI sends empty neutral text and switches typing back to answer; no ordinary UI reproduction. Product normalization remains the input boundary; a future alternate client must preserve that contract.
- Task3 verification:600/600, HTTPstub paid0, build83static/7runtime source matches/6JSON/Node24/300s. Native desktop/390 no overflow or console errors. Live exactly2 calls/$0.050074, no new uncertainty: family title rejected by catalog, episodic3 new cards23–30min, undo/reload restored4. Production delivery remains the final checkbox above until separately verified.
- Task3 delivery complete: mainffa1817 remoteMatch→READY dpl_4TEuGSxS9BVCGbSr3YL6F2pZvwf2/21:53:31МСК.18productionstatic+7bundledruntime commitMatch; free cloudrestore calls[]/more not_requested0/resultpreserved; nativefirstscreen console0; earlyerrorrecords0 after first minute. No paid delivery calls. Context/memory/delivery report updated locally after publication, prior pre-push report included in the shipped commit.
