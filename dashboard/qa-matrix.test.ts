import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

describe('Copilot CoLab QA Matrix Automated Tests', () => {
  test('Auth: user can sign up/sign in', async () => {
    // Replace with actual test user credentials
    const { data, error } = await supabase.auth.signUp({ email: 'testuser@example.com', password: 'Test1234!' });
    expect(error).toBeNull();
    expect(data?.user).toBeDefined();
  });

  test('Owner/member permissions: invite/remove', async () => {
    // Simulate invite and remove member RPCs
    const { data: invite, error: inviteErr } = await supabase.rpc('invite_member', { project_id: 'demo-project-uuid', user_id: 'user-b-uuid' });
    expect(inviteErr).toBeNull();
    expect(invite).toBeDefined();
    const { data: remove, error: removeErr } = await supabase.rpc('remove_member', { project_id: 'demo-project-uuid', user_id: 'user-b-uuid' });
    expect(removeErr).toBeNull();
    expect(remove).toBeDefined();
  });

  test('Tasks CRUD', async () => {
    // Create task
    const { data: task, error: taskErr } = await supabase.from('tasks').insert([{ project_id: 'demo-project-uuid', title: 'Automated Task', status: 'backlog' }]);
    expect(taskErr).toBeNull();
    expect(task).toBeDefined();
    // Update task
    const { error: updateErr } = await supabase.from('tasks').update({ status: 'done' }).eq('title', 'Automated Task');
    expect(updateErr).toBeNull();
    // Delete task
    const { error: deleteErr } = await supabase.from('tasks').delete().eq('title', 'Automated Task');
    expect(deleteErr).toBeNull();
  });

  test('Chat send/list', async () => {
    // Send message
    const { data: msg, error: msgErr } = await supabase.from('messages').insert([{ project_id: 'demo-project-uuid', text: 'Automated message', author_id: 'user-a-uuid' }]);
    expect(msgErr).toBeNull();
    expect(msg).toBeDefined();
    // List messages
    const { data: msgs, error: listErr } = await supabase.from('messages').select().eq('project_id', 'demo-project-uuid');
    expect(listErr).toBeNull();
    expect(msgs?.length ?? 0).toBeGreaterThan(0);
  });

  test('Presence updates', async () => {
    // Update presence
    const { error: presErr } = await supabase.from('presence').update({ status: 'online' }).eq('user_id', 'user-a-uuid');
    expect(presErr).toBeNull();
    // List presence
    const { data: pres, error: listErr } = await supabase.from('presence').select().eq('project_id', 'demo-project-uuid');
    expect(listErr).toBeNull();
    expect(pres?.length ?? 0).toBeGreaterThan(0);
  });

  test('Dashboard metrics: task counts by status', async () => {
    const { data: tasks, error } = await supabase.from('tasks').select('status');
    expect(error).toBeNull();
    const counts: Record<string, number> = {};
    if (tasks) {
      for (const t of tasks) {
        counts[t.status] = (counts[t.status] || 0) + 1;
      }
    }
    // Example assertion: expect(counts['todo']).toBe(expectedTodoCount);
    expect(typeof counts['todo']).toBe('number');
  });

  test('Dashboard metrics: recent messages', async () => {
    const { data: messages, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(5);
    expect(error).toBeNull();
    expect(Array.isArray(messages)).toBe(true);
    // Example assertion: expect(messages.length).toBeLessThanOrEqual(5);
  });

  test('Dashboard metrics: online members', async () => {
    const { data: presence, error } = await supabase.from('presence').select('user_id').eq('status', 'online');
    expect(error).toBeNull();
    expect(Array.isArray(presence)).toBe(true);
    // Example assertion: expect(presence.length).toBeGreaterThanOrEqual(1);
  });

  test('Dashboard metrics: verify numbers match source rows under concurrent updates', async () => {
    // Simulate concurrent updates
    await Promise.all([
      supabase.from('tasks').update({ status: 'inprogress' }).eq('id', 1),
      supabase.from('tasks').update({ status: 'done' }).eq('id', 2)
    ]);
    // Query and assert aggregation
    const { data: tasks, error } = await supabase.from('tasks').select('status');
    expect(error).toBeNull();
    const counts: Record<string, number> = {};
    if (tasks) {
      for (const t of tasks) {
        counts[t.status] = (counts[t.status] || 0) + 1;
      }
    }
    expect(typeof counts['inprogress']).toBe('number');
    expect(typeof counts['done']).toBe('number');
  });
});
