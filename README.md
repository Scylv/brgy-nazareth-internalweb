# Barangay Resident Status Verification and Lupon Registry System

A web-based internal prototype for Barangay Nazareth that supports resident status verification for clearance processing and internal Lupon record management.

## Project Purpose

The main purpose of the system is to allow the Department Office to search for a resident and verify whether clearance processing may proceed.

- **Green** = proceed with clearance
- **Yellow** = refer to Lupon
- **Red** = refer to Lupon

Lupon Staff maintain resident records, encode RBI information, update statuses, add remarks, and manage resident-related documents. Admin manages users and roles.

## User Roles

### Department Office Staff
- Search residents
- View limited resident information
- View status result only
- Decide whether clearance may proceed

### Lupon Staff
- Encode and edit resident records
- Update status
- Add remarks
- Manage resident documents

### Admin
- Manage users
- Assign roles
- View basic system administration placeholders

## Core Workflow

1. Department Office staff logs in
2. Searches a resident by name or ID
3. Views resident verification result
4. If status is Green, clearance may proceed
5. If status is Yellow or Red, resident is referred to Lupon
6. Lupon staff updates resident records and statuses as needed

## Tech Stack

- React
- Tailwind CSS
- Vite
- Vitest
- Local mock data (prototype only)

## How to Run Locally

Clone the repository:

```bash
git clone https://github.com/Scylv/brgy-nazareth-internalweb.git
cd brgy-nazareth-internalweb
```

Do the ff within directory,

Install dependencies:
npm install

run dev server:
npm run dev

Open the local URL shown in the terminal, usually:
http://localhost:5173/

Running unit tests:
npm test

This executes the project’s unit tests for core logic modules such as:
resident search
status action mapping
role permissions
resident form va
