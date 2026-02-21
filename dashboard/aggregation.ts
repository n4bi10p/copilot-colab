// Dashboard aggregation functions for Copilot CoLab
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function getTaskCounts(projectId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('status')
    .eq('project_id', projectId);
  if (error) throw error;
  const counts: Record<string, number> = {};
  data.forEach((task: { status: string }) => {
    counts[task.status] = (counts[task.status] || 0) + 1;
  });
  return counts;
}

export async function getRecentMessages(projectId: string, limit = 10) {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function getOnlineUsers(projectId: string) {
  const { data, error } = await supabase
    .from('presence')
    .select('user_id, status, last_active_at')
    .eq('project_id', projectId)
    .eq('status', 'online')
    .order('last_active_at', { ascending: false });
  if (error) throw error;
  return data;
}
