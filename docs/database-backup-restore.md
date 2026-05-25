# Database Backup and Restore

This guide covers PostgreSQL backup and restore for the Barangay Nazareth
internal web app on a local office server or LAN deployment.

Backups are required before storing real resident registry, document request, or
Lupon case data. Lupon case summaries and notes are confidential and must be
protected in backups.

Backup files contain resident personal data and Lupon confidential data. Treat
backup files as restricted records: store them only on approved encrypted
storage, limit access to authorized operators, and never attach them to issue
trackers, chats, reports, or emails unless formally approved.

## Credential Rules

- Do not commit `.env`.
- Do not write the real `DATABASE_URL` in docs, screenshots, reports, or chat.
- Do not screenshot database admin tools if credentials or connection strings
  are visible.
- Store backup credentials only in approved server configuration or a secured
  password manager.
- Use placeholders in commands and documentation.
- Do not store database backups inside this Git repository, including under
  `docs/`, `backups/`, or any temporary project folder. Backup files must stay
  outside source control.

## Backup Retention

Recommended minimum retention for the internal pilot:

- Daily backups for 7 days.
- Weekly backups for 1 month.

Store backups outside the main server disk, such as an encrypted external drive
or approved internal network storage. A backup on the same disk as PostgreSQL is
not enough protection against disk failure.

Recommended folder layout outside the repository:

```text
<approved_backup_root>/
  daily/
  weekly/
  restore-tests/
```

## Backup Command

Use `pg_dump` from the office server or an approved admin workstation. Replace
every placeholder before running the command. Do not paste real passwords into
documentation.

Plain SQL backup:

```bash
pg_dump --host "<db_host>" --port "<db_port>" --username "<db_user>" --dbname "<db_name>" --format=plain --file "<approved_backup_root>/daily/brgy_nazareth_YYYY-MM-DD.sql"
```

Compressed custom-format backup:

```bash
pg_dump --host "<db_host>" --port "<db_port>" --username "<db_user>" --dbname "<db_name>" --format=custom --file "<approved_backup_root>/daily/brgy_nazareth_YYYY-MM-DD.dump"
```

Use the custom format for regular backups if the team expects larger data,
because it works well with `pg_restore`.

Windows PowerShell example for a custom-format daily backup:

```powershell
$env:PGPASSWORD = "<db_password>"
pg_dump --host "<db_host>" --port "<db_port>" --username "<db_user>" --dbname "<db_name>" --format=custom --file "<approved_backup_root>\daily\brgy_nazareth_YYYY-MM-DD.dump"
Remove-Item Env:\PGPASSWORD
```

If the server uses a `.pgpass` or `pg_service.conf` file managed by the
administrator, omit `$env:PGPASSWORD` and let PostgreSQL prompt or read the
approved local configuration.

## Suggested Backup Schedule

Run one daily backup after office hours:

```bash
pg_dump --host "<db_host>" --port "<db_port>" --username "<db_user>" --dbname "<db_name>" --format=custom --file "<approved_backup_root>/daily/brgy_nazareth_YYYY-MM-DD.dump"
```

Run one weekly backup at the end of the week:

```bash
pg_dump --host "<db_host>" --port "<db_port>" --username "<db_user>" --dbname "<db_name>" --format=custom --file "<approved_backup_root>/weekly/brgy_nazareth_YYYY-MM-DD.dump"
```

After each backup:

1. Confirm the file exists.
2. Confirm the file size is greater than zero.
3. Copy it to approved external or network storage.
4. Remove expired backups according to the retention rule.
5. Record the backup date, operator, and storage location without recording
   credentials.

## Restore Test Procedure

Test restores into a separate database. Do not overwrite the live office
database during a restore test.

Use a restore database name that cannot be confused with the live database, such
as `<db_name>_restore_test_YYYYMMDD`.

Create a separate test restore database:

```bash
createdb --host "<db_host>" --port "<db_port>" --username "<admin_user>" --owner "<db_user>" "<restore_db_name>"
```

Restore from custom-format backup:

```bash
pg_restore --host "<db_host>" --port "<db_port>" --username "<admin_user>" --dbname "<restore_db_name>" --clean --if-exists --no-owner --verbose "<approved_backup_root>/daily/brgy_nazareth_YYYY-MM-DD.dump"
```

Restore from plain SQL backup:

```bash
psql --host "<db_host>" --port "<db_port>" --username "<admin_user>" --dbname "<restore_db_name>" --file "<approved_backup_root>/daily/brgy_nazareth_YYYY-MM-DD.sql"
```

Windows PowerShell example for a custom-format restore test:

```powershell
$env:PGPASSWORD = "<admin_password>"
createdb --host "<db_host>" --port "<db_port>" --username "<admin_user>" --owner "<db_user>" "<restore_db_name>"
pg_restore --host "<db_host>" --port "<db_port>" --username "<admin_user>" --dbname "<restore_db_name>" --clean --if-exists --no-owner --verbose "<approved_backup_root>\daily\brgy_nazareth_YYYY-MM-DD.dump"
Remove-Item Env:\PGPASSWORD
```

After restoring:

1. Start the backend against the restored test database.
2. Open:

   ```text
   http://barangay-server/api/health
   ```

3. Verify login with an approved test account.
4. Verify resident search, document request records, and Lupon-only case access.
5. Confirm Department users cannot see Lupon confidential summaries or notes.
6. Document the restore date, backup file used, result, and tester name.
7. Drop the restore test database only after the result has been recorded:

   ```bash
   dropdb --host "<db_host>" --port "<db_port>" --username "<admin_user>" "<restore_db_name>"
   ```

   PowerShell:

   ```powershell
   $env:PGPASSWORD = "<admin_password>"
   dropdb --host "<db_host>" --port "<db_port>" --username "<admin_user>" "<restore_db_name>"
   Remove-Item Env:\PGPASSWORD
   ```

## Live Restore Procedure

Use live restore only after an approved outage or data recovery decision.

1. Notify affected staff.
2. Stop the backend service.
3. Take a final emergency backup of the current database if possible.
4. Restore the selected backup into the live database.
5. Start the backend service.
6. Verify:

   ```text
   http://barangay-server/api/health
   ```

7. Open the app from a staff PC and test the main Department, Lupon, and Admin
   flows.
8. Record the incident, restore file, restore time, and verification result.

## Power Outage Check

After a power outage, check the latest successful backup before allowing normal
office use:

1. Confirm PostgreSQL is running.
2. Confirm the backend health endpoint returns `{"ok":true}`.
3. Confirm the latest backup file exists.
4. Run a quick app login and resident search check.
5. If data appears missing or corrupted, stop use and restore from the latest
   verified backup.

## Pilot Acceptance Checklist

Before approving internal pilot use:

- A backup has been created using the documented `pg_dump` command with only
  approved storage locations.
- A successful restore test has been completed into a separate test database.
- The restored app has passed login, resident search, document request, and
  Lupon access checks.
- The restore test record includes the backup filename, restore database name,
  date, tester, and pass/fail result without exposing credentials.
- Backup files are confirmed to be outside the Git repository and protected as
  confidential resident and Lupon records.
