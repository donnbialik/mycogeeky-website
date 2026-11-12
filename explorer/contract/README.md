# Data contract `bre-release/1`

The engine (private repository `barcode-reliability-explorer`) exports an **evidence release**; this website
displays it without the engine source or a Python runtime. A release is three files:

| File | Content |
|---|---|
| `release.json` | the manifest (below) |
| `records.json` | list of reference records (`accession` unique; `review_status` required) |
| `cases.json` | list of review cases (`case_id` unique; `accession` is a record of the release; `kind` is `reference identity` or `boundary`; `priority`) |

Manifest fields (checked by `validateManifest` in `release.js`):

| Field | Meaning |
|---|---|
| `contract` | `"bre-release/1"` |
| `release` | short id, for example `laetiporus-v1`; a release is immutable, so a change is a new id |
| `engine` | engine version that produced it |
| `records`, `cases` | counts |
| `files_sha256` | SHA-256 of `records.json` and `cases.json` exactly as exported; the import refuses any mismatch, and the files are served back byte-for-byte |
| `human_review` | `{status: "none" or "partial", label}`; a release can never claim full human validation by itself |
| `safeguards` | `[{name, version, validation_status}]`, shown on every page |
| `tiers` | `[{id, name, validation_status}]`, shown on every page |
| `interpretation_limits` | statements shown on every page (for example, not an identification service) |
| `disclosures` | further statements |

A new contract version (`bre-release/2`) is added beside this one; existing releases keep validating against `/1`.
