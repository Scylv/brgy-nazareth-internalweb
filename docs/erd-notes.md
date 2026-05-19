# ERD Notes

These notes describe the initial entity relationship model for future
PostgreSQL planning. They are not an instruction to integrate the frontend with
a database.

## Entity Relationship Overview

```txt
profiles
  1 -> many lupon_cases.created_by_profile_id
  1 -> many lupon_cases.assigned_lupon_profile_id
  1 -> many lupon_case_notes.created_by_profile_id
  1 -> many document_requests.processed_by_profile_id
  1 -> many resident_status_history.changed_by_profile_id
  1 -> many document_request_events.created_by_profile_id
  1 -> many attachments.uploaded_by_profile_id
  1 -> many audit_logs.actor_profile_id
  1 -> many import_batches.created_by_profile_id

residents
  1 -> many lupon_cases
  1 -> many document_requests
  1 -> many resident_status_history

lupon_cases
  1 -> many lupon_case_notes

barangay_documents
  1 -> many document_requests

document_requests
  1 -> many document_request_events

import_batches
  1 -> many import_batch_rows
```

## Relationship Details

| Relationship | Cardinality | Notes |
| --- | --- | --- |
| `residents` to `lupon_cases` | One-to-many | A resident can have multiple Lupon cases over time. |
| `lupon_cases` to `lupon_case_notes` | One-to-many | Each case may have confidential internal notes. |
| `residents` to `document_requests` | One-to-many | A resident can request multiple documents. |
| `residents` to `resident_status_history` | One-to-many | A resident can have many status-color changes. |
| `barangay_documents` to `document_requests` | One-to-many | A request is for one configured barangay document. |
| `document_requests` to `document_request_events` | One-to-many | Each request can have many timeline/status events. |
| `profiles` to `document_requests` | One-to-many | A department profile may process many requests. |
| `profiles` to `lupon_cases` | One-to-many | Lupon profiles may create or be assigned cases. |
| `profiles` to `audit_logs` | One-to-many | Audit entries may be tied to the acting profile. |
| `import_batches` to `import_batch_rows` | One-to-many | Each import run tracks row-level outcomes. |

## Privacy Design

- `residents` stores `status_color` but no confidential Lupon details.
- `lupon_cases` stores confidential summaries and case workflow information.
- `lupon_case_notes` stores confidential note bodies.
- Department-facing queries should use only resident basic fields,
  `status_color`, document requests, and document definitions.
- Admin access to confidential Lupon tables should be denied by default unless a
  future policy explicitly grants audit or oversight access.

## Design Decisions

- Text primary keys are used because current mock records already use stable
  values such as `RBI-2024-0001` and `DOC-2026-0001`.
- `status_color` is the resident clearance indicator and accepts only `green`,
  `yellow`, or `red`.
- Document request statuses are lowercase:
  `pending`, `processing`, `released`, `cancelled`, and `expired`.
- `barangay_documents` separates document definitions from request instances.
- `audit_logs`, `import_batches`, and `import_batch_rows` are included now so
  operational history and future bulk imports have planned tables.
- `resident_status_history` and `document_request_events` keep status changes
  out of single mutable columns when a timeline is needed.
- `attachments` stores future file metadata only; upload/storage behavior is
  intentionally not implemented yet.
- Password hashes and authentication provider details are intentionally omitted.

## Future ERD Candidates

- `households` if household-level reports and household membership workflows are
  required.
- `case_hearings` if Lupon proceedings require scheduled hearing records.
