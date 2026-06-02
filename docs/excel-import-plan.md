# Excel Import Plan

This document plans the future import workflow for the Barangay Nazareth
internal web app using the workbook titled `Registry of Barangay
Inhabitants.xlsx`.

No import code is implemented by this document. The workbook contains real
resident information and must be treated as restricted barangay data. Do not
commit real Excel files, exports, screenshots, row samples, or real resident
data to GitHub.

## Scope

The import should support an internal LAN deployment where admin-managed
accounts, audit logging, rate limiting, protected mutating routes, and backup
documentation are already in place.

Phase 1 should import only the main resident registry sheet. Other sheets
should be handled later because they need duplicate matching, role visibility,
and senior-citizen domain decisions before they can safely update resident
records.

## Import Phases

| Phase | Workbook sheet | Scope | Status |
| --- | --- | --- | --- |
| Phase 1 | `Brgy Nazareth Inhabitatns` | Main resident registry only, about 8,006 rows x 35 columns. | Plan first implementation. |
| Phase 2 | `Non-Voters` | Separate non-voter list. Some people may be absent from the main resident registry, so this phase must support match-or-create behavior instead of only updating Phase 1 residents. | Exclude until duplicate matching is designed. |
| Phase 3 | `Senior Citizen Chapter Masterli` | Senior citizen masterlist with senior-specific fields such as OSCA ID and gender markers. Some seniors may be absent from the main resident registry, so this phase must support match-or-create behavior and later senior-specific profile fields. | Exclude until senior profile behavior is approved. |
| Phase 4 | `New Senior` | Smaller/newer senior citizen list. Some seniors may be absent from both Phase 1 and Phase 3 data, so this phase must use the same match-or-create and senior-profile review rules. | Exclude until Phase 3 rules are settled. |

## Phase 1 Source Sheet

Phase 1 uses only `Brgy Nazareth Inhabitatns`.

- Row 1 contains headers.
- Column A has no header but contains resident full names.
- The sheet contains repeated `Assistance Requested` / `Date` pairs starting at
  column Q/R and continuing to the right.
- The import must preserve the source row number for every parsed row.
- The importer must not infer meaning for unlabeled or unclear columns.

## Phase 1 Column Mapping Proposal

| Excel column | Source header or meaning | Proposed target | Import rule |
| --- | --- | --- | --- |
| A | Unlabeled full name | `residents.full_name` | Required. Trim whitespace and normalize spacing for duplicate checks. |
| B | `ADDRESS` | `residents.address` fallback | Required only if `EXACT ADDRESS` is blank. Store as text. |
| C | `PRECINCT NO.` | `residents.precinct_number` | Optional. Store as text, not a number. |
| D | Unlabeled | None | Ignore until barangay confirms meaning. Preserve only in import row raw data. |
| E | Unlabeled | None | Ignore until barangay confirms meaning. Preserve only in import row raw data. |
| F | Unlabeled | None | Ignore until barangay confirms meaning. Preserve only in import row raw data. |
| G | `BIRTHDAY` | `residents.birth_date` | Optional. Must be a valid date or blank. |
| H | `CIVIL STATUS` | `residents.civil_status` | Optional. Normalize to the app's approved civil status values. |
| I | `EMPLOYMENT` | `residents.occupation` | Optional. Normalize common employment labels while preserving readable text. |
| J | `EXACT ADDRESS` | `residents.address` primary | Required only if `ADDRESS` is blank. Prefer this over column B when present. |
| K | `CONTACT NUMBER` | `residents.contact_number` | Optional. Store as text and preserve leading zeroes. |
| L | `FACEBOOK NAME` | None for Phase 1 | Ignore until privacy and business purpose are approved. Do not put in resident notes by default. |
| M | `SITIO` | Address-supporting metadata | Optional. Use for review/search planning, but do not overwrite the main address unless the final schema supports it. |
| N | `TAG` | None for Phase 1 | Ignore until barangay confirms whether this is a resident category, document category, or assistance flag. |
| O | `REMARKS` | None for Phase 1 | Ignore until visibility is approved. Do not place confidential notes on `residents`. |
| P | Unknown or spacer column | None | Ignore unless workbook inspection confirms a meaningful header. |
| Q/R onward | Repeated `Assistance Requested` / `Date` pairs | `document_requests` and `document_request_events` | Import only when both the assistance value and a valid date can be interpreted; otherwise flag for row review. |

