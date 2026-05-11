# Access Control Matrix

This matrix documents intended future data boundaries for the PostgreSQL schema.
It is planning documentation only and does not change current UI behavior.

## Roles

| Role | Current Purpose |
| --- | --- |
| Admin | Views account groups and high-level counters. |
| Department | Searches residents, verifies status, and handles document requests. |
| Lupon | Maintains resident records and handles confidential Lupon cases. |

## Planned Table Access

| Table | Admin | Department | Lupon |
| --- | --- | --- | --- |
| `profiles` | Read/manage role metadata | Read own profile only | Read own profile only |
| `residents` | Read summary fields | Read basic info and `status_color` | Read/write resident registry fields |
| `lupon_cases` | No default access | No access | Read/write |
| `lupon_case_notes` | No default access | No access | Read/write |
| `document_requests` | Read summary fields | Read/write | Read linked resident history |
| `barangay_documents` | Read/write | Read active documents | Read active documents |
| `audit_logs` | Read | No default access | No default access |
| `import_batches` | Read/manage | No default access | Future resident import access if approved |
| `import_batch_rows` | Read/manage | No default access | Future resident import access if approved |

## Field-Level Privacy Rules

| Data Area | Admin | Department | Lupon |
| --- | --- | --- | --- |
| Resident basic identity | Summary/read | Read | Read/write |
| Resident address/contact | Summary/read | Read as needed for document handling | Read/write |
| Resident `status_color` | Read | Read | Read/write |
| Confidential Lupon case summary | No default access | No access | Read/write |
| Confidential Lupon notes | No default access | No access | Read/write |
| Document request purpose/status/dates | Summary/read | Read/write | Read linked resident history |
| Public barangay document definitions | Read/write | Read | Read |
| Internal barangay document definitions | Read/write | Read if needed for processing | Read |
| Passwords/auth secrets | Not stored | Not stored | Not stored |

## Department Boundary

Department users may see only the resident fields needed for document handling:

- Resident ID
- Household ID
- Full name
- Birth date, civil status, address, and contact fields when needed
- `status_color`
- Document request records
- Active barangay document definitions

Department users must not see:

- `lupon_cases.confidential_summary`
- `lupon_case_notes.note_body`
- Lupon case workflow details or internal notes

## Notes

- The `residents` table must not store confidential Lupon remarks or case reasons.
- Confidential Lupon information belongs only in `lupon_cases` and
  `lupon_case_notes`.
- Real enforcement should happen outside React UI state, such as through
  database roles, service-layer authorization, or approved PostgreSQL policies.
- This schema does not implement authentication or password storage.
