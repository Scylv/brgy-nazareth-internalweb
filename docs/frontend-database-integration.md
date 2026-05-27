# Frontend Database Integration

## Purpose

This document tracks the React frontend flows that use the Express backend and
PostgreSQL database for Milestone 3 hosted staging.

## Database-Backed Staging Flows

Authentication is database-backed through:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
```

The backend signs an HTTP-only `barangay_session` cookie. Frontend API calls use
browser cookie credentials and do not send development role headers.

Department resident verification is connected to:

```text
GET /api/residents
GET /api/residents/:id
```

Department document request metrics, recent request lists, verification history,
and new-request creation are connected to:

```text
GET  /api/document-requests
POST /api/document-requests
POST /api/document-requests/:id/mark-processing
POST /api/document-requests/:id/mark-released
POST /api/document-requests/:id/archive
```

Lupon case display and resident edit/status persistence are connected to:

```text
GET   /api/lupon/cases
GET   /api/residents/:id
PATCH /api/residents/:id
```

Admin profile listing is connected to:

```text
GET /api/admin/profiles
```

Admin account management is connected to:

```text
POST  /api/admin/profiles
PATCH /api/admin/profiles/:id/status
POST  /api/admin/profiles/:id/reset-password
```

Admin resident management is connected to:

```text
GET   /api/admin/residents
POST  /api/admin/residents
PATCH /api/admin/residents/:id
POST  /api/admin/residents/:id/archive
POST  /api/admin/residents/:id/restore
```

Admin audit review is connected to:

```text
GET /api/admin/audit-logs
```

The frontend maps backend response shapes such as:

```text
{ residents: [...] }
{ documentRequests: [...] }
{ luponCases: [...] }
{ profiles: [...] }
{ items: [...], page, pageSize, total, totalPages, hasNext, hasPrevious }
```

into the field names expected by the existing React components.

## API Base URL

The frontend reads the backend URL from:

```text
VITE_API_BASE_URL
```

For local development, `.env.example` sets:

```text
VITE_API_BASE_URL=http://localhost:3001
```

If `VITE_API_BASE_URL` is not set, the frontend defaults to:

```text
http://localhost:3001
```

For hosted staging with separate frontend and backend services, set
`VITE_API_BASE_URL` to the backend HTTPS origin, for example:

```text
VITE_API_BASE_URL=https://example-staging-backend.onrender.com
```

Do not commit a real `.env` file.

## Hosted Staging Cookies And CORS

Separate frontend/backend staging hosts require matching CORS and cookie
settings:

Backend:

```text
NODE_ENV=staging
CORS_ORIGINS=https://example-staging-frontend.onrender.com
AUTH_COOKIE_SAMESITE=None
AUTH_COOKIE_SECURE=true
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
```

Frontend:

```text
VITE_API_BASE_URL=https://example-staging-backend.onrender.com
```

`CORS_ORIGINS` must exactly match the deployed frontend origin, including scheme
and host. Do not use `*` because credentialed requests need an exact allowed
origin. Cross-site HTTP-only cookies require `SameSite=None` and `Secure=true`;
the backend rejects `SameSite=None` when `AUTH_COOKIE_SECURE=false`.

## Seed Accounts

Seed accounts are synthetic only:

```text
admin / admin123
department / dept123
lupon / lupon123
```

These accounts are for local/staging verification and are not production
credentials.

## Run The Full Local Stack

1. Start PostgreSQL.
2. Run `npm run db:migrate` if migrations have not been applied.
3. Run `npm run db:seed` if seed data is needed.
4. Start the backend with `npm run dev:server`.
5. Start the frontend with `npm run dev`.

## Verify The Frontend Uses The Database

1. Log in as Department and open the resident search/list flow.
2. Confirm resident values match PostgreSQL seed or edited data.
3. Create a Department document request.
4. Confirm the new row appears through `GET /api/document-requests`.
5. Log in as Lupon and update an existing resident status.
6. Log back in as Department and confirm the updated status is visible.
7. Log in as Admin and confirm profile rows load from `GET /api/admin/profiles`.
8. Confirm Admin resident rows load from `GET /api/admin/residents` with backend pagination.
9. Confirm Admin audit rows load from `GET /api/admin/audit-logs` and show only safe details.

The Department search area also shows:

```text
Data source: Database API
```

## Manual Curl Checks

Residents and document requests should be accessible to Department after login:

```powershell
curl.exe -c .\.tmp-cookies.txt -H "Content-Type: application/json" -d '{"username":"department","password":"dept123"}' http://localhost:3001/api/auth/login
curl.exe -b .\.tmp-cookies.txt http://localhost:3001/api/residents
curl.exe -b .\.tmp-cookies.txt http://localhost:3001/api/document-requests
curl.exe -b .\.tmp-cookies.txt -H "Content-Type: application/json" -d '{"residentId":"RBI-2024-0001","barangayDocumentId":"BDOC-001","purpose":"Manual API verification","requestDate":"2026-05-24","status":"pending"}' http://localhost:3001/api/document-requests
```

Lupon cases should be blocked for Department:

```powershell
curl.exe -b .\.tmp-cookies.txt http://localhost:3001/api/lupon/cases
```

Expected result:

- Department can access residents and document request create/read/status/archive routes.
- Department cannot access Lupon case routes.
- Department responses do not include `confidentialSummary` or `noteBody`.
- Department cannot access Admin resident creation or audit routes.
- Admin audit responses do not include Lupon confidential summaries, notes, storage paths, or stored filenames.

## Known Limitations

- Authentication uses synthetic seed accounts only.
- Logout clears the browser cookie, but the signed stateless token is not revoked server-side.
- Department document request reads, creates, status transitions, releases, and archives are database-backed.
- Admin profile management, resident pagination/create/edit/archive/restore, Excel import preview/commit, resident document metadata, and sanitized audit log review are database-backed.
- Production user provisioning, database backup automation, and hardened database-level access policies are not implemented yet.