### Address Mapping

The app currently has one resident `address` field. For Phase 1:

1. Prefer `EXACT ADDRESS` from column J when present.
2. If column J is blank, use `ADDRESS` from column B.
3. If both are present and different, import column J as the resident address
   and keep the original column B value in the row-level import record for
   audit/review.
4. Do not concatenate `SITIO`, `ADDRESS`, and `EXACT ADDRESS` unless the
   barangay approves the final address format.

## Required Columns

For Phase 1, a row can be imported as a resident only when these conditions are
met:

- Column A full name is present.
- At least one address field is present: column B `ADDRESS` or column J
  `EXACT ADDRESS`.

The workbook-level preview should also require the expected Phase 1 sheet name
and the expected row-1 headers for known columns.

## Optional Columns

These columns can be imported when valid and left blank when empty:

- `PRECINCT NO.`
- `BIRTHDAY`
- `CIVIL STATUS`
- `EMPLOYMENT`
- `CONTACT NUMBER`
- Repeated assistance requested/date pairs, subject to validation.

`SITIO` is optional but should not be written into the current `residents`
schema as a separate value unless a future schema change adds a dedicated field.

## Ignored Until Clarified

These columns should not update resident records in Phase 1:

- Columns D, E, and F because they are unlabeled.
- `FACEBOOK NAME` because it is personal contact/social media data and needs a
  clear internal use case.
- `TAG` because its domain meaning is unclear.
- `REMARKS` because visibility could affect Department, Lupon, and Admin access
  boundaries.
- Any unknown or blank-header columns that are not part of the approved mapping.

Ignored values may be stored in `import_batch_rows.raw_data` for the admin error
report, but they must not be promoted into user-visible resident fields.

## Assistance Requested History

Repeated `Assistance Requested` / `Date` pairs should be interpreted as historic
service or document request records linked to the imported resident.

Proposed mapping:

| Source pair | Target | Rule |
| --- | --- | --- |
| `Assistance Requested` value | `document_requests.barangay_document_id` through a normalized document lookup | Match to an existing `barangay_documents` record when possible. If no approved match exists, flag the pair for review or map to a controlled "Assistance" document type after admin approval. |
| `Date` value | `document_requests.request_date` | Must be a valid date. |
| Imported history status | `document_requests.status` | Use `released` for historical completed assistance unless the barangay confirms another status. |
| Imported history event | `document_request_events` | Create an initial event noting that the record came from spreadsheet import. |
| Import provenance | `audit_logs.metadata` and import row result | Store source sheet, source row number, source pair columns, normalized assistance value, and parsed date. |

Rules for repeated pairs:

- Empty assistance/date pairs are ignored.
- Assistance with a blank date should be flagged for row review, not silently
  imported as dated history.
- Date with a blank assistance value should be flagged for row review.
- Invalid dates should fail only that row or pair according to the preview
  policy, not the whole workbook.
- Duplicate assistance history for the same resident, assistance type, and date
  should be flagged as a possible duplicate before import.

## Validation Rules

The preview step should validate every row before any database write:

- Full name is required.
- At least one address field is required: `ADDRESS` or `EXACT ADDRESS`.
- Birthday must be a valid date or blank.
- Contact number must be stored as text, preserving leading zeroes and symbols
  used in the workbook.
- Precinct number must be stored as text, preserving formatting.
- Civil status must be normalized to approved values.
- Employment must be normalized.
- Unknown columns must not be imported into user-visible fields.
- Repeated assistance dates must be valid dates when assistance is present.

Suggested civil status normalization:

