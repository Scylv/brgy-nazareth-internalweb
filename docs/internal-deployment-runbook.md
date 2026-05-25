# Internal Deployment Runbook

This runbook describes a practical internal-only deployment for the Barangay
Nazareth internal web app. The target environment is a local office server or
mini PC on the barangay LAN, not a public internet deployment.

The current hardening is enough for a supervised internal pilot. It is not yet a
fully unattended production setup until this runbook, backup/restore,
credential handling, and account provisioning procedures are tested with real
office staff.

## Recommended LAN Architecture

Use one dedicated office server or mini PC connected to the barangay office LAN.

Recommended services on the server:

- PostgreSQL database
- Node.js backend API
- Built React frontend from `dist`
- Reverse proxy such as Nginx, Caddy, IIS, or another approved local proxy

Preferred browser URL:

```text
http://barangay-server/
```

Fallback browser URL:

```text
http://<static-lan-ip>/
```

Prefer a same-origin reverse proxy:

- `/` serves the built frontend files.
- `/api/*` forwards to the backend API.
- Staff browsers use one LAN hostname or IP address.
- Cookies and origin checks stay simpler than separate frontend/backend ports.

Avoid using the Vite development server for office operation. Use `npm run build`
and serve the generated `dist` folder through the local web server or reverse
proxy.

## Required Environment Variables

Backend environment variables:

```text
NODE_ENV=production
DATABASE_URL=postgres://<db_user>:<db_password>@<db_host>:<db_port>/<db_name>
PORT=3001
CORS_ORIGINS=http://barangay-server
AUTH_SESSION_SECRET=<long-random-secret>
AUTH_COOKIE_SAMESITE=Lax
AUTH_COOKIE_SECURE=false
```

Frontend build environment variable when the API is not same-origin:

```text
VITE_API_BASE_URL=http://barangay-server
```

For the preferred same-origin reverse proxy setup, configure the frontend to call
the same LAN origin used by staff. If separate ports or hostnames are used,
`CORS_ORIGINS` must exactly match the frontend origin, including scheme and
host.

Use placeholders in documentation. Never place the real `DATABASE_URL`,
database password, or `AUTH_SESSION_SECRET` in GitHub, reports, screenshots, or
chat logs.

## Deployment Steps

1. Install Node.js, npm, PostgreSQL, and the approved reverse proxy on the
   office server.
2. Create the PostgreSQL database and database user.
3. Set the backend environment variables on the server.
4. Install project dependencies:

   ```bash
   npm install
   ```

5. Run migrations:

   ```bash
   npm run db:migrate
   ```

6. Seed only if this is a fresh pilot database and the seed data is approved:

   ```bash
   npm run db:seed
   ```

7. Build the frontend:

   ```bash
   npm run build
   ```

8. Configure the backend to start with:

   ```bash
   npm start
   ```

9. Configure the reverse proxy to serve `dist` and forward `/api/*` to the
   backend port.
10. Verify the backend health endpoint:

   ```text
   http://barangay-server/api/health
   ```

   Expected response:

   ```json
   {"ok":true}
   ```

11. Open the app from one staff PC and verify login, Department resident search,
   Lupon case access, Admin profile listing, and logout.

## Staff PC Access

Create a browser shortcut on staff PCs after the LAN address is stable.

Preferred shortcut:

```text
http://barangay-server/
```

Fallback shortcut:

```text
http://<static-lan-ip>/
```

Use a static LAN IP or router DHCP reservation for the office server. If a
hostname is used, confirm every staff PC can resolve it before pilot use.

Staff PCs should be on the private office network. Do not expose the office
server directly to the public internet for normal operation.

## Startup After Power Outage

After power returns:

1. Power on the office server and network equipment.
2. Confirm PostgreSQL has started.
3. Confirm the backend service has started.
4. Confirm the reverse proxy or local web server has started.
5. Open the health endpoint:

   ```text
   http://barangay-server/api/health
   ```

6. Open the app from a staff PC.
7. Log in with an approved named account.
8. Check Department resident search.
9. Check Lupon access only from a Lupon account.
10. Check that Admin profile listing loads from an Admin account.

Recommended hardening for office use:

- Use a UPS for the server and network switch/router.
- Configure PostgreSQL, backend, and reverse proxy as automatic startup
  services.
- Keep a printed restart checklist near the server, without credentials.

## Pilot Readiness Notes

Recent verification:

- `npm test` passed: 22 files / 127 tests.
- `npm run build` passed.

The current hardening is suitable for a supervised internal pilot with approved
users and controlled devices. Before unattended daily operation with real
resident records, test backup restore, account provisioning, power-outage
restart, credential storage, and staff access procedures.

## Credential Handling Rules

- Never commit `.env`.
- Never screenshot `.env`, hosting dashboards, database tools, or terminal
  output that shows secrets.
- Never put the real `DATABASE_URL` in documentation.
- Never share database passwords in group chat or milestone reports.
- Use placeholders such as `postgres://<db_user>:<db_password>@<db_host>/<db_name>`.
- Replace demo/shared accounts before storing real resident data.
