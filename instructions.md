You are working on a React + Tailwind web app prototype for an internal barangay system called:

“Barangay Resident Status Verification and Lupon Registry System”

Tech assumptions:
- Frontend: React + Tailwind
- For now, use local mock data only unless I explicitly ask for Supabase
- Focus on a minimal working prototype, not a full production app

Main workflow:
- Department Office staff logs in
- Searches a resident by name or ID
- Sees only limited RBI-based resident info and a 3-status result:
  - Green = Cleared
  - Yellow = For Review
  - Red = Refer to Lupon
- If Green, clearance may proceed outside the system
- If Yellow or Red, resident is verbally referred to Lupon

Roles:
- Admin: manage users and roles
- Department Office Staff: search residents, view limited status only
- Lupon Staff: encode full RBI, edit resident info, update status, add remarks, upload/view resident documents

Important privacy rule:
- Department Office must NOT see case reasons, internal remarks, or confidential Lupon details
- Lupon Staff can see and edit full internal records

Your task:
Build a minimal working prototype for tomorrow’s class demo with these screens and working logic only:
1. Login screen
2. Department Dashboard with resident search
3. Resident Verification screen
4. Lupon Dashboard
5. Resident Record Form (basic working version)
6. Simple Admin screen placeholder if time allows

Functional requirements for this prototype:
- Use mock resident data in a local JS/TS file
- Implement resident search by name or ID
- Implement status decision rendering:
  - Green -> “Proceed with clearance”
  - Yellow -> “Refer to Lupon office”
  - Red -> “Refer to Lupon office”
- Implement role-based UI behavior:
  - Department Office can search/view only
  - Lupon can edit resident record, status, remarks, and documents section
- Implement a basic resident form with grouped sections:
  - Personal Information
  - Address & Contact
  - Additional Information
  - Sector Classification
  - System Fields (status, remarks)

Coding requirements:
- Keep code simple, readable, and modular
- Create reusable components where practical
- Keep styles consistent with a formal orange-accent government UI
- Do not overengineer
- Do not add chat, notifications, or real backend integration
- Prefer a clean file structure

Testing requirements:
Create unit tests for the core logic modules only:
- searchResident(query, residents)
- getStatusAction(status)
- canEditRecord(role)
- validateResidentForm(data)

Expected outputs:
1. A short implementation plan first
2. Then the code changes
3. Then the exact commands to run the app and tests
4. Then a short summary of what was completed and what remains mocked

Before writing code:
- First inspect the repository and identify the best existing files to reuse
- Then propose a brief plan
- Then implement only the smallest working version that satisfies the above