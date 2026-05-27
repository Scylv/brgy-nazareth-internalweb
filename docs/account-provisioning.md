# Account Provisioning

This guide defines account rules for the Barangay Nazareth internal web app.
The app is intended for Department Office, Lupon, and Admin users on the
barangay office LAN.

The current app has database-backed authentication for staging and pilot use.
Admin users can create named Department, Lupon, and Admin accounts, deactivate
or reactivate accounts, reset temporary passwords, and staff can change their
own password after login.

## Required Rule Before Real Data

Demo or shared accounts must be replaced before storing real resident data.

Do not use seeded demo accounts for live office records, resident registry data,
document request processing, or confidential Lupon cases.

Each staff member should have a named account. Shared accounts make audit logs
less useful and make it harder to remove access when staff assignments change.

## Roles

### Department Office

Use this role for staff who process barangay-issued document requests and check
resident clearance status.

Department users may:

- Search residents.
- View basic resident information needed for document handling.
- View resident status color.
- Create and review non-confidential document request records.

Department users must not see:

- Lupon case reasons.
- Lupon confidential summaries.
- Lupon notes or remarks.
- Lupon evidence or confidential documents.

### Lupon

Use this role only for authorized Lupon staff.

Lupon users may:

- View and maintain resident registry details.
- Update resident status.
- Access case-specific confidential Lupon information when authorized.
- Add Lupon case notes.

Lupon users should not share credentials with Department Office staff.

### Admin

Use this role for system administration only.

Admin users may:

- Review staff profile listings.
- Create named Department, Lupon, and Admin accounts.
- Deactivate or reactivate accounts.
- Reset temporary passwords.

Admin accounts should be limited. Keep at least two named Admin accounts for
continuity, but do not use Admin accounts for ordinary Department or Lupon work.

## Provisioning Checklist

For each new user:

1. Confirm the staff member's name and office assignment.
2. Assign exactly one role: `department`, `lupon`, or `admin`.
3. Create a named username tied to that staff member.
4. Set an initial temporary password through the Admin account screen.
5. Have the staff member change the temporary password after first login.
6. Confirm the account status is active.
7. Log in once from a staff PC and verify the correct dashboard and access.
8. Record the account owner, role, creation date, and approver without recording
   the password.

## Deactivation Checklist

Deactivate an account when a staff member changes assignment, leaves the office,
or no longer needs access.

1. Confirm the account username and staff owner.
2. Disable the account instead of deleting historical records.
3. Verify the user can no longer log in.
4. Review whether any shared local browser sessions should be cleared.
5. Record the deactivation date and approver.

## Password and Secret Handling

- Never commit `.env`.
- Never put the real `DATABASE_URL` in docs, screenshots, reports, or chat.
- Never screenshot password hashes, database URLs, or server environment
  variables.
- Never store staff passwords in spreadsheets, printed runbooks, or milestone
  documents.
- Use placeholders only when writing setup instructions.
- Keep database credentials separate from staff login credentials.

## Pilot Acceptance Checks

Before approving a supervised internal pilot:

1. Department account can log in and use resident search.
2. Department account cannot access Lupon routes or confidential Lupon fields.
3. Lupon account can access case-specific Lupon information.
4. Admin account can create, deactivate/reactivate, and reset staff accounts.
5. Demo/shared accounts have been replaced or disabled before real resident data
   is loaded.
6. Audit logs identify named users for sensitive mutations.
7. Password hashes are never exposed by API responses or documentation.

Recent baseline:

- `npm test` passed: 23 files / 137 tests.
- `npm run build` passed.

This is suitable for supervised internal pilot use after account replacement and
staff access checks. It should not be treated as fully unattended production
until backup/restore, restart, and credential handling procedures are tested.
