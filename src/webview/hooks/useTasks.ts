import { useEffect, useRef } from "react";
import { useStore } from "../../state/store";
import { backendClient } from "../utils/backendClient";
import type { Task, TaskStatus } from "../../types";

const POLL_INTERVAL_MS = 5_000;

// Subscribe to tasks for the current project — polls every 5 s
export function useTasksListener(): void {
  const setTasks = useStore((s) => s.setTasks);
  const setTasksLoading = useStore((s) => s.setTasksLoading);
  const project = useStore((s) => s.project);
  const user = useStore((s) => s.currentUser);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!project?.id || !user) return;
    const projectId = project.id;

    // Treat every new project/user combination as a fresh first fetch
    setTasksLoading(true);

    const fetchTasks = () => {
      backendClient
        .listTasks<Task[]>(projectId)
        .then((raw) => setTasks(Array.isArray(raw) ? raw : []))
        .catch(() => { /* offline/preview mode – keep current tasks */ });
    };

    fetchTasks();
    timerRef.current = setInterval(fetchTasks, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [project?.id, user?.uid]);
}

/** Create a task – caller should do optimistic add before calling this */
export async function createTask(projectId: string, title: string, assigneeId?: string | null): Promise<void> {
  await backendClient.createTask(projectId, title, assigneeId);
}

/** Update task status */
export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  await backendClient.updateTaskStatus(id, status);
}

/** Update task assignee */
export async function updateTaskAssignee(id: string, assigneeId: string | null): Promise<void> {
  await backendClient.updateTaskAssignee(id, assigneeId);
}