| Source examples | Normalized value |
| --- | --- |
| `single`, `s`, `unmarried` | `single` |
| `married`, `m` | `married` |
| `widow`, `widowed`, `widower` | `widowed` |
| `separated`, `sep` | `separated` |
| `annulled` | `annulled` |
| Other non-empty value | Flag for review unless the barangay approves a mapping. |

Suggested employment normalization:

- Trim whitespace and normalize repeated spaces.
- Preserve the readable occupation/employment text in `residents.occupation`.
- Normalize common blank-like values such as `N/A`, `NA`, `NONE`, and `-` to
  blank only if the barangay approves.
- Do not force employment into broad categories unless the client wants
  reporting by category.

## Duplicate Detection Rules

The importer should help admins find duplicates but should not reject residents
by name alone.

Rules:

- Do not reject or auto-merge by full name alone.
- Strong duplicate if normalized full name and birthday match an existing
  resident or another valid source row.
- Possible duplicate if normalized full name and exact address match an
  existing resident or another source row.
- Possible duplicate if normalized full name and contact number match an
  existing resident or another source row.
- Same address by itself can indicate household grouping and should not be
  treated as a duplicate.
- Same family name by itself, including relatives at the same address, should
  not be treated as a duplicate.
- If birthday is blank, review same full-name matches only when exact address or
  contact number also matches instead of auto-merging.
- If both birthday and address are blank or invalid, the row cannot be imported.
- Review results should show the source row and the matched resident candidate
  without exposing unrelated sensitive fields.

Normalization for matching should:

- Trim and collapse whitespace.
- Compare names case-insensitively.
- Remove harmless punctuation for matching while keeping original display text.
- Normalize date values to a single date format before comparison.
- Normalize addresses case-insensitively and collapse repeated spaces.

## Preview-Before-Import Workflow

The import must use a preview step before any database write:

1. Admin uploads the workbook from an approved local workstation on the LAN.
2. Server validates file type, size, workbook structure, and expected Phase 1
   sheet name.
3. Server parses rows into a temporary preview/import batch with raw row data.
4. Server applies validation, normalization, and duplicate detection.
5. Admin reviews a preview summary:
   - total rows detected
   - rows ready to import
   - rows with validation errors
   - rows with possible duplicates
   - ignored columns
   - assistance history pairs detected
6. Admin downloads or views a row-level error report.
7. Admin either cancels the batch or confirms import.
8. Server writes approved residents and approved document request history in one
   controlled import operation.
9. Server records audit logs and an import summary.

Rows requiring review should not be silently imported. The first version can
support "import valid rows only" if the summary clearly reports skipped rows.

## Permissions

Excel import must be Admin-only for Phase 1.

- Department users must not upload or confirm imports.
- Lupon users must not upload or confirm imports unless a future policy grants
  explicit import rights.
- The server must enforce the role check; the React UI alone is not enough.
- Protected mutating routes must keep existing origin/referer protection.

## Backup Requirement

A verified database backup is required before every confirmed import.

The admin confirmation screen should require the operator to acknowledge:

- the backup was created before import
- the backup is stored outside the Git repository
- the backup is stored in approved restricted storage
- the operator understands the import changes resident and document request data

If practical, the import batch should store a backup reference such as date,
operator, and approved storage location label, but never a password, connection
string, or backup file content.

## Audit Logging

The import must create audit logs for sensitive mutations.

Minimum audit events:

- import preview created
- import cancelled
- import confirmed
- resident created by import
- resident matched or skipped as duplicate
- document request history created by import
- row failed validation

Audit metadata should include:

- actor profile ID
- source filename
- workbook sheet
- import batch ID
- source row number when row-specific
- created record IDs
- counts of created, skipped, duplicate, and failed rows

Audit logs must not store the full workbook content. Full source rows belong in
restricted import row records only when necessary for admin review.

## Row-Level Error Report

The row-level report should be available from the preview and completed import
views.

Recommended columns:

