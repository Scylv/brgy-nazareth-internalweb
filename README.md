# Barangay Resident Status Verification and Lupon Registry System

A web-based internal prototype for Barangay Nazareth that supports resident status verification for clearance processing, barangay-issued document request tracking, and internal Lupon record management.

## Project Purpose

The main purpose of the system is to allow the Department Office to search for a resident and verify whether clearance processing may proceed.

- **Green** = proceed with clearance
- **Yellow** = refer to Lupon
- **Red** = refer to Lupon

Lupon Staff maintain resident records, encode RBI information, update statuses, add remarks, and manage resident-related case context. Admin manages users and roles through a mock account management screen.

## User Roles

### Department Office Staff

- Search residents
- View limited resident information
- Use green, yellow, and red status filters
- View non-confidential barangay document request metrics
- Create and update barangay-issued document requests linked to residents
- Decide whether clearance may proceed

### Lupon Staff

- Search residents
- View status and Lupon case context
- Encode and edit resident records
- Update statuses
- Add remarks
- Manage resident record details

### Admin

- View account management mock screen
- Review users and roles
- View basic system administration placeholders

## Local Demo Accounts

Use these prototype-only accounts on the login screen:

| Role | Username | Password |
| --- | --- | --- |
| Department | `department` | `dept123` |
| Lupon | `lupon` | `lupon123` |
| Admin | `admin` | `admin123` |

These are local mock accounts only. They are not production authentication credentials.

## Tech Stack

- React
- Tailwind CSS
- Vite
- Vitest
- Node.js
- Express
- PostgreSQL
- `pg`
- Local mock data for unintegrated prototype screens

## Install Dependencies

Install project dependencies from the repository root:

```bash
npm install
```

## Environment Setup

Copy the example environment file and set a local PostgreSQL connection string:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Edit `.env` for your local database:

```text
DATABASE_URL=postgres://postgres:postgres@localhost:5432/brgy_nazareth_internalweb
PORT=3001
AUTH_SESSION_SECRET=development-change-me
```

`AUTH_SESSION_SECRET` signs the HTTP-only session cookie. The checked-in value in
`.env.example` is for local development only; use a long random value for staging
or production. Outside `NODE_ENV=development`, the backend fails at startup if
`AUTH_SESSION_SECRET` is missing.

Do not commit real database credentials or production secrets.

## Database Setup

Create a local PostgreSQL database named in `DATABASE_URL`, then run the initial migration:

```bash
npm run db:migrate
```

Load the sample seed data:

```bash
npm run db:seed
```

The migration runner executes:

```text
database/migrations/001_initial_schema.sql
```

The seed runner executes:

```text
database/seed.sql
```

The schema includes residents, document requests, Lupon cases and notes, status history, document request events, import tracking, audit logs, and a future-ready attachments table. Actual file upload is not implemented yet.

## Run Tests

Run the Vitest test suite:

```bash
npm test
```

This verifies core local logic such as resident search, status handling, permissions, document request logic, and resident form validation.

## Run Locally

Start the Vite development server for the existing React prototype:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

```text
http://localhost:5173/
```

Start the backend API in a separate terminal:

```bash
npm run dev:server
```

The API listens on:

```text
http://localhost:3001/
```

Available API routes:

```text
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout
GET  /api/residents
GET  /api/residents/:id
GET  /api/document-requests
POST /api/document-requests
GET  /api/lupon/cases
POST /api/lupon/cases
POST /api/lupon/cases/:id/notes
```

The backend uses database-backed synthetic users, scrypt password hashes, and an HTTP-only session cookie:

```text
admin / admin123
department / dept123
lupon / lupon123
```

Department routes do not expose `lupon_cases.confidential_summary` or `lupon_case_notes.note_body`. Lupon case routes require the `lupon` role.

## Frontend Database-Backed Residents

The Department resident search/list and verification flow now reads resident data from the backend API. The backend must be running for database-backed resident data to load in the React app.

The frontend uses:

```text
VITE_API_BASE_URL=http://localhost:3001
```

If `VITE_API_BASE_URL` is not set, the frontend defaults to `http://localhost:3001`. If the backend is off, resident API loading fails and the Department resident list shows an error state.

See [Frontend Database Integration](docs/frontend-database-integration.md) for setup, verification steps, curl checks, and current limitations.

