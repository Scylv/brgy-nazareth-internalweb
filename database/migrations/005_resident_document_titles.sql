ALTER TABLE resident_documents
  ADD COLUMN IF NOT EXISTS document_title text;