| Report field | Purpose |
| --- | --- |
| Source sheet | Identifies the workbook sheet. |
| Source row number | Lets staff find the row in Excel. |
| Source name | Shows the resident name from column A for review. |
| Severity | `error`, `warning`, or `duplicate_review`. |
| Field | Column or logical field that caused the issue. |
| Source value | The problematic value, redacted if needed. |
| Message | Human-readable issue. |
| Suggested action | How the admin or barangay staff can fix it. |
| Import action | `ready`, `skipped`, `imported`, or `needs_review`. |
| Created record ID | Filled after successful import. |

Example error types:

- missing full name
- missing address
- invalid birthday
- unknown civil status
- invalid assistance date
- assistance value without date
- date without assistance value
- possible duplicate resident
- ignored unclear column

## Import Summary

The import summary should be stored with the import batch and visible to Admin.

Recommended summary fields:

- import batch ID
- source filename
- source sheet
- import phase
- uploaded by
- preview created time
- confirmed by
- completed time
- total source rows
- rows imported
- rows skipped
- rows failed validation
- possible duplicates
- residents created
- existing residents matched
- document request history records created
- assistance pairs skipped
- ignored columns
- backup acknowledgement details
- final status: `pending`, `previewed`, `completed`, `completed_with_errors`,
  `cancelled`, or `failed`

## Data Handling Rules

- Keep the real workbook outside the repository.
- Keep generated exports and error reports containing real resident data outside
  the repository.
- Use synthetic rows only for tests, screenshots, pull requests, and GitHub
  issues.
- Do not paste real resident rows into chat, commit messages, test fixtures, or
  documentation.
- Store contact numbers, precinct numbers, and similar identifiers as text.
- Do not store confidential Lupon remarks or case details on `residents`.

## Client Clarification Questions

These questions must be answered before import code is implemented:

1. What are columns D, E, and F in `Brgy Nazareth Inhabitatns`?
2. Should `FACEBOOK NAME` be imported at all? If yes, who may view it and what
   is the approved internal purpose?
3. Is `TAG` a resident category, document category, assistance flag, or
   something else?
4. Should `REMARKS` be visible to Department, Lupon only, or Admin only?
5. Do any `REMARKS` values contain confidential Lupon case information?
6. Should `Non-Voters` become a resident `registered_voter` flag update, a
   separate list, or both?
7. Should senior sheets update existing residents, create senior profiles, or
   only create review tasks for staff?
8. Should `SITIO` become a dedicated resident field or remain part of the
   address text?
9. What are the approved civil status values for reports and forms?
10. Should employment be free text, normalized categories, or both?
11. For historical assistance pairs, should the app treat them as document
    requests, assistance records, or a separate service history module?
12. What status should imported historical assistance records use by default?
13. Should admins be allowed to import only valid rows while skipping failed
    rows, or must the entire workbook be clean before import?

## Future Test Coverage

When implementation begins, tests should use synthetic workbook data only.

Recommended coverage:

- workbook structure validation
- required field validation
- date parsing and invalid date handling
- contact and precinct text preservation
- civil status normalization
- employment normalization
- duplicate detection rules
- repeated assistance/date pair parsing
- admin-only route authorization
- audit log creation for preview and confirmed import
- row-level error report generation

## Implementation Notes

The implementation should be a small vertical slice:

1. Build Phase 1 preview parsing for `Brgy Nazareth Inhabitatns`.
2. Add validation, duplicate detection, and row-level reporting.
3. Add Admin-only preview and confirm endpoints.
4. Confirm import only after backup acknowledgement.
5. Create residents and approved document request history.
6. Record import batch rows, import summary, and audit logs.
7. Defer `Non-Voters`, senior sheets, Facebook names, tags, remarks, and
   unlabeled columns until the barangay answers the clarification questions.

Planned Admin follow-up features:

- Add an Admin backup panel with one-click backup and a list showing backup
  date/time and resident count.
- Add Admin resident management for searching, editing, and archiving imported
  residents without introducing hard delete in the first pass.
