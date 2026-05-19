# Frontend Database Integration

## Purpose

This step proves the React frontend can read resident data from PostgreSQL through the Express backend API. The connected flow is intentionally small so the existing prototype stays stable while the database-backed foundation is introduced.

## Connected First

The Department resident search, resident list, status filters, and resident verification detail view are connected to:

```text
GET /api/residents
```

The frontend maps the backend response shape:

```text
{ residents: [...] }
```

into the field names expected by the existing React components.

## Why Only Residents

Only the resident search/list/details flow was connected in this step because it is the safest proof that seeded database residents can appear in the UI. Other areas still depend on mock/local state and should be connected in later, focused steps.

Still mock/local for now:

- login and authentication
- dashboards outside the connected resident search/list flow
- document requests
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

## Development Role Header

The frontend sends:

```text
x-user-role: department
```

This matches the current backend role middleware and lets the Department flow read residents while still blocking Lupon-only data.

`x-user-role` is development-only. It must be replaced by real authentication and server-issued authorization before production use.

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

The Department search area also shows:

```text
Data source: Database API
```

## Manual Curl Checks

Residents should be accessible to Department:

```powershell
curl.exe -H "x-user-role: department" http://localhost:3001/api/residents
```

Lupon cases should be blocked for Department:

```powershell
curl.exe -H "x-user-role: department" http://localhost:3001/api/lupon/cases
```

Expected result:

- Department can access residents.
- Department cannot access Lupon cases.

## Known Limitations

- The frontend is not fully integrated yet.
- Login is still not real authentication.
- Dashboards may still use mock data.
- Document requests may still use mock data.
- Lupon screens may still use mock data.
- Excel import and file uploads are not implemented yet.
