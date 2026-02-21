import { useEffect } from "react";
import { useStore } from "../../state/store";
import { backendClient } from "../utils/backendClient";
import type { User } from "../../types";

type RawUser = { id: string; email?: string; user_metadata?: Record<string, unknown> } | null;

function mapUser(raw: RawUser): User | null {
  if (!raw) return null;
  return {
    uid: raw.id,
    email: raw.email ?? "",
    displayName:
      (raw.user_metadata?.full_name as string) ??
      (raw.user_metadata?.user_name as string) ??
      raw.email ??
      raw.id,
    photoURL: (raw.user_metadata?.avatar_url as string) ?? undefined,
  };
}

// Initialise auth state via extension backend bridge
export function useAuth(): void {
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const setAuthReady = useStore((s) => s.setAuthReady);

  useEffect(() => {
    backendClient
      .getUser<RawUser>()
      .then((raw) => {
        setCurrentUser(mapUser(raw));
      })
      .catch(() => {
        // Outside VS Code (browser preview) — skip auth gate
        setCurrentUser({ uid: "preview", displayName: "Preview User", email: "preview@local" });
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, []);
}
