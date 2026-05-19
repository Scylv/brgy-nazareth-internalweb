-- Seed data matching the current local mock records at a planning level.
-- Passwords from the mock frontend are intentionally not stored here.

INSERT INTO profiles (
  id,
  username,
  display_name,
  role
)
VALUES
  (
    'admin-1',
    'admin',
    'Ricardo Morales',
    'admin'
  ),
  (
    'dept-1',
    'department',
    'Elena Ledesma',
    'department'
  ),
  (
    'lupon-1',
    'lupon',
    'Juan Santos',
    'lupon'
  );

INSERT INTO residents (
  id,
  household_id,
  full_name,
  birth_date,
  gender,
  civil_status,
  occupation,
  address,
  contact_number,
  email,
  additional_information,
  sectors,
  registered_voter,
  precinct_number,
  status_color
)
VALUES
  (
    'RBI-2024-0001',
    'HH-NAZ-1001',
    'Juan Dela Cruz',
    '1988-03-14',
    'Male',
    'Married',
    'Driver',
    'Purok 4-A, Upper Nazareth',
    '09171234567',
    'juan.delacruz@example.com',
    'Resident for 18 years',
    ARRAY['Registered Voter'],
    true,
    '0421A',
    'green'
  ),
  (
    'RBI-2024-0002',
    'HH-NAZ-1034',
    'Maria Santos',
    '1992-07-20',
    'Female',
    'Single',
    'Vendor',
    'Purok 2, Lower Nazareth',
    '09181112222',
    'maria.santos@example.com',
    'Needs address re-verification.',
    ARRAY['Solo Parent', 'Registered Voter'],
    true,
    '0187B',
    'yellow'
  ),
  (
    'RBI-2024-0003',
    'HH-NAZ-1090',
    'Pedro Bautista',
    '1979-11-09',
    'Male',
    'Married',
    'Construction Worker',
    'Purok 6, Nazareth',
    '09193334444',
    'pedro.bautista@example.com',
    'Resident was referred by tanod desk.',
    ARRAY['PWD'],
    false,
    '',
    'red'
  );

INSERT INTO resident_status_history (
  id,
  resident_id,
  previous_status_color,
  new_status_color,
  reason,
  changed_by_profile_id,
  created_at
)
VALUES
  (
    'RSH-2026-0001',
    'RBI-2024-0001',
    NULL,
    'green',
    'Initial seed status.',
    'lupon-1',
    '2026-05-01 08:00:00+08'
  ),
  (
    'RSH-2026-0002',
    'RBI-2024-0002',
    NULL,
    'yellow',
    'Address requires Lupon verification.',
    'lupon-1',
    '2026-05-01 08:10:00+08'
  ),
  (
    'RSH-2026-0003',
    'RBI-2024-0003',
    NULL,
    'red',
    'Active Lupon dispute blocks clearance.',
    'lupon-1',
    '2026-05-01 08:20:00+08'
  );

INSERT INTO barangay_documents (
  id,
  code,
  name,
  visibility,
  description,
  default_validity_days
)
VALUES
  (
    'BDOC-001',
    'BRGY-CLEARANCE',
    'Barangay Clearance',
    'public',
    'Clearance document for employment and local requirements.',
    180
  ),
  (
    'BDOC-002',
    'LUPON-REFERRAL',
    'Lupon Referral Notice',
    'internal',
    'Internal document used when a resident must be referred to the Lupon office.',
    NULL
  );

INSERT INTO lupon_cases (
  id,
  resident_id,
  case_number,
  case_type,
  status,
  priority,
  confidential_summary,
  opened_at,
  assigned_lupon_profile_id,
  created_by_profile_id
)
VALUES
  (
    'LC-2026-0001',
    'RBI-2024-0002',
    'LPN-2026-0001',
    'Address Verification',
    'under_mediation',
    'normal',
    'Address mismatch reported during verification. Lupon clerk must confirm current residence.',
    '2026-05-01',
    'lupon-1',
    'lupon-1'
  ),
  (
    'LC-2026-0002',
    'RBI-2024-0003',
    'LPN-2026-0002',
    'Community Dispute',
    'open',
    'high',
    'Active community dispute under Lupon review. Clearance should remain on hold until action is complete.',
    '2026-04-25',
    'lupon-1',
    'lupon-1'
  );

