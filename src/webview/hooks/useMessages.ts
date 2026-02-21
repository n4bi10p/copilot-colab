import { useEffect, useRef } from "react";
import { useStore } from "../../state/store";
import { backendClient } from "../utils/backendClient";
import type { Message, ProjectMember } from "../../types";

const POLL_INTERVAL_MS = 5_000;

// Subscribe to messages for the current project — polls every 5 s
export function useMessagesListener(): void {
  const setMessages = useStore((s) => s.setMessages);
  const setMessagesLoading = useStore((s) => s.setMessagesLoading);
  const setMembers = useStore((s) => s.setMembers);
  const project = useStore((s) => s.project);
  const user = useStore((s) => s.currentUser);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!project?.id || !user) return;
    const projectId = project.id;

    setMessagesLoading(true);

    // Load members once per project
    backendClient
      .listMembers<ProjectMember[]>(projectId)
      .then((raw) => {
        if (Array.isArray(raw)) setMembers(raw);
      })
      .catch(() => { /* offline – skip */ });

    const fetchMessages = () => {
      backendClient
        .listMessages<Message[]>(projectId)
        .then((raw) => setMessages(Array.isArray(raw) ? raw : []))
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
  await backendClient.sendMessage(projectId, text, authorId);
}
