import { useEffect, useRef } from "react";
import { useStore } from "../../state/store";
import { backendClient, BACKEND_COMMANDS } from "../utils/backendClient";
import type { PresenceStatus } from "../../types";

const HEARTBEAT_MS = 30_000;
const IDLE_MS = 60_000;

// Upserts own presence with a heartbeat every 30 s and idle detection
export function useOwnPresence(userId: string | undefined): void {
  const project = useStore((s) => s.project);
  const statusRef = useRef<PresenceStatus>("online");
  const lastActivityRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!userId || !project?.id) return;
    const projectId = project.id;

    const updateActivity = () => { lastActivityRef.current = Date.now(); };
    window.addEventListener("mousemove", updateActivity);
    window.addEventListener("keydown", updateActivity);

    const heartbeat = () => {
      const isIdle = Date.now() - lastActivityRef.current > IDLE_MS;
      statusRef.current = isIdle ? "idle" : "online";
      backendClient
        .execute(BACKEND_COMMANDS.upsertPresence, {
          userId,
          projectId,
          status: statusRef.current,
        })
        .catch(() => { /* offline mode */ });
    };

    heartbeat();
    const timer = setInterval(heartbeat, HEARTBEAT_MS);

    return () => {
      clearInterval(timer);
      window.removeEventListener("mousemove", updateActivity);
      window.removeEventListener("keydown", updateActivity);
    };
  }, [userId, project?.id]);
}

// Kick off the extension-side realtime subscription for the project
export function usePresenceListener(): void {
  const project = useStore((s) => s.project);
  const user = useStore((s) => s.currentUser);

  useEffect(() => {
    if (!project?.id || !user) return;
    backendClient
      .execute(BACKEND_COMMANDS.subscribeProject, { projectId: project.id })
      .catch(() => { /* offline mode */ });

    return () => {
      backendClient
        .execute(BACKEND_COMMANDS.unsubscribeProject, { projectId: project?.id })
        .catch(() => {});
    };
  }, [project?.id, user?.uid]);
}