INSERT INTO lupon_case_notes (
  id,
  lupon_case_id,
  note_type,
  note_body,
  created_by_profile_id,
  created_at
)
VALUES
  (
    'LCN-2026-0001',
    'LC-2026-0001',
    'internal',
    'Pending review by Lupon clerk. Verify household address before clearing the resident.',
    'lupon-1',
    '2026-05-01 09:00:00+08'
  ),
  (
    'LCN-2026-0002',
    'LC-2026-0002',
    'follow_up',
    'Do not clear until Lupon action is complete. Coordinate next follow-up with both parties.',
    'lupon-1',
    '2026-04-28 14:30:00+08'
  );

INSERT INTO document_requests (
  id,
  resident_id,
  barangay_document_id,
  purpose,
  status,
  request_date,
  release_date,
  expiry_date,
  processed_by_profile_id
)
VALUES
  (
    'DOC-2026-0001',
    'RBI-2024-0001',
    'BDOC-001',
    'Local employment requirement',
    'released',
    '2026-05-02',
    '2026-05-04',
    '2026-11-04',
    'dept-1'
  ),
  (
    'DOC-2026-0002',
    'RBI-2024-0002',
    'BDOC-001',
    'School enrollment',
    'processing',
    '2026-05-01',
    NULL,
    '2026-08-01',
    'dept-1'
  );

INSERT INTO document_request_events (
  id,
  document_request_id,
  previous_status,
  new_status,
  note,
  created_by_profile_id,
  created_at
)
VALUES
  (
    'DRE-2026-0001',
    'DOC-2026-0001',
    NULL,
    'released',
    'Seeded released request matching the current demo flow.',
    'dept-1',
    '2026-05-04 16:00:00+08'
  ),
  (
    'DRE-2026-0002',
    'DOC-2026-0002',
    NULL,
    'processing',
    'Seeded in-progress request matching the current demo flow.',
    'dept-1',
    '2026-05-01 11:30:00+08'
  );

INSERT INTO audit_logs (
  id,
  actor_profile_id,
  action,
  entity_type,
  entity_id,
  metadata
)
VALUES
  (
    'AUD-2026-0001',
    'admin-1',
    'seed.created',
    'database_plan',
    '001_initial_schema',
    '{"source":"database/seed.sql"}'::jsonb
  );

INSERT INTO import_batches (
  id,
  import_type,
  source_filename,
  status,
  total_rows,
  successful_rows,
  failed_rows,
  created_by_profile_id,
  completed_at
)
VALUES
  (
    'IMP-2026-0001',
    'residents',
    'sample-residents.csv',
    'completed',
    3,
    3,
    0,
    'admin-1',
    '2026-05-02 10:00:00+08'
  );

INSERT INTO import_batch_rows (
  id,
  import_batch_id,
  row_number,
  raw_data,
  status,
  created_record_type,
  created_record_id
)
VALUES
  (
    'IMPROW-2026-0001',
    'IMP-2026-0001',
    1,
    '{"id":"RBI-2024-0001","full_name":"Juan Dela Cruz"}'::jsonb,
    'imported',
    'residents',
    'RBI-2024-0001'
  ),
  (
    'IMPROW-2026-0002',
    'IMP-2026-0001',
    2,
    '{"id":"RBI-2024-0002","full_name":"Maria Santos"}'::jsonb,
    'imported',
    'residents',
    'RBI-2024-0002'
  ),
  (
    'IMPROW-2026-0003',
    'IMP-2026-0001',
    3,
    '{"id":"RBI-2024-0003","full_name":"Pedro Bautista"}'::jsonb,
    'imported',
    'residents',
    'RBI-2024-0003'
  );
