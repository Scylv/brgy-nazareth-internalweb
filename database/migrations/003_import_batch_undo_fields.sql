-- Add resident import batch metadata and undo row tracking fields.

ALTER TABLE import_batches
  ADD COLUMN IF NOT EXISTS filename text,
  ADD COLUMN IF NOT EXISTS sheet_name text,
  ADD COLUMN IF NOT EXISTS header_row integer,
  ADD COLUMN IF NOT EXISTS mapping jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'skipDuplicates',
  ADD COLUMN IF NOT EXISTS rolled_back_at timestamptz;

UPDATE import_batches
SET filename = source_filename
WHERE filename IS NULL;

ALTER TABLE import_batch_rows
  ADD COLUMN IF NOT EXISTS batch_id text REFERENCES import_batches(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS resident_id text REFERENCES residents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS action text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS previous_values jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS new_values jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE import_batch_rows
SET batch_id = import_batch_id
WHERE batch_id IS NULL;

ALTER TABLE import_batch_rows
  ALTER COLUMN import_batch_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_import_batch_rows_batch_id ON import_batch_rows(batch_id);
CREATE INDEX IF NOT EXISTS idx_import_batches_rolled_back_at ON import_batches(rolled_back_at);
