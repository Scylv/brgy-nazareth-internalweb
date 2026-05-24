# Frontend Database Integration

## Purpose

This step proves the React frontend can read and create selected Department records through the Express backend API. The connected flow is intentionally small so the existing prototype stays stable while the database-backed foundation is introduced.

## Connected First

The Department resident search, resident list, status filters, and resident verification detail view are connected to:

```text
GET /api/residents
```

The Department document request metrics, recent request list, verification history, and new-request form are connected to:

```text
GET  /api/document-requests
POST /api/document-requests
```

The frontend maps the backend response shape:

```text
{ residents: [...] }
{ documentRequests: [...] }
```

into the field names expected by the existing React components.

## What Is Still Local

Other areas still depend on mock/local state and should be connected in later, focused steps.

Still mock/local for now:

- dashboards outside the connected Department resident and document request flows
- Lupon screens
- Excel import
- file uploads

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

Do not commit a real `.env` file.

## Authenticated Session

The frontend logs in through:

```text
POST /api/auth/login
```

The backend sets an HTTP-only `barangay_session` cookie. Frontend API calls use browser cookie credentials and do not send development role headers.

Seed accounts are synthetic only:

```text
admin / admin123
department / dept123
lupon / lupon123
```

## Run The Full Local Stack

1. Start PostgreSQL.
2. Run `npm run db:migrate` if migrations have not been applied.
3. Run `npm run db:seed` if seed data is needed.
4. Start the backend with `npm run dev:server`.
5. Start the frontend with `npm run dev`.

## Verify The Frontend Uses The Database

1. Update a resident name in PostgreSQL.
2. Refresh the React app.
3. Log in as Department and open the resident search/list flow.
4. Confirm the changed resident value appears in the UI.
5. Create a Department document request.
6. Confirm the new row appears through `GET /api/document-requests`.

The Department search area also shows:

```text
Data source: Database API
```

## Manual Curl Checks

Residents should be accessible to Department:

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

- Department can access residents.
- Department cannot access Lupon cases.

## Known Limitations

- The frontend is not fully integrated yet.
- Authentication uses synthetic seed accounts only.
- Dashboards may still use mock data.
- Department document request reads and creates are database-backed; editing existing requests is not database-backed yet.
- Lupon screens may still use mock data.
- Excel import and file uploads are not implemented yet.
