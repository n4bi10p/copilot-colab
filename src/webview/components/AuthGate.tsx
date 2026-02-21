import React, { useState } from "react";
import { backendClient } from "../utils/backendClient";
import { useStore } from "../../state/store";
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
  };
}

const AuthGate: React.FC = () => {
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") {
        await backendClient.signInWithPassword(email.trim(), password);
      } else {
        await backendClient.signUpWithPassword(email.trim(), password);
      }
      const raw = await backendClient.getUser<RawUser>();
      setCurrentUser(mapUser(raw));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="size-9 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
          </div>
          <span className="font-mono text-lg text-white tracking-tight">
            Copilot<span className="text-primary">CoLab</span>
          </span>
        </div>

        {/* Card */}
        <div className="bg-[#18181B] border border-white/8 rounded-sm p-8">
          <h1 className="text-base font-semibold text-white mb-1">
            {mode === "signin" ? "Sign in to continue" : "Create an account"}
          </h1>
          <p className="text-sm text-text-muted mb-7">
            {mode === "signin" ? "Access your team workspace." : "Join your team workspace."}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary/50 font-mono placeholder:text-text-dim"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary/50 font-mono placeholder:text-text-dim"
            />

            <button
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <span className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span className="material-symbols-outlined text-[16px]">
                    {mode === "signin" ? "login" : "person_add"}
                  </span>
                  {mode === "signin" ? "Sign In" : "Sign Up"}
                </>
              )}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-xs text-red-400 font-mono text-center">{error}</p>
          )}
        </div>

        {/* Toggle mode */}
        <p className="mt-5 text-center text-xs text-text-dim">
          {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
            className="text-primary hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthGate;
