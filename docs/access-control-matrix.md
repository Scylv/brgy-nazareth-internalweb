# Access Control Matrix

This matrix documents data boundaries for the PostgreSQL schema and backend
foundation. Some React screens still use local mock data.

## Roles

| Role | Current Purpose |
| --- | --- |
| Admin | Manages staff accounts, imported resident registry records, Excel import operations, resident document metadata, and sanitized audit review. |
| Department | Searches residents, verifies status, and handles document requests. |
| Lupon | Maintains resident records and handles confidential Lupon cases. |

## Planned Table Access

| Table | Admin | Department | Lupon |
| --- | --- | --- | --- |
| `profiles` | Read/manage role metadata, account status, and password resets | Read own profile only | Read own profile only |
| `residents` | Read/create/update/archive/restore registry fields | Read basic info and `status_color` | Read/write resident registry fields |
| `resident_status_history` | Read summary fields | No default access | Read/write |
| `lupon_cases` | No default access | No access | Read/write |
| `lupon_case_notes` | No default access | No access | Read/write |
| `document_requests` | Read summary fields | Read/write | Read linked resident history |
| `document_request_events` | Read summary fields | Read/write linked request events | Read linked resident history |
| `barangay_documents` | Read/write | Read active documents | Read active documents |
| `resident_documents` | Read metadata and archive/manage metadata; no direct file preview in Admin UI | Read/list permitted non-confidential documents only | Read/list permitted documents including Lupon confidential documents |
| `attachments` | No default access | No default access | No default access until uploads are approved |
| `audit_logs` | Read sanitized audit summaries only | No default access | No default access |
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
| Audit metadata | Sanitized display only | No access | No access |
| Password hashes/auth secrets | Server-only | No access | No access |

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
- Lupon confidential document contents, storage paths, or stored filenames

## Admin Audit Boundary

Admin audit review is intentionally a sanitized operational view. The audit API
may show timestamp, actor, role, action, entity type, entity reference, and safe
details. It must not return raw audit metadata that contains or could contain:

- Lupon confidential summaries
- Lupon confidential notes
- Confidential document contents
- `storage_path`
- `stored_filename`

## Notes

- The `residents` table must not store confidential Lupon remarks or case reasons.
- Confidential Lupon information belongs only in `lupon_cases` and
  `lupon_case_notes`.
- Resident documents with `lupon_confidential` visibility are visible only to
  Lupon and Admin metadata workflows; Department must not list or download them.
- Role enforcement happens outside React UI state through backend authentication
  middleware and route-level authorization.
- Passwords are never stored as plaintext; synthetic seed users use scrypt
  password hashes.
