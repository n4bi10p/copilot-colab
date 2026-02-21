# Dashboard Aggregation Checks

## Task Counts by Status
- [ ] Verify task counts for each status (backlog, in_progress, done) match actual tasks in DB
- [ ] Changing a task’s status updates the count in real time

## Online Users
- [ ] Online users list matches presence table for current project
- [ ] User going idle/online updates dashboard immediately

## Recent Messages
- [ ] Recent messages list matches latest messages in messages table
- [ ] Sending a new message updates dashboard in real time

## Steps
1. Open dashboard panel as both users
2. Perform task, chat, and presence actions
3. Observe dashboard updates and verify with DB records
