import { useEffect } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useStore } from "../../state/store";
import type { Message } from "../../types";

const PROJECT_ID = "demo-project";

// ── Subscribe to real-time messages ──────────────────────────────────────────
export function useMessagesListener(): void {
  const { setMessages, addMessage } = useStore();

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Initial fetch (last 50 messages)
    supabase
      .from("messages")
      .select("*")
      .eq("project_id", PROJECT_ID)
      .order("created_at", { ascending: true })
      .limit(50)
      .then(({ data }) => {
        if (data) setMessages(data as Message[]);
      });

    // Realtime subscription
    const channel = supabase
      .channel(`messages:project:${PROJECT_ID}`)
      .on(
        "postgres_changes" as any,
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `project_id=eq.${PROJECT_ID}`,
        } as any,
        (payload: any) => {
          addMessage(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

// ── Send a message ────────────────────────────────────────────────────────────
export async function sendMessage(text: string, authorId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from("messages").insert({
    project_id: PROJECT_ID,
    text,
    author_id: authorId,
  });
  if (error) console.error("[CoLab] sendMessage error:", error.message);
}
