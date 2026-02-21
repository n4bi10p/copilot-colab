# Multi-User Sync Testing Checklist

1. Start Supabase backend and VS Code extension.
2. Sign in as User A and User B (different browsers or VS Code instances).
3. User A creates a project and adds User B as a member.
4. Both users open the project dashboard.
5. User A creates tasks; User B updates task status.
6. Both users send messages in chat panel.
7. Verify real-time updates for tasks, messages, and presence.
8. User B goes idle; check presence indicator.
9. User A removes User B from project; verify access is revoked.
10. Confirm all actions are logged and visible in dashboard.
