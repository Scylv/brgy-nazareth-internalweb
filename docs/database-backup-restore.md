# Database Backup and Restore

This guide covers PostgreSQL backup and restore for the Barangay Nazareth
internal web app on a local office server or LAN deployment.

Backups are required before storing real resident registry, document request, or
Lupon case data. Lupon case summaries and notes are confidential and must be
protected in backups.

## Credential Rules

- Do not commit `.env`.
- Do not write the real `DATABASE_URL` in docs, screenshots, reports, or chat.
- Do not screenshot database admin tools if credentials or connection strings
  are visible.
- Store backup credentials only in approved server configuration or a secured
  password manager.
- Use placeholders in commands and documentation.

## Backup Retention

Recommended minimum retention for the internal pilot:

- Daily backups for 7 days.
- Weekly backups for 1 month.

Store backups outside the main server disk, such as an encrypted external drive
or approved internal network storage. A backup on the same disk as PostgreSQL is
not enough protection against disk failure.

## Backup Command

Use `pg_dump` from the office server or an approved admin workstation.

Plain SQL backup:

```bash
pg_dump "postgres://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>" > backups/brgy_nazareth_YYYY-MM-DD.sql
```

Compressed custom-format backup:

```bash
pg_dump -Fc "postgres://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>" -f backups/brgy_nazareth_YYYY-MM-DD.dump
```

Use the custom format for regular backups if the team expects larger data,
because it works well with `pg_restore`.

## Suggested Backup Schedule

Run one daily backup after office hours:

```bash
pg_dump -Fc "postgres://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>" -f backups/daily/brgy_nazareth_YYYY-MM-DD.dump
```

Run one weekly backup at the end of the week:

```bash
pg_dump -Fc "postgres://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>" -f backups/weekly/brgy_nazareth_YYYY-MM-DD.dump
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

Create a test restore database:

```bash
createdb "postgres://<admin_user>:<admin_password>@<db_host>:<db_port>/<restore_db_name>"
```

Restore from custom-format backup:

```bash
pg_restore --clean --if-exists --dbname "postgres://<admin_user>:<admin_password>@<db_host>:<db_port>/<restore_db_name>" backups/brgy_nazareth_YYYY-MM-DD.dump
```

Restore from plain SQL backup:

```bash
psql "postgres://<admin_user>:<admin_password>@<db_host>:<db_port>/<restore_db_name>" < backups/brgy_nazareth_YYYY-MM-DD.sql
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
