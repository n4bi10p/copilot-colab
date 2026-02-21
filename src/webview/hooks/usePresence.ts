import { useEffect } from "react";
import { getSupabaseClient } from "../lib/supabaseClient";
import { useStore } from "../../state/store";
import type { Presence } from "../../types";

const PROJECT_ID = "demo-project";

// ── Subscribe to presence changes ────────────────────────────────────────────
export function usePresenceListener(): void {
  const { setPresence } = useStore();

  useEffect(() => {
    const supabase = getSupabaseClient();

    // Initial fetch
    supabase
      .from("presence")
      .select("*")
      .eq("project_id", PROJECT_ID)
      .then(({ data }) => {
        if (data) {
          (data as Presence[]).forEach((p) => setPresence(p.user_id, p));
        }
      });

    // Realtime subscription
    const channel = supabase
      .channel(`presence:project:${PROJECT_ID}`)
      .on(
        "postgres_changes" as any,
        {
          event: "*",
          schema: "public",
          table: "presence",
          filter: `project_id=eq.${PROJECT_ID}`,
        } as any,
        (payload: any) => {
          const presence = payload.new as Presence;
          setPresence(presence.user_id, presence);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

// ── Upsert own presence ───────────────────────────────────────────────────────
export async function upsertPresence(
  userId: string,
  status: "online" | "idle"
): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from("presence").upsert(
    {
      user_id: userId,
      project_id: PROJECT_ID,
      status,
      last_active_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );
}

// ── Hook: manage own presence with idle detection ─────────────────────────────
export function useOwnPresence(userId: string | undefined): void {
  useEffect(() => {
    if (!userId) return;

    upsertPresence(userId, "online");

    let idleTimer: ReturnType<typeof setTimeout>;

    const resetTimer = () => {
      clearTimeout(idleTimer);
      upsertPresence(userId, "online");
      idleTimer = setTimeout(() => upsertPresence(userId, "idle"), 60_000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);

    resetTimer();

    return () => {
      clearTimeout(idleTimer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
    };
  }, [userId]);
}
