-- Add resident fields needed by Admin resident management on existing databases.

ALTER TABLE residents
  ADD COLUMN IF NOT EXISTS exact_address text,
  ADD COLUMN IF NOT EXISTS sitio text,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_by_profile_id text REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_residents_archived_at ON residents(archived_at);
