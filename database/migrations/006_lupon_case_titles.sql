ALTER TABLE lupon_cases
  ADD COLUMN IF NOT EXISTS case_title text;

UPDATE lupon_cases
SET case_title = case_type
WHERE case_title IS NULL;
