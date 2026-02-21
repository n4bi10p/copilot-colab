import { getSupabaseClient } from "./supabaseClient";
import type { User } from "../../types";

export async function signInWithGoogle(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { skipBrowserRedirect: false },
  });
  if (error) throw new Error(error.message);
}

export async function signInWithGitHub(): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: { skipBrowserRedirect: false },
  });
  if (error) throw new Error(error.message);
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.auth.signOut();
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  return {
    uid: data.user.id,
    displayName:
      data.user.user_metadata?.full_name ??
      data.user.user_metadata?.user_name ??
      data.user.email ??
      "Unknown",
    email: data.user.email ?? "",
    photoURL:
      data.user.user_metadata?.avatar_url ??
      data.user.user_metadata?.picture,
  };
}

export function onAuthStateChange(
  callback: (user: User | null) => void
): () => void {
  const supabase = getSupabaseClient();
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (!session?.user) {
      callback(null);
      return;
    }
    callback({
      uid: session.user.id,
      displayName:
        session.user.user_metadata?.full_name ??
        session.user.user_metadata?.user_name ??
        session.user.email ??
        "Unknown",
      email: session.user.email ?? "",
      photoURL:
        session.user.user_metadata?.avatar_url ??
        session.user.user_metadata?.picture,
    });
  });

  return () => subscription.unsubscribe();
}
