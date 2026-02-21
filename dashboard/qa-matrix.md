# QA Matrix for Copilot CoLab (Bhumi)

## Auth Flows
- [ ] User can sign up/sign in via Supabase Auth (Google/GitHub/Email)
- [ ] Session persists and expires correctly
- [ ] Unauthenticated users are blocked from protected actions

## Owner/Member Permissions
- [ ] Owner can create project, invite/remove members
- [ ] Member can access project after invite
- [ ] Member loses access after removal
- [ ] Only owner can delete project

## Tasks CRUD
- [ ] Create, update, delete tasks as owner/member
- [ ] Task status changes reflect in dashboard
- [ ] RLS prevents unauthorized task changes

## Chat Send/List
- [ ] Send message as owner/member
- [ ] Messages appear in real time for both users
- [ ] RLS prevents unauthorized message actions

## Presence Updates
- [ ] Presence (online/idle) updates on user activity
- [ ] Presence list updates in dashboard

## Realtime Sync (2 users)
- [ ] Task, chat, and presence updates sync instantly
- [ ] Dashboard metrics update in real time

## Regression Checklist (for each PR)
- [ ] All above flows tested
- [ ] No regression in dashboard metrics
- [ ] No regression in permissions or RLS
