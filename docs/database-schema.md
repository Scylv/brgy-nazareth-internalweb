# Database Schema Plan

This document describes the planned PostgreSQL-compatible schema for the Barangay Nazareth Internal Web App. The frontend still uses mock/local data only; these tables are planning artifacts for a later approved database implementation.

## Scope

- Store internal barangay resident registry records.
- Track document requests and release status.
- Track staff accounts by role without storing passwords in this schema.
- Preserve Lupon-only fields separately from department-facing verification data.
- Keep the schema deployable on a local/internal PostgreSQL server or an approved secure hosted PostgreSQL server.

## Tables

### staff_accounts

Planned storage for system users and their assigned role. Authentication details are intentionally out of scope until a real authentication design is approved.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key, matches stable local account identifiers. |
| username | text | Unique username for display and later auth mapping. |
| display_name | text | Staff member name. |
| role | text | `admin`, `department`, or `lupon`. |
| status | text | `active` or `disabled`. |
| created_at | timestamptz | Creation timestamp. |
| updated_at | timestamptz | Last update timestamp. |

### residents

Primary resident registry table. The current mock `status` values map to clearance handling states.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key, current RBI-style resident ID. |
| household_id | text | Household identifier from the local registry. |
| full_name | text | Resident full name. |
| birth_date | date | Resident birth date, nullable if unknown. |
| gender | text | Resident gender value used by the form. |
| civil_status | text | Civil status. |
| occupation | text | Occupation. |
| address | text | Barangay address. |
| contact_number | text | Contact number. |
| email | text | Email address. |
| additional_information | text | General notes visible in the resident record form. |
| registered_voter | boolean | Whether the resident is marked as a registered voter. |
| precinct_number | text | Voter precinct number when applicable. |
| clearance_status | text | `green`, `yellow`, or `red`. |
| lupon_remarks | text | Internal Lupon remarks. |
| lupon_case_reason | text | Confidential Lupon details. |
| created_at | timestamptz | Creation timestamp. |
| updated_at | timestamptz | Last update timestamp. |

### resident_sectors

Many-to-one list of sector classifications from the resident form.

| Column | Type | Notes |
| --- | --- | --- |
| resident_id | text | Foreign key to `residents.id`. |
| sector | text | Example: `PWD`, `Solo Parent`, `Registered Voter`. |

### resident_documents

Many-to-one list of documents associated with a resident record.

| Column | Type | Notes |
| --- | --- | --- |
| resident_id | text | Foreign key to `residents.id`. |
| document_name | text | Example: `Barangay ID`, `Cedula`, `Incident Report`. |

### document_requests

Tracks department document request workflow records.

| Column | Type | Notes |
| --- | --- | --- |
| id | text | Primary key, current DOC-style request ID. |
| resident_id | text | Foreign key to `residents.id`. |
| document_type | text | Barangay Clearance, Barangay ID, etc. |
| purpose | text | Request purpose. |
| request_date | date | Date requested. |
| release_date | date | Nullable until released. |
| expiry_date | date | Nullable if the document has no expiry. |
| status | text | `Processing`, `Released`, `On Hold`, or `Cancelled`. |
| processed_by | text | Staff display name from the current mock data. |
| created_at | timestamptz | Creation timestamp. |
| updated_at | timestamptz | Last update timestamp. |

## Future Implementation Notes

- The frontend should continue using local mock data until database integration is explicitly approved.
- Password storage and authentication flows are not included in this schema.
- Before production use, add a reviewed authentication model, backup policy, audit requirements, and data privacy controls.
