ALTER TABLE document_requests
  ADD COLUMN IF NOT EXISTS custom_document_title text;

INSERT INTO barangay_documents (
  id,
  code,
  name,
  visibility,
  description,
  default_validity_days,
  is_active
)
VALUES (
  'BDOC-OTHER',
  'OTHER',
  'Other',
  'internal',
  'Custom Department document request type.',
  NULL,
  true
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  visibility = EXCLUDED.visibility,
  description = EXCLUDED.description,
  is_active = true,
  updated_at = now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'document_requests_expiry_date_check'
  ) THEN
    ALTER TABLE document_requests
      ADD CONSTRAINT document_requests_expiry_date_check
      CHECK (
        expiry_date IS NULL
        OR (
          expiry_date >= request_date
          AND (
            release_date IS NULL
            OR expiry_date >= release_date
          )
        )
      ) NOT VALID;
  END IF;
END $$;