## Staging Deployment

Use staging only for Milestone 3 internal testing and acceptance checks. Staging must use synthetic data only; do not load real resident records, real Lupon case details, or production secrets into the staging database.

Recommended staging services:

- **Frontend host:** Vercel, Render Static Site, Netlify, or another static frontend host.
- **Backend host:** Render Web Service or another Node.js service that can run the Express API.
- **Database provider:** Render PostgreSQL, Neon, Supabase PostgreSQL, or another hosted PostgreSQL database.

Required backend environment variables:

```text
DATABASE_URL=postgres://...
PORT=3001
NODE_ENV=staging
CORS_ORIGINS=https://example-staging-frontend.onrender.com
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
```

Localhost CORS origins are included automatically only in local development.
For staging and production, every credentialed frontend origin must be listed in
`CORS_ORIGINS`. Do not use wildcard CORS with credentialed session cookies.

Required frontend environment variable:

```text
VITE_API_BASE_URL=https://example-staging-backend.onrender.com
```

Set real staging values in the hosting provider dashboard. Do not commit `.env` files or real database credentials.

Frontend deployment:

```bash
npm install
npm run build
```

Publish the generated `dist` folder or configure the frontend host with:

```text
Build command: npm run build
Publish directory: dist
```

Backend deployment:

```bash
npm install
npm start
```

Configure the backend host with:

```text
Start command: npm start
```

Run database setup against the staging PostgreSQL database after `DATABASE_URL` is set for the backend environment:

```bash
npm run db:migrate
npm run db:seed
```

The current migration and seed scripts are intended for a fresh staging database. Do not re-run the seed script on a populated staging database unless the data reset is intentional.

Known staging limitations:

- Authentication uses synthetic seed accounts only; these are not production credentials.
- Logout clears the browser cookie, but the signed stateless token is not revoked
  server-side. A copied token remains valid until expiry; this is acceptable for
  synthetic-data staging, not final production.
- Some React screens still use local mock data.
- File uploads, backups, production user provisioning, and hardened database-level access policies are not implemented yet.
- Department users must not see Lupon confidential summaries or notes; this boundary is covered by backend tests and should be checked again during acceptance testing.

## Run On The Local Network

For a client demo from another phone, tablet, or laptop on the same Wi-Fi network, start Vite in host mode:

```bash
npm run dev -- --host 0.0.0.0
```

Find the demo laptop's local IPv4 address. On Windows, run:

```powershell
ipconfig
```

Look for the active Wi-Fi or Ethernet adapter and copy its `IPv4 Address`, for example:

```text
192.168.1.23
```

On another device connected to the same local network, open:

```text
http://192.168.1.23:5173/
```

Replace `192.168.1.23` with the laptop's actual local IP address.

Notes for the LAN demo:

- Do not deploy the prototype online.
- Keep both devices on the same Wi-Fi or local network.
- If the other device cannot connect, allow Node/Vite through the laptop firewall for the local/private network.
- Stop the dev server after the demo with `Ctrl+C`.

## Client Demo Flow

1. Log in as Department using `department` / `dept123`.
2. Search residents from the Department dashboard.
3. Use the green, yellow, and red filters to show clearance status handling.
4. Review Department document request metrics.
5. Explain that Department sees only non-confidential barangay-issued document request data.
6. Open resident verification from a selected resident.
7. Log out, then log in as Lupon using `lupon` / `lupon123`.
8. Show the Lupon dashboard, resident status, and case context.
9. Explain that Lupon confidential remarks and internal case context are hidden from Department users.
10. Log out, then log in as Admin using `admin` / `admin123`.
11. Show the account management mock screen.

## Prototype Notes

- The Department resident search/list and verification flow uses the database API.
- Other React screens may still use mock/local data.
- The backend is a minimal database-backed foundation and does not replace all React prototype state yet.
- There are no file uploads yet.
- Document request tracking is transaction-based and linked to residents.
- Department handles barangay-issued document requests.
- Lupon case documents and records are separate and confidential.
- The production version should add real authentication, backups, reviewed deployment settings, and hardened role-based access control.

## Build Check

Create a production build locally with:

```bash
npm run build
```

The generated `dist` folder is only a local build artifact for verification unless a separate deployment step is explicitly planned.
