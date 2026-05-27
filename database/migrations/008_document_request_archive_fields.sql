ALTER TABLE document_requests
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by_profile_id text REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS archive_reason text,
  ADD COLUMN IF NOT EXISTS archive_note text;

CREATE INDEX IF NOT EXISTS idx_document_requests_archived_at
  ON document_requests(archived_at);
