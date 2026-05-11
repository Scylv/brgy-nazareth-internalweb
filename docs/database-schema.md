# Database Schema Plan

This document describes the planned PostgreSQL-compatible schema for the
Barangay Nazareth Internal Web App. The frontend still uses local mock data;
these tables are planning artifacts for a later approved database
implementation.

The plan is not tied to a specific hosted database product. It should be
deployable later on a local/internal PostgreSQL server or on an approved secure
hosted PostgreSQL server.

## Scope

- Store internal barangay resident registry records.
- Track Lupon cases and confidential case notes outside the resident table.
- Track document requests using lowercase workflow statuses.
- Store barangay document definitions for public and internal use.
- Prepare audit logging and import tracking tables for future operations.
- Keep authentication and password storage out of this schema until approved.

## Privacy Boundary

Confidential Lupon details must not be stored on `residents`.

Department users may see resident basic information and `status_color` for
clearance handling. They must not read `lupon_cases` or `lupon_case_notes`.

Lupon-only details belong in:

- `lupon_cases`
- `lupon_case_notes`

## Tables

### profiles

Stores internal user profile records and role assignment. This table does not
store passwords.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key. |
| username | text | Unique local username or future auth mapping. |
| display_name | text | Staff display name. |
| role | text | `admin`, `department`, or `lupon`. |
| status | text | `active` or `disabled`. |
| created_at | timestamptz | Creation timestamp. |
| updated_at | timestamptz | Last update timestamp. |

### residents

Primary resident registry table. It contains basic registry and clearance
status fields only.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key, current RBI-style resident ID. |
| household_id | text | Household identifier. |
| full_name | text | Resident full name. |
| birth_date | date | Resident birth date. |
| gender | text | Resident gender value used by the form. |
| civil_status | text | Civil status. |
| occupation | text | Occupation. |
| address | text | Barangay address. |
| contact_number | text | Contact number. |
| email | text | Email address. |
| additional_information | text | Non-confidential resident notes. |
| sectors | text[] | Sector classifications. |
| registered_voter | boolean | Voter flag. |
| precinct_number | text | Voter precinct number when applicable. |
| status_color | text | `green`, `yellow`, or `red`. |
| created_at | timestamptz | Creation timestamp. |
| updated_at | timestamptz | Last update timestamp. |

### lupon_cases

Stores confidential Lupon case summaries and case workflow data.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key. |
| resident_id | text | Foreign key to `residents.id`. |
| case_number | text | Unique Lupon case number. |
| case_type | text | Case classification. |
| status | text | `open`, `under_mediation`, `resolved`, `dismissed`, or `referred`. |
| priority | text | `low`, `normal`, `high`, or `urgent`. |
| confidential_summary | text | Lupon-only case summary. |
| opened_at | date | Date opened. |
| resolved_at | date | Date resolved, dismissed, or referred, if applicable. |
| assigned_lupon_profile_id | text | Lupon staff assigned to the case. |
| created_by_profile_id | text | Profile that created the case. |
| created_at | timestamptz | Creation timestamp. |
| updated_at | timestamptz | Last update timestamp. |

### lupon_case_notes

Stores confidential notes for Lupon cases.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key. |
| lupon_case_id | text | Foreign key to `lupon_cases.id`. |
| note_type | text | `internal`, `hearing`, `follow_up`, or `resolution`. |
| note_body | text | Confidential note text. |
| created_by_profile_id | text | Profile that wrote the note. |
| created_at | timestamptz | Creation timestamp. |

### document_requests

Tracks department document request workflow records.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key, current DOC-style request ID. |
| resident_id | text | Foreign key to `residents.id`. |
| barangay_document_id | text | Foreign key to `barangay_documents.id`. |
| purpose | text | Request purpose. |
| status | text | `pending`, `processing`, `released`, `cancelled`, or `expired`. |
| request_date | date | Date requested. |
| release_date | date | Date released, if applicable. |
| expiry_date | date | Expiry date, if applicable. |
| processed_by_profile_id | text | Department profile processing the request. |
| created_at | timestamptz | Creation timestamp. |
| updated_at | timestamptz | Last update timestamp. |

### barangay_documents

Defines document types handled by the barangay.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key. |
| code | text | Unique document code. |
| name | text | Document name. |
| visibility | text | `public` or `internal`. |
| description | text | Document description. |
| default_validity_days | integer | Suggested validity period. |
| is_active | boolean | Whether the document is available. |
| created_at | timestamptz | Creation timestamp. |
| updated_at | timestamptz | Last update timestamp. |

### audit_logs

Planned append-only audit trail for future write operations.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key. |
| actor_profile_id | text | Profile that performed the action, nullable for system jobs. |
| action | text | Action name. |
| entity_type | text | Table or domain entity affected. |
| entity_id | text | Affected record ID. |
| metadata | jsonb | Structured audit metadata. |
| created_at | timestamptz | Event timestamp. |

### import_batches

Tracks future CSV/spreadsheet import runs.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key. |
| import_type | text | Import category such as `residents`. |
| source_filename | text | Original file name. |
| status | text | `pending`, `processing`, `completed`, or `failed`. |
| total_rows | integer | Total rows in the import. |
| successful_rows | integer | Rows imported successfully. |
| failed_rows | integer | Rows that failed validation or import. |
| created_by_profile_id | text | Profile that started the import. |
| created_at | timestamptz | Creation timestamp. |
| completed_at | timestamptz | Completion timestamp. |

### import_batch_rows

Tracks row-level import results for review and correction.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key. |
| import_batch_id | text | Foreign key to `import_batches.id`. |
| row_number | integer | Source row number. |
| raw_data | jsonb | Original row data. |
| status | text | `pending`, `imported`, or `failed`. |
| error_message | text | Validation or import error. |
| created_record_type | text | Entity type created from the row. |
| created_record_id | text | Entity ID created from the row. |
| created_at | timestamptz | Creation timestamp. |

## Index Plan

- Resident name/search fields:
  - `lower(full_name)`
  - `id`
  - `address`
- Resident filters:
  - `status_color`
  - `household_id`
- Document request dates:
  - `request_date`
  - `release_date`
  - `expiry_date`
- Lupon case lookup:
  - `resident_id`

## Future Implementation Notes

- Keep the React app on mock data until database integration is explicitly
  approved.
- Add a reviewed authentication design before connecting `profiles` to real
  login behavior.
- Add production backup, audit review, and data privacy procedures before real
  resident data is stored.
