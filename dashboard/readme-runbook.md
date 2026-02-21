# README Runbook (Bhumi)

## Local Setup
- Clone repo
- Run `npm install`
- Run `npm run build`
- Start Supabase: `supabase start`
- Seed data: `psql < dashboard/seed-demo.sql`
- Launch extension: F5 in VS Code

## Hosted Setup
- Deploy Supabase project
- Update .env with hosted Supabase URL/keys
- Seed data as above
- Launch extension in VS Code

## Test Commands
- Run all checklists in dashboard/
- Use regression-checklist.md for each PR

## Known Limitations
- Demo users must exist in Supabase Auth
- Some features require real project_id and user IDs
- AI feature may require API key/config
