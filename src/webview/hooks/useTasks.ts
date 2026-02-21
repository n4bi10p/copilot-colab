import { useEffect } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useStore } from "../../state/store";
import type { Task, TaskStatus } from "../../types";

const PROJECT_ID = "demo-project";

// ── Subscribe to real-time task changes ───────────────────────────────────────
export function useTasksListener(): void {
  const { setTasks, addTask, updateTask } = useStore();

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Initial fetch
    supabase
      .from("tasks")
      .select("*")
      .eq("project_id", PROJECT_ID)
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        if (data) setTasks(data as Task[]);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`tasks:project:${PROJECT_ID}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter: `project_id=eq.${PROJECT_ID}`,
        } as any,
        (payload: any) => {
          if (payload.eventType === "INSERT") {
            addTask(payload.new as Task);
          } else if (payload.eventType === "UPDATE") {
            updateTask(payload.new.id, payload.new as Partial<Task>);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

// ── Create a new task ─────────────────────────────────────────────────────────
export async function createTask(title: string, status: TaskStatus = "backlog"): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("tasks").insert({
    project_id: PROJECT_ID,
    title,
    status,
  });
  if (error) console.error("[CoLab] createTask error:", error.message);
}

// ── Update task status ────────────────────────────────────────────────────────
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) console.error("[CoLab] updateTaskStatus error:", error.message);
}
