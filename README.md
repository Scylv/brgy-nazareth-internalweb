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
- Local mock data

## Install Dependencies

Install project dependencies from the repository root:

```bash
npm install
```

## Run Tests

Run the Vitest test suite:

```bash
npm test
```

This verifies core local logic such as resident search, status handling, permissions, document request logic, and resident form validation.

## Run Locally

Start the Vite development server for use on the same laptop:

```bash
npm run dev
```

Open the local URL shown in the terminal, usually:

```text
http://localhost:5173/
```

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

- The current version uses mock/local data.
- There is no database integration yet.
- There are no file uploads yet.
- Document request tracking is transaction-based and linked to residents.
- Department handles barangay-issued document requests.
- Lupon case documents and records are separate and confidential.
- The production version should use a database, real authentication, backups, and role-based access control.

## Build Check

Create a production build locally with:

```bash
npm run build
```

The generated `dist` folder is only a local build artifact for verification unless a separate deployment step is explicitly planned.
