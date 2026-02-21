# 2-User Collaboration Test Checklist

## Permissions
- [ ] Owner can create project
- [ ] Owner can invite member
- [ ] Member can access project after invite
- [ ] Owner can remove member
- [ ] Member loses access after removal

## Member Invite/Remove
- [ ] Owner invites member (User B) to project
- [ ] Member (User B) accepts invite and joins
- [ ] Owner removes member (User B)
- [ ] Member (User B) cannot access project after removal

## Realtime Sync
- [ ] Task board updates in real time for both users
- [ ] Chat messages sync instantly between users
- [ ] Presence (online/idle) updates for both users

## Dashboard Aggregation
- [ ] Task counts by status update in real time
- [ ] Online users list updates correctly
- [ ] Recent messages list updates correctly

## Steps
1. Start Supabase backend and extension in two VS Code windows (User A and User B)
2. User A creates project, invites User B
3. User B joins, both interact with tasks/chat/presence
4. User A removes User B, verify access revoked
5. Check dashboard for correct aggregation and sync
