# Manual tagging backend

Used when no API key is configured: a coding agent plays the role of the batch tagger.
Inputs, prompt and output format are the same as for `05-tag-api.js`, and `06-tag-ingest.js`
validates the outputs the same way, so the result does not depend on who produced it.

Instruction given to each agent (one agent per list of app ids):

1. Read `data/tagging/PROMPT.md` and follow it exactly.
2. For each app id in the list: read `data/tagging/<run>/in/<appid>.json`, write the JSON answer to
   `data/tagging/<run>/out/<appid>.json`. One file per game; skip ids whose output already exists.
3. Quotes are copied character for character from the text with that evidence id, in its original
   language. The checker drops any quote it cannot find in that text.
4. Use only the input file. No knowledge of the game from elsewhere, no browsing, no other files.

Runs in this catalog:
- `run1`: every game, model Claude Haiku 5.5 (the model the research cost estimate assumes).
- `run2`: a sample spread over the popularity range, model Claude Sonnet 5.5, to measure agreement
  between two independent taggers.
