-- Initial PostgreSQL-compatible schema plan for Barangay Nazareth Internal Web App.
-- This migration is not wired to the React frontend yet.

CREATE TABLE staff_accounts (
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
  registered_voter boolean NOT NULL DEFAULT false,
  precinct_number text,
  clearance_status text NOT NULL CHECK (clearance_status IN ('green', 'yellow', 'red')),
  lupon_remarks text,
  lupon_case_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (registered_voter = true OR precinct_number IS NULL OR precinct_number = '')
);

CREATE TABLE resident_sectors (
  resident_id text NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  sector text NOT NULL,
  PRIMARY KEY (resident_id, sector)
);

CREATE TABLE resident_documents (
  resident_id text NOT NULL REFERENCES residents(id) ON DELETE CASCADE,
  document_name text NOT NULL,
  PRIMARY KEY (resident_id, document_name)
);

CREATE TABLE document_requests (
  id text PRIMARY KEY,
  resident_id text NOT NULL REFERENCES residents(id) ON DELETE RESTRICT,
  document_type text NOT NULL,
  purpose text NOT NULL,
  request_date date NOT NULL,
  release_date date,
  expiry_date date,
  status text NOT NULL CHECK (status IN ('Processing', 'Released', 'On Hold', 'Cancelled')),
  processed_by text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (release_date IS NULL OR release_date >= request_date)
);

CREATE INDEX idx_residents_household_id ON residents(household_id);
CREATE INDEX idx_residents_clearance_status ON residents(clearance_status);
CREATE INDEX idx_residents_full_name ON residents(full_name);
CREATE INDEX idx_document_requests_resident_id ON document_requests(resident_id);
CREATE INDEX idx_document_requests_request_date ON document_requests(request_date);
CREATE INDEX idx_document_requests_status ON document_requests(status);
