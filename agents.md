Add a new business logic function without modifying existing code.

Function name: canProceedWithClearance(status)

Behavior:
- return true if status is "green"
- return false for "yellow", "red", or invalid values

Create:
1. src/lib/canProceedWithClearance.js
2. src/lib/canProceedWithClearance.test.js

Test requirements:
- include happy path and edge cases
- use Vitest
- do not modify any existing files

Constraints:
- do not refactor existing code
- do not change UI
- minimal implementation only

Output:
- test file first
- then implementation