# Dataset wiring — what changed

This build reorganizes `dataset/` from a flat 1,368-file, ~1.17 GB drop into a
structure where every file's status (wired vs. not) is explicit, and fixes the
code paths so the wired half is actually reachable at runtime.

## Layout

```
dataset/
├── used/                          456 files, 385 MB — the live database
│   ├── core/         108 files,  58 MB   engine tables, rules, registries
│   ├── library/       253 files, 328 MB   classical text corpus + _index.json
│   └── validation/     27 files,  11 KB   benchmark & release-gate corpora
├── unused/                        789 MB — nothing here is read by the app
│   ├── mirrors/                            two full duplicate copies of the
│   │                                       same 455 datasets (JSON-wrapped and
│   │                                       plain-text), byte-traceable back to
│   │                                       the root copies via source_sha256
│   ├── reference-templates/  68            JSON_Files/ — unpopulated schema
│   │                                       skeletons (e.g. Nakshatra-List had
│   │                                       1 of 27 nakshatras); the populated
│   │                                       equivalents live in used/core
│   └── broken/                             Yantra-List.json — 0 bytes in the
│                                            original archive, confirmed empty
│                                            in both mirrors too
└── DATASET_MANIFEST.json          full per-bucket file listing
```

## Bugs found and fixed

- Two modules (`Master100Gate.js`, `MasterReleaseGate.js`) imported JSON files
  that did not exist anywhere in the original archive. Reconstructed both
  manifests from files that do exist; each carries a `note` explaining this.
- Validation corpora (`v8`/`v9`/`v10`/`v12`/`v13`) were referenced at the wrong
  paths throughout the codebase — fixed.
- 277 of 364 root datasets were never imported by any code. Traced each one:
  most are the classical-text corpus (now served through `KnowledgeLibrary.js`
  off a prebuilt index rather than loading 328 MB per search), and 21 are rule
  tables now wired through `RuleTables.js`.
- 14 modules built dataset paths with `join(dir, '..', 'dataset', 'name.json')`
  as separate arguments rather than one literal string. These silently failed
  (empty try/catch) and were invisible until the test suite was run against
  live output rather than just import-checked. All fixed — see git-style diff
  in the commit history of this conversation for the full list, but notably:
  `cli/cities.js` (the 307k-entry city lookup was returning `{}`),
  `src/prediction/bphsEngine.js` (Raja Yoga lookups returned zero hits), and
  five more rule-table loaders.
- `dataset/used/reference/Yantra-List.json` was 0 bytes; quarantined to
  `unused/broken/` with a note rather than left silently broken in the live
  path.

## New HTTP surface

- `GET /knowledge/stats` — corpus totals and subject breakdown
- `GET /knowledge/texts?subject=&limit=&offset=` — paginated text listing
- `GET /knowledge/search?q=&deep=1` — catalogue search, or full-text with `deep=1`
- `GET /knowledge/text/:id?body=1` — single text, optionally with content
- `GET /knowledge/rules` / `GET /knowledge/rules/:name` — the 21 previously
  orphaned rule tables (Raja Yoga, BPHS bhava lords, career/finance/health/
  marriage prediction rules, etc.)

## Test suite

60/63 tests pass (up from 53/63 before this pass; the two structural dataset
tests were rewritten to assert the new layout rather than weakened). The
remaining 3 failures are confirmed pre-existing and unrelated to the dataset:
a hardcoded `DONKI_BASES` array literal in the astronomy module, a completion
engine reporting `version: '4.0.0'` against a test written for `'12.0.0'`,
and a capability registry with zero `FAIL`-status entries against a test
written expecting at least one. None of these three touch a dataset path;
none were introduced by this work.
