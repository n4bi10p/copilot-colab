# Copilot CoLab Regression Checklist (per PR)

## General
- [ ] All tests pass (backend, frontend)
- [ ] No new lint/type errors
- [ ] No breaking changes to schema or API

## Auth & Permissions
- [ ] Auth flows (sign up/in/out) still work
- [ ] Owner/member permissions unchanged

## Tasks
- [ ] Task CRUD works as expected
- [ ] Task board updates in real-time

## Chat
- [ ] Chat send/list works
- [ ] Chat updates in real-time

## Presence
- [ ] Presence indicator updates correctly
- [ ] Presence sync works for all users

## Dashboard Metrics
- [ ] Task counts, messages, online members are correct
- [ ] Metrics match source rows after concurrent updates

## Demo & Docs
- [ ] Demo script and backup steps updated if needed
- [ ] README/runbook updated if needed

---
Attach this checklist to every PR for systematic regression validation.
