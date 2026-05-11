# ERD Notes

These notes describe the initial entity relationship model for future PostgreSQL planning. They are not an instruction to integrate the frontend with a database.

## Entity Relationships

```txt
staff_accounts
  role-based internal users; not connected to password storage

residents
  1 -> many resident_sectors
  1 -> many resident_documents
  1 -> many document_requests

document_requests
  many -> 1 residents
```

## Relationship Details

| Relationship | Cardinality | Notes |
| --- | --- | --- |
| residents to resident_sectors | One-to-many | A resident may belong to several sectors such as PWD, Solo Parent, or Registered Voter. |
| residents to resident_documents | One-to-many | A resident may have several associated document labels in the registry. |
| residents to document_requests | One-to-many | A resident can have multiple document requests over time. |
| staff_accounts to document_requests | Not enforced initially | Current mock requests store `processed_by` as a display name. A later migration may replace this with `processed_by_account_id`. |

## Design Decisions

- Text primary keys are used first because current mock records already use meaningful IDs such as `RBI-2024-0001` and `DOC-2026-0001`.
- Resident sectors and resident documents are normalized into child tables instead of arrays so future reporting is easier.
- Lupon-sensitive fields remain on the resident record for the initial plan, but access controls must prevent non-Lupon roles from reading those columns.
- Staff account rows intentionally omit password hashes and authentication provider details.
- No PostgreSQL extensions are required for the initial migration.

## Future ERD Candidates

- `households` table if household-level reports become required.
- `lupon_cases` table if disputes need a full case workflow instead of the current status and note fields.
- `audit_events` table once database writes are implemented.
- `document_types` lookup table if document types need client-managed configuration.
