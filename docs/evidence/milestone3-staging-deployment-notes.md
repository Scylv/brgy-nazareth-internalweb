# Milestone 3 Staging Deployment Notes

Date: 2026-05-24
Branch: `staging`
Release tag to create: `v1.0.0-alpha.2`

## Deployment URLs

| Item | Value |
| --- | --- |
| Frontend Static Site | `https://brgy-nazareth-internalweb-1.onrender.com/` |
| Backend/API Web Service | `https://brgy-nazareth-internalweb.onrender.com` |
| Backend Health Check | `https://brgy-nazareth-internalweb.onrender.com/api/health` |
| Database provider | Render PostgreSQL |

The staging database is configured through the backend `DATABASE_URL` Render
environment variable. The actual value is intentionally not documented because
it contains credentials.

## Verification Results

- Current branch: `staging`
- Worktree: clean before documentation edits
- Branch flow: `develop` is already an ancestor of `staging`; `staging` is 10 commits ahead of `develop`
- `npm test`: passed, 19 test files and 112 tests
- `npm run build`: passed, Vite built `dist`
- Backend health check: passed with `{"ok":true}`

## Alpha Acceptance Scope

Use synthetic seeded accounts only:

| Role | Username | Password |
| --- | --- | --- |
| Department | `department` | `dept123` |
| Lupon | `lupon` | `lupon123` |
| Admin | `admin` | `admin123` |

Acceptance testing should cover:

- Department login, resident search, status review, document request metrics, and document request creation
- Department cannot access Lupon routes or confidential Lupon fields
- Lupon login, case context display, resident status update, and resident edit persistence
- Admin login and database-backed profile listing
- Logout and session behavior on the hosted frontend/backend origins

## Known Limitations

- Authentication uses synthetic seed accounts only.
- Logout clears the browser cookie, but the signed stateless token is not revoked server-side.
- Resident creation is not database-backed yet.
- Department document request reads and creates are database-backed; editing existing requests is not database-backed yet.
- Admin profile listing is database-backed; account creation, role edits, deactivation, and password reset are planned.
- File uploads, backups, production user provisioning, and hardened database-level access policies are not implemented yet.

## Manual Evidence Still Needed

- Screenshot of frontend staging URL loading successfully
- Screenshot of Department login and resident verification flow
- Screenshot or note showing Department document request creation/read behavior
- Screenshot of Lupon case/status workflow
- Screenshot of Admin profile listing
- Short pass/fail acceptance checklist with tester role/name and date
