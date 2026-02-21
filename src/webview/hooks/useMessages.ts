import { useEffect, useRef } from "react";
import { useStore } from "../../state/store";
import { backendClient, BACKEND_COMMANDS } from "../utils/backendClient";
import type { Message } from "../../types";

const POLL_INTERVAL_MS = 5_000;

// Subscribe to messages for the current project — polls every 5 s
export function useMessagesListener(): void {
  const setMessages = useStore((s) => s.setMessages);
  const project = useStore((s) => s.project);
  const user = useStore((s) => s.currentUser);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!project?.id || !user) return;
    const projectId = project.id;

    const fetchMessages = () => {
      backendClient
        .execute<Message[]>(BACKEND_COMMANDS.listMessages, { projectId })
        .then((msgs) => setMessages(msgs ?? []))
        .catch(() => { /* offline/preview mode */ });
    };

    fetchMessages();
    timerRef.current = setInterval(fetchMessages, POLL_INTERVAL_MS);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [project?.id, user?.uid]);
}

export async function sendMessage(projectId: string, text: string, authorId: string): Promise<void> {
  await backendClient.execute(BACKEND_COMMANDS.sendMessage, { projectId, text, authorId });
}
