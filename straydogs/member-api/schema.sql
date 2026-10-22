PRAGMA foreign_keys = ON;

-- No seed data. Admission is an explicit, privileged operation, not a browser action.
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('approved','suspended')),
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  private_data TEXT NOT NULL CHECK(json_valid(private_data)),
  public_data TEXT NOT NULL CHECK(json_valid(public_data)),
  consent_data TEXT NOT NULL CHECK(json_valid(consent_data)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','withdrawn')),
  notification_status TEXT NOT NULL DEFAULT 'not_configured',
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS one_pending_application_per_email ON applications(email) WHERE status='pending';
CREATE TABLE IF NOT EXISTS member_profiles (
  member_id TEXT PRIMARY KEY REFERENCES members(id) ON DELETE CASCADE,
  public_data TEXT NOT NULL CHECK(json_valid(public_data)),
  consent_public INTEGER NOT NULL CHECK(consent_public IN (0,1)),
  approved_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS profile_submissions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  public_data TEXT NOT NULL CHECK(json_valid(public_data)),
  consent_public INTEGER NOT NULL CHECK(consent_public IN (0,1)),
  consent_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','superseded')),
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS profile_submissions_owner ON profile_submissions(member_id,created_at);
CREATE TABLE IF NOT EXISTS otp_challenges (
  email_key TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL UNIQUE,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  cooldown_until INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts>=0),
  consumed_at INTEGER,
  consumed_by TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  session_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS sessions_owner ON sessions(member_id);
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  hits INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS otp_expiration ON otp_challenges(expires_at);
CREATE INDEX IF NOT EXISTS sessions_expiration ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS rate_limits_expiration ON rate_limits(expires_at);
