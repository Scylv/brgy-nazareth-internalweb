-- Initial PostgreSQL-compatible schema plan for Barangay Nazareth Internal Web App.
-- This migration is not wired to the React frontend.

CREATE TABLE profiles (
  id text PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'department', 'lupon')),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE residents (
  id text PRIMARY KEY,
  household_id text NOT NULL,
  full_name text NOT NULL,
  birth_date date,
  gender text NOT NULL,
  civil_status text,
  occupation text,
  address text NOT NULL,
  contact_number text,
  email text,
  additional_information text,
  sectors text[] NOT NULL DEFAULT ARRAY[]::text[],
  registered_voter boolean NOT NULL DEFAULT false,
  precinct_number text,
  status_color text NOT NULL CHECK (status_color IN ('green', 'yellow', 'red')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (registered_voter = true OR precinct_number IS NULL OR precinct_number = '')
);

CREATE TABLE lupon_cases (
  id text PRIMARY KEY,
  resident_id text NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
  case_number text NOT NULL UNIQUE,
  case_type text NOT NULL,
  status text NOT NULL CHECK (
    status IN ('open', 'under_mediation', 'resolved', 'dismissed', 'referred')
  ),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  confidential_summary text NOT NULL,
  opened_at date NOT NULL,
  resolved_at date,
  assigned_lupon_profile_id text REFERENCES profiles(id) ON DELETE SET NULL,
  created_by_profile_id text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (resolved_at IS NULL OR resolved_at >= opened_at)
);

CREATE TABLE lupon_case_notes (
  id text PRIMARY KEY,
  lupon_case_id text NOT NULL REFERENCES lupon_cases(id) ON DELETE CASCADE,
  note_type text NOT NULL CHECK (note_type IN ('internal', 'hearing', 'follow_up', 'resolution')),
  note_body text NOT NULL,
  created_by_profile_id text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE barangay_documents (
  id text PRIMARY KEY,
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  visibility text NOT NULL CHECK (visibility IN ('public', 'internal')),
  description text,
  default_validity_days integer CHECK (
    default_validity_days IS NULL
    OR default_validity_days > 0
  ),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE document_requests (
  id text PRIMARY KEY,
  resident_id text NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
  barangay_document_id text NOT NULL REFERENCES barangay_documents(id) ON DELETE RESTRICT,
  purpose text NOT NULL,
  status text NOT NULL CHECK (
    status IN ('pending', 'processing', 'released', 'cancelled', 'expired')
  ),
  request_date date NOT NULL,
  release_date date,
  expiry_date date,
  processed_by_profile_id text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (release_date IS NULL OR release_date >= request_date)
);

CREATE TABLE audit_logs (
  id text PRIMARY KEY,
  actor_profile_id text REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE import_batches (
  id text PRIMARY KEY,
  import_type text NOT NULL,
  source_filename text NOT NULL,
  status text NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_rows integer NOT NULL DEFAULT 0 CHECK (total_rows >= 0),
  successful_rows integer NOT NULL DEFAULT 0 CHECK (successful_rows >= 0),
  failed_rows integer NOT NULL DEFAULT 0 CHECK (failed_rows >= 0),
  created_by_profile_id text REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE import_batch_rows (
  id text PRIMARY KEY,
  import_batch_id text NOT NULL REFERENCES import_batches(id) ON DELETE CASCADE,
  row_number integer NOT NULL CHECK (row_number > 0),
  raw_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('pending', 'imported', 'failed')),
  error_message text,
  created_record_type text,
  created_record_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (import_batch_id, row_number)
);

CREATE INDEX idx_residents_household_id ON residents(household_id);
CREATE INDEX idx_residents_status_color ON residents(status_color);
CREATE INDEX idx_residents_full_name_lower ON residents(lower(full_name));
CREATE INDEX idx_residents_address ON residents(address);

CREATE INDEX idx_lupon_cases_resident_id ON lupon_cases(resident_id);
CREATE INDEX idx_lupon_cases_status ON lupon_cases(status);

CREATE INDEX idx_document_requests_resident_id ON document_requests(resident_id);
CREATE INDEX idx_document_requests_status ON document_requests(status);
CREATE INDEX idx_document_requests_request_date ON document_requests(request_date);
CREATE INDEX idx_document_requests_release_date ON document_requests(release_date);
CREATE INDEX idx_document_requests_expiry_date ON document_requests(expiry_date);

CREATE INDEX idx_audit_logs_actor_profile_id ON audit_logs(actor_profile_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE INDEX idx_import_batch_rows_batch_id ON import_batch_rows(import_batch_id);
