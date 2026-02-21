import { useEffect, useRef } from "react";
import { useStore } from "../../state/store";
import { backendClient, BACKEND_COMMANDS } from "../utils/backendClient";
import type { Task, TaskStatus } from "../../types";

const POLL_INTERVAL_MS = 5_000;

// Subscribe to tasks for the current project — polls every 5 s
export function useTasksListener(): void {
  const setTasks = useStore((s) => s.setTasks);
  const project = useStore((s) => s.project);
  const user = useStore((s) => s.currentUser);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!project?.id || !user) return;
    const projectId = project.id;

    const fetchTasks = () => {
      backendClient
        .execute<Task[]>(BACKEND_COMMANDS.listTasks, { projectId })
        .then((tasks) => setTasks(tasks ?? []))
        .catch(() => { /* offline/preview mode */ });
    };

    fetchTasks();
    timerRef.current = setInterval(fetchTasks, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [project?.id, user?.uid]);
}

export async function createTask(projectId: string, title: string): Promise<void> {
  await backendClient.execute(BACKEND_COMMANDS.createTask, { projectId, title });
}

export async function updateTaskStatus(id: string, status: TaskStatus): Promise<void> {
  await backendClient.execute(BACKEND_COMMANDS.updateTaskStatus, { id, status });
}
