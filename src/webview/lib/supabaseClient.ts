import { createClient, SupabaseClient } from "@supabase/supabase-js";

// In VS Code webview env vars are injected via webpack DefinePlugin at build time.
// Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file.
declare const __SUPABASE_URL__: string;
declare const __SUPABASE_ANON_KEY__: string;

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;

  const url = typeof __SUPABASE_URL__ !== "undefined" ? __SUPABASE_URL__ : "";
  const key =
    typeof __SUPABASE_ANON_KEY__ !== "undefined" ? __SUPABASE_ANON_KEY__ : "";

  if (!url || !key) {
    console.warn(
      "[CoLab] Supabase URL/Key not configured. Running in offline demo mode."
    );
  }

  _client = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return _client;
}
