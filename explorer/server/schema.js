// Barcode Reliability Explorer: D1 schema, as an ordered list of migrations. Each migration is a list of single
// statements (D1 runs them in one transactional batch). Applied only by the owner through
// POST /api/explorer/admin/migrate, which is audited. Migrations are forward-only: a schema change is a new entry,
// never an edit of an applied one (the API refuses to run if an applied migration's hash changed).
//
// Integrity rules enforced by the database itself:
//  * releases, release files and review cases are IMMUTABLE once imported (no UPDATE, no DELETE);
//  * reviews, acceptances and the audit log are APPEND-ONLY;
//  * a correction is a new review that names the one it supersedes;
//  * 'test' reviews never count toward an outcome (enforced in the API);
//  * an acceptance always targets a FUTURE release, never the one the case belongs to.

const noChange = (table, what) => [
  `CREATE TRIGGER ${table}_no_update BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT, '${what}'); END`,
  `CREATE TRIGGER ${table}_no_delete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT, '${what}'); END`,
];

export const MIGRATIONS = [
  {
    id: '0001_release1',
    statements: [
      `CREATE TABLE schema_migrations (id TEXT PRIMARY KEY, sha256 TEXT NOT NULL, applied_at TEXT NOT NULL, applied_by TEXT NOT NULL)`,
      // An immutable evidence release produced offline by the engine (data contract bre-release/1).
      `CREATE TABLE releases (
         id TEXT PRIMARY KEY,
         contract TEXT NOT NULL,
         manifest_json TEXT NOT NULL,
         sha256_manifest TEXT NOT NULL,
         imported_at TEXT NOT NULL,
         imported_by TEXT NOT NULL)`,
      // The release's evidence files, stored byte-for-byte as exported (their SHA-256 must equal the manifest's).
      `CREATE TABLE release_files (
         release_id TEXT NOT NULL REFERENCES releases(id),
         name TEXT NOT NULL,
         sha256 TEXT NOT NULL,
         bytes INTEGER NOT NULL,
         content TEXT NOT NULL,
         PRIMARY KEY (release_id, name))`,
      `CREATE TABLE review_cases (
         id TEXT PRIMARY KEY,
         release_id TEXT NOT NULL REFERENCES releases(id),
         accession TEXT NOT NULL,
         kind TEXT NOT NULL CHECK (kind IN ('reference identity', 'boundary')),
         priority TEXT NOT NULL,
         evidence_json TEXT NOT NULL,
         evidence_sha256 TEXT NOT NULL)`,
      `CREATE TABLE reviewers (
         id INTEGER PRIMARY KEY,
         email TEXT NOT NULL UNIQUE COLLATE NOCASE,
         display_name TEXT NOT NULL,
         role TEXT NOT NULL CHECK (role IN ('owner', 'reviewer', 'observer')),
         formal_reviews_enabled INTEGER NOT NULL DEFAULT 0,
         active INTEGER NOT NULL DEFAULT 1,
         created_at TEXT NOT NULL)`,
      `CREATE TABLE reviews (
         id INTEGER PRIMARY KEY,
         case_id TEXT NOT NULL REFERENCES review_cases(id),
         reviewer_id INTEGER NOT NULL REFERENCES reviewers(id),
         mode TEXT NOT NULL CHECK (mode IN ('test', 'formal')),
         decision TEXT NOT NULL CHECK (decision IN ('accept name', 'other name', 'reject as reference', 'unresolved')),
         name_after_review TEXT,
         voucher_confirmed TEXT NOT NULL CHECK (voucher_confirmed IN ('yes', 'no', 'unknown')),
         identification_basis TEXT NOT NULL,
         boundary_interval TEXT,
         notes TEXT NOT NULL,
         supporting_references TEXT,
         evidence_sha256 TEXT NOT NULL,
         supersedes INTEGER REFERENCES reviews(id),
         created_at TEXT NOT NULL)`,
      `CREATE INDEX reviews_case ON reviews(case_id)`,
      `CREATE UNIQUE INDEX reviews_supersede_once ON reviews(supersedes) WHERE supersedes IS NOT NULL`,
      `CREATE TABLE acceptances (
         id INTEGER PRIMARY KEY,
         case_id TEXT NOT NULL REFERENCES review_cases(id),
         target_release TEXT NOT NULL,
         accepted_by INTEGER NOT NULL REFERENCES reviewers(id),
         basis_review_ids TEXT NOT NULL,
         decision TEXT NOT NULL,
         name_accepted TEXT,
         created_at TEXT NOT NULL,
         CHECK (target_release <> ''))`,
      `CREATE TABLE audit_events (
         id INTEGER PRIMARY KEY,
         actor TEXT NOT NULL,
         action TEXT NOT NULL,
         object TEXT NOT NULL,
         payload_sha256 TEXT NOT NULL,
         at TEXT NOT NULL)`,
      ...noChange('releases', 'releases are immutable'),
      ...noChange('release_files', 'release files are immutable'),
      ...noChange('review_cases', 'review cases are immutable; a changed case belongs in a new release'),
      ...noChange('reviews', 'reviews are append-only'),
      ...noChange('acceptances', 'acceptances are append-only'),
      ...noChange('audit_events', 'the audit log is append-only'),
      ...noChange('schema_migrations', 'applied migrations are permanent'),
      // An acceptance may never target the release its case belongs to.
      `CREATE TRIGGER acceptances_future_only BEFORE INSERT ON acceptances
         WHEN NEW.target_release = (SELECT release_id FROM review_cases WHERE id = NEW.case_id)
         BEGIN SELECT RAISE(ABORT, 'an acceptance must target a future release'); END`,
      // Test reviews can never be the basis of an acceptance: checked in the API, and a formal review can never
      // be superseded by a test review.
      `CREATE TRIGGER reviews_no_formal_to_test BEFORE INSERT ON reviews
         WHEN NEW.supersedes IS NOT NULL AND NEW.mode = 'test' AND (SELECT mode FROM reviews WHERE id = NEW.supersedes) = 'formal'
         BEGIN SELECT RAISE(ABORT, 'a formal review cannot be superseded by a test review'); END`,
    ],
  },
  {
    // Corroboration supplements (contract bre-supplement/1): hash-pinned, immutable additions to a release. A review
    // records which supplement it was written against and which corroborators it cites.
    id: '0002_supplements',
    statements: [
      `CREATE TABLE supplements (
         id TEXT PRIMARY KEY,
         release_id TEXT NOT NULL REFERENCES releases(id),
         kind TEXT NOT NULL,
         contract TEXT NOT NULL,
         header_json TEXT NOT NULL,
         sha256 TEXT NOT NULL UNIQUE,
         bytes INTEGER NOT NULL,
         imported_at TEXT NOT NULL,
         imported_by TEXT NOT NULL)`,
      `CREATE TABLE supplement_cases (
         supplement_id TEXT NOT NULL REFERENCES supplements(id),
         case_id TEXT NOT NULL REFERENCES review_cases(id),
         content_json TEXT NOT NULL,
         PRIMARY KEY (supplement_id, case_id))`,
      `ALTER TABLE reviews ADD COLUMN supplement_sha256 TEXT`,
      `ALTER TABLE reviews ADD COLUMN cited TEXT`,
      ...noChange('supplements', 'supplements are immutable'),
      ...noChange('supplement_cases', 'supplements are immutable'),
    ],
  },
];
