-- Seed/demo data for remote demo project/users

-- Create demo users (replace with actual Supabase Auth UIDs in real use)
-- insert into auth.users (id, email) values ('user-a-uuid', 'usera@example.com'), ('user-b-uuid', 'userb@example.com');

-- Create demo project
insert into public.projects (id, name, created_by)
values ('demo-project-uuid', 'Demo Project', 'user-a-uuid');

-- Add project members
insert into public.project_members (project_id, user_id, role)
values ('demo-project-uuid', 'user-a-uuid', 'owner'),
       ('demo-project-uuid', 'user-b-uuid', 'member');

-- Add tasks
insert into public.tasks (id, project_id, title, status, assignee_id)
values ('task-1-uuid', 'demo-project-uuid', 'Set up Supabase', 'done', 'user-a-uuid'),
       ('task-2-uuid', 'demo-project-uuid', 'Implement chat', 'in_progress', 'user-b-uuid'),
       ('task-3-uuid', 'demo-project-uuid', 'Test presence', 'backlog', null);

-- Add messages
insert into public.messages (id, project_id, text, author_id)
values ('msg-1-uuid', 'demo-project-uuid', 'Welcome to the project!', 'user-a-uuid'),
       ('msg-2-uuid', 'demo-project-uuid', 'Let’s get started!', 'user-b-uuid');

-- Add presence
insert into public.presence (user_id, project_id, status, last_active_at)
values ('user-a-uuid', 'demo-project-uuid', 'online', now()),
       ('user-b-uuid', 'demo-project-uuid', 'idle', now());
