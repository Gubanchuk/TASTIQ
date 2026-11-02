# Offline media proposals

`media-live-proposals.json` contains the three exact synthetic QA states and structured model proposals used by media regression tests on 2026-11-02: solo adult film, completed story vs ended series, and one full-length cartoon with a child.

The state and proposal were copied unchanged from the settled diagnostic receipts. Each case keeps its original response ID and SHA256 of `JSON.stringify({state,proposal})`. These are synthetic examples authored for testing, not user feedback or credentials. Billing totals, authorization, transport data and unrelated responses are excluded.

Tests load these checked-in fixtures and require neither a local spending ledger nor an API key. The original diagnostic reports/receipts remain local evidence and are never rewritten by tests.
