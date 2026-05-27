ALTER TABLE lupon_cases
  ADD COLUMN IF NOT EXISTS resolved_by_profile_id text REFERENCES profiles(id) ON DELETE SET NULL;
