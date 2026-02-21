import { useEffect, useRef, useCallback } from "react";
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

const SESSION_CHECK_INTERVAL_MS = 60_000; // re-validate session every 60s

/**
 * Initialise auth state via extension backend bridge.
 * - Restores persisted session on startup (Supabase SecretStorage)
 * - Periodically re-validates the session to detect expiry
 * - Sets sessionExpired flag when the session is lost mid-use
 */
export function useAuth(): void {
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const setAuthReady = useStore((s) => s.setAuthReady);
  const setSessionExpired = useStore((s) => s.setSessionExpired);
  const currentUser = useStore((s) => s.currentUser);
  const initialisedRef = useRef(false);

  // Restore session on mount
  useEffect(() => {
    if (initialisedRef.current) return;
    initialisedRef.current = true;

    backendClient
      .getUser<RawUser>()
      .then((raw) => {
        setCurrentUser(mapUser(raw)); // null if no session — shows AuthGate
      })
      .catch(() => {
        // Backend bridge not available (e.g. outside VS Code) — stay signed out
        setCurrentUser(null);
      })
      .finally(() => {
        setAuthReady(true);
      });
  }, [setCurrentUser, setAuthReady]);

  // Periodic session health-check (only while signed in)
  const checkSession = useCallback(async () => {
    if (!currentUser) return;
    try {
      const raw = await backendClient.getUser<RawUser>();
      if (!raw) {
        // Session expired server-side
        setCurrentUser(null);
        setSessionExpired(true);
      }
    } catch {
      // Can't reach backend — don't sign out, just skip
    }
  }, [currentUser, setCurrentUser, setSessionExpired]);

  useEffect(() => {
    if (!currentUser) return;
    const id = setInterval(checkSession, SESSION_CHECK_INTERVAL_MS);
    return () => clearInterval(id);
  }, [currentUser, checkSession]);
}
