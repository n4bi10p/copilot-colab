# Copilot CoLab QA Matrix Checklist

## Auth Flows
- [ ] User can sign up
- [ ] User can sign in
- [ ] Session is persisted and expires correctly
- [ ] Auth-required actions are guarded

## Owner/Member Permissions
- [ ] Owner can invite member
- [ ] Owner can remove member
- [ ] Member can view project
- [ ] Member cannot remove other members

## Tasks CRUD
- [ ] Create task
- [ ] Update task (status, title, assignee)
- [ ] Move task between columns
- [ ] Delete task
- [ ] Task changes are reflected in real-time

## Chat Send/List
- [ ] Send message
- [ ] List messages
- [ ] Messages update in real-time
- [ ] Message author and timestamp are correct

## Presence Updates
- [ ] Presence indicator updates on user activity
- [ ] Online/idle status is correct
- [ ] Presence updates are reflected in real-time

## Realtime Sync Across 2 Users
- [ ] Task changes sync between users
- [ ] Chat messages sync between users
- [ ] Presence status sync between users
- [ ] No race conditions or duplication

---
For each item, check with automated tests and manual validation as needed.
