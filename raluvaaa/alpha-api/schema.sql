PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS actors (
  id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  claimed_email TEXT,
  claimed_at INTEGER
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  last_seen_at INTEGER NOT NULL,
  FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_actor ON sessions(actor_id);

CREATE TABLE IF NOT EXISTS wishes (
  id TEXT PRIMARY KEY,
  lineage_id TEXT NOT NULL,
  owner_actor_id TEXT NOT NULL,
  parent_wish_id TEXT,
  root_wish_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'create' CHECK (kind IN ('create','evolve','split')),
  text TEXT NOT NULL,
  location_text TEXT,
  state TEXT NOT NULL DEFAULT 'alive' CHECK (state IN ('alive','bloomed','abandoned','removed')),
  is_public INTEGER NOT NULL DEFAULT 1 CHECK (is_public IN (0,1)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_actor_id) REFERENCES actors(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_wish_id) REFERENCES wishes(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_wishes_owner ON wishes(owner_actor_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_wishes_lineage ON wishes(lineage_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_wishes_public ON wishes(is_public, state, updated_at DESC);

CREATE TABLE IF NOT EXISTS wish_events (
  id TEXT PRIMARY KEY,
  wish_id TEXT NOT NULL,
  lineage_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  parent_wish_id TEXT,
  payload_json TEXT NOT NULL DEFAULT '{}',
  public_payload_json TEXT NOT NULL DEFAULT '{}',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_events_lineage ON wish_events(lineage_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_events_wish ON wish_events(wish_id, created_at ASC);

CREATE TABLE IF NOT EXISTS encouragements (
  wish_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (wish_id, actor_id),
  FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY,
  proposal_type TEXT NOT NULL CHECK (proposal_type IN ('help','suggest_branch','connect')),
  proposer_actor_id TEXT NOT NULL,
  target_wish_id TEXT,
  other_wish_id TEXT,
  private_payload_json TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','cancelled','expired')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (proposer_actor_id) REFERENCES actors(id) ON DELETE CASCADE,
  FOREIGN KEY (target_wish_id) REFERENCES wishes(id) ON DELETE CASCADE,
  FOREIGN KEY (other_wish_id) REFERENCES wishes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON proposals(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_proposals_proposer ON proposals(proposer_actor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS proposal_consents (
  proposal_id TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  decision TEXT CHECK (decision IN ('accept','decline')),
  decided_at INTEGER,
  PRIMARY KEY (proposal_id, actor_id),
  FOREIGN KEY (proposal_id) REFERENCES proposals(id) ON DELETE CASCADE,
  FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_consents_actor ON proposal_consents(actor_id, decision, decided_at DESC);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  actor_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  object_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0,1)),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (actor_id) REFERENCES actors(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_notifications_actor ON notifications(actor_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  reporter_actor_id TEXT,
  wish_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','reviewing','closed')),
  created_at INTEGER NOT NULL,
  FOREIGN KEY (reporter_actor_id) REFERENCES actors(id) ON DELETE SET NULL,
  FOREIGN KEY (wish_id) REFERENCES wishes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status, created_at DESC);
