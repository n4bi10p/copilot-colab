# Copilot CoLab Reset & Seed Procedure

## Local Reset & Seed

1. Ensure PostgreSQL and `psql` are installed and available in PATH.
2. Set up `.env` with valid `SUPABASE_URL` and `SUPABASE_KEY`.
3. Run the seed script:
   ```sh
   npm run seed
   ```
   - This executes `dashboard/seed-demo.sql` to reset and seed demo data.
4. Confirm seed by running backend and frontend tests:
   ```sh
   npm test
   npm run test:frontend
   ```

## Hosted Reset & Seed

1. Log in to Supabase dashboard.
2. Open SQL editor and run contents of `dashboard/seed-demo.sql`.
3. Verify demo project, users, tasks, messages, and presence are seeded.
4. Update hosted environment variables as needed.

## Troubleshooting
- If `psql` is not found, install PostgreSQL and add to PATH.
- If seed fails, check `.env` values and database connection.
- For hosted setup, ensure correct schema and RLS policies are applied.

---
For full reproducibility, always reset and seed before running tests or demos.
