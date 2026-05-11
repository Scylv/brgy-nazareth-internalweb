-- Seed data matching the current local mock records.
-- Passwords from the mock frontend are intentionally not stored here.

INSERT INTO staff_accounts (id, username, display_name, role)
VALUES
  ('admin-1', 'admin', 'Ricardo Morales', 'admin'),
  ('dept-1', 'department', 'Elena Ledesma', 'department'),
  ('lupon-1', 'lupon', 'Juan Santos', 'lupon');

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
  registered_voter,
  precinct_number,
  clearance_status,
  lupon_remarks,
  lupon_case_reason
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
    true,
    '0421A',
    'green',
    'No active Lupon record.',
    ''
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
    true,
    '0187B',
    'yellow',
    'Pending review by Lupon clerk.',
    'Address mismatch reported during verification.'
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
    false,
    '',
    'red',
    'Do not clear until Lupon action is complete.',
    'Active community dispute under Lupon review.'
  );

INSERT INTO resident_sectors (resident_id, sector)
VALUES
  ('RBI-2024-0001', 'Registered Voter'),
  ('RBI-2024-0002', 'Solo Parent'),
  ('RBI-2024-0002', 'Registered Voter'),
  ('RBI-2024-0003', 'PWD');

INSERT INTO resident_documents (resident_id, document_name)
VALUES
  ('RBI-2024-0001', 'Barangay ID'),
  ('RBI-2024-0001', 'Cedula'),
  ('RBI-2024-0002', 'Barangay ID'),
  ('RBI-2024-0003', 'Incident Report'),
  ('RBI-2024-0003', 'Barangay ID');

INSERT INTO document_requests (
  id,
  resident_id,
  document_type,
  purpose,
  request_date,
  release_date,
  expiry_date,
  status,
  processed_by
)
VALUES
  (
    'DOC-2026-0001',
    'RBI-2024-0001',
    'Barangay Clearance',
    'Local employment requirement',
    '2026-05-02',
    '2026-05-04',
    '2026-11-04',
    'Released',
    'Elena Ledesma'
  ),
  (
    'DOC-2026-0002',
    'RBI-2024-0002',
    'Certificate of Residency',
    'School enrollment',
    '2026-05-01',
    NULL,
    '2026-08-01',
    'Processing',
    'Elena Ledesma'
  ),
  (
    'DOC-2026-0003',
    'RBI-2024-0003',
    'Barangay Clearance',
    'Clearance check before application',
    '2026-04-28',
    NULL,
    '2026-05-18',
    'On Hold',
    'Elena Ledesma'
  ),
  (
    'DOC-2026-0004',
    'RBI-2024-0001',
    'Barangay ID',
    'Resident identification renewal',
    '2026-04-14',
    '2026-04-16',
    '2027-04-16',
    'Released',
    'Elena Ledesma'
  ),
  (
    'DOC-2026-0005',
    'RBI-2024-0002',
    'Barangay Indigency',
    'Medical assistance application',
    '2026-03-22',
    '2026-03-23',
    '2026-06-23',
    'Released',
    'Elena Ledesma'
  ),
  (
    'DOC-2026-0006',
    'RBI-2024-0003',
    'Certificate of Residency',
    'Utility account verification',
    '2026-02-18',
    '2026-02-20',
    '2026-05-09',
    'Released',
    'Elena Ledesma'
  );
