# Copilot CoLab Dashboard Metric Validation (Automated)

## Metrics Covered
- Task counts by status (todo, in_progress, done)
- Recent messages (last 5)
- Online members (presence)

## Automation

### Backend (Jest)
- See `dashboard/qa-matrix.test.ts` for automated tests:
  - Queries database for task counts, messages, presence
  - Simulates concurrent updates and checks aggregation

### Frontend (Playwright)
- See `dashboard/tests/dashboard-metrics.spec.ts` for UI tests:
  - Navigates dashboard, validates metrics against backend
  - Simulates user actions and checks real-time updates

## How to Run
- Backend:
  ```sh
  npm test
  ```
- Frontend:
  ```sh
  npm run test:frontend
  ```

## Troubleshooting
- Ensure seed/reset is run before tests
- Check .env for correct Supabase credentials
- For frontend, ensure Playwright browsers are installed (`npx playwright install`)

---
Metrics validation is fully automated for both backend and frontend. See test files for details.

# Copilot CoLab Concurrent Update Validation

## Goal
Ensure dashboard metrics (task counts, messages, online members) always match source rows in the database, even under concurrent updates.

## Automated Tests
- Backend: `dashboard/qa-matrix.test.ts`
  - Simulates concurrent task updates (multiple users changing status)
  - Checks aggregation after updates
- Frontend: `dashboard/tests/dashboard-metrics.spec.ts`
  - Simulates user actions in parallel (move tasks, send messages, toggle presence)
  - Validates UI reflects correct numbers

## Manual Steps (if needed)
1. Open dashboard as two users
2. Perform simultaneous actions (move tasks, send messages, toggle presence)
3. Check dashboard metrics and database records

## Troubleshooting
- If numbers mismatch, check for race conditions or sync issues
- Review logs and test output for errors

---
Concurrent update validation is covered by automated tests and manual steps for full reliability.
