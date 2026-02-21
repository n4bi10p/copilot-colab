# Copilot CoLab README Runbook

## Local Setup

1. Clone the repository:
   ```sh
   git clone <repo-url>
   cd <repo-folder>
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up environment variables:
   - Create a `.env` file with:
     ```
     SUPABASE_URL=https://your-project.supabase.co
     SUPABASE_KEY=your-service-role-key
     ```
4. Seed demo data (requires PostgreSQL/psql):
   ```sh
   npm run seed
   ```
5. Start the extension in VS Code:
   - Press `F5` or run `npm run dev` (if available).

## Hosted Setup

1. Deploy backend to Supabase:
   - Import schema from `schema.md`.
   - Set up RLS policies and RPCs as described.
2. Configure hosted environment variables:
   - Set `SUPABASE_URL` and `SUPABASE_KEY` in your hosting platform.
3. Deploy extension/webview frontend as per VS Code extension guidelines.

## Test Commands

- Backend tests:
  ```sh
  npm test
  ```
- Frontend (UI) tests:
  ```sh
  npm run test:frontend
  ```
- Seed/reset database:
  ```sh
  npm run seed
  ```
- Type checking:
  ```sh
  npm run typecheck
  npm run typecheck:all
  ```

## Known Limitations

- Requires PostgreSQL and `psql` for local seeding.
- .env file must be correctly set for Supabase access.
- Realtime sync and AI features depend on correct backend setup and API keys.
- Playwright tests require browsers installed via `npx playwright install`.
- Hosted setup assumes Supabase and extension hosting are properly configured.
- If demo fails (realtime/AI): fallback steps are documented in plan.md.

---
For full troubleshooting, see plan.md and QA checklist.
