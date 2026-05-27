CREATE TABLE IF NOT EXISTS resident_documents (
  id text PRIMARY KEY,
  resident_id text NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
  uploaded_by_profile_id text REFERENCES profiles(id) ON DELETE SET NULL,
  document_type text NOT NULL,
  original_filename text NOT NULL,
  stored_filename text NOT NULL,
  mime_type text NOT NULL,
  file_size_bytes bigint NOT NULL CHECK (file_size_bytes >= 0),
  storage_path text NOT NULL,
  visibility_scope text NOT NULL CHECK (
    visibility_scope IN (
      'department_visible',
      'general_internal',
      'lupon_confidential',
      'admin_only'
    )
  ),
  linked_case_id text REFERENCES lupon_cases(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_resident_documents_resident_id
  ON resident_documents(resident_id);

CREATE INDEX IF NOT EXISTS idx_resident_documents_visibility
  ON resident_documents(visibility_scope);

CREATE INDEX IF NOT EXISTS idx_resident_documents_linked_case_id
  ON resident_documents(linked_case_id);

CREATE INDEX IF NOT EXISTS idx_resident_documents_archived_at
  ON resident_documents(archived_at);
