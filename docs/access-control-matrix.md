# Access Control Matrix

This matrix documents intended database-era access boundaries based on the current mock roles. It is planning documentation only and does not change current UI behavior.

## Roles

| Role | Current Purpose |
| --- | --- |
| Admin | Views account groups and high-level counters. |
| Department | Searches residents, verifies clearance status, and manages document requests. |
| Lupon | Maintains resident registry details and Lupon review fields. |

## Planned Data Access

| Data Area | Admin | Department | Lupon |
| --- | --- | --- | --- |
| Staff account list | Read | No access | No access |
| Staff role assignment | Future manage | No access | No access |
| Passwords/auth secrets | No database access planned | No database access planned | No database access planned |
| Resident identity fields | Summary/read for counters only | Read limited verification fields | Read/write |
| Resident address/contact fields | Summary/read for counters only | Read limited verification fields | Read/write |
| Sector classifications | Summary/read for counters only | Read limited verification fields | Read/write |
| Clearance status | Summary/read for counters only | Read | Read/write |
| Lupon remarks | No access | No access | Read/write |
| Confidential Lupon case reason | No access | No access | Read/write |
| Document requests | Summary/read for counters only | Read/write | Read for selected resident history |
| Audit events | Future read | No access | No access |

## Notes

- Department users should see only the fields needed for document handling and clearance verification.
- Lupon users own resident record maintenance and confidential case details.
- Admin users should not receive confidential Lupon case details by default.
- Any future database implementation should enforce these boundaries outside the React UI, such as through database roles, service-layer permissions, or approved policy controls.
- The current prototype accounts are local mock data and are not a real authentication system.
