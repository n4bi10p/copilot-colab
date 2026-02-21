import { useEffect } from "react";
import { useStore } from "../../state/store";
import { onAuthStateChange, getCurrentUser } from "../lib/auth";

// Initialise auth state and keep Zustand in sync with Supabase session
export function useAuth(): void {
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const setAuthReady = useStore((s) => s.setAuthReady);

  useEffect(() => {
    // Check existing session on mount, then mark auth as ready
    getCurrentUser().then((user) => {
      setCurrentUser(user);
      setAuthReady(true);
    });

    // Subscribe to auth changes
    const unsubscribe = onAuthStateChange(setCurrentUser);
    return unsubscribe;
  }, []);
}
