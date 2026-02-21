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
    photoURL: (raw.user_metadata?.avatar_url as string) ?? undefined,
  };
}

interface AuthGateProps {
  /** Show a "session expired" prompt instead of the default heading */
  sessionExpired?: boolean;
}

const AuthGate: React.FC<AuthGateProps> = ({ sessionExpired = false }) => {
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const setSessionExpired = useStore((s) => s.setSessionExpired);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">(sessionExpired ? "signin" : "signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [oauthLoading, setOauthLoading] = useState<"github" | "google" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    // Basic validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") {
        await backendClient.signInWithPassword(email.trim(), password);
      } else {
        await backendClient.signUpWithPassword(email.trim(), password);
      }
      const raw = await backendClient.getUser<RawUser>();
      const user = mapUser(raw);
      if (!user) throw new Error("Authentication succeeded but user data is missing.");
      setCurrentUser(user);
      setSessionExpired(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Auth failed";
      // Categorize errors for user-friendly messages
      if (/invalid.*credentials|invalid.*password|invalid.*email/i.test(msg)) {
        setError("Invalid email or password. Please try again.");
      } else if (/rate.limit|too.many/i.test(msg)) {
        setError("Too many attempts. Please wait a moment and try again.");
      } else if (/network|fetch|timeout/i.test(msg)) {
        setError("Network error. Check your connection and try again.");
      } else if (/already.*registered|already.*exists/i.test(msg)) {
        setError("This email is already registered. Try signing in instead.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "github" | "google") => {
    setOauthLoading(provider);
    setError(null);
    try {
      const rawUser = await backendClient.signInWithOAuth<RawUser>(provider);
      const user = mapUser(rawUser);
      if (!user) throw new Error(`${provider} sign-in succeeded but user data is missing.`);
      setCurrentUser(user);
      setSessionExpired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : `${provider} sign-in failed`);
    } finally {
      setOauthLoading(null);
    }
  };

  const headingText = sessionExpired
    ? "Session expired"
    : mode === "signin"
      ? "Sign in to continue"
      : "Create an account";

  const subtitleText = sessionExpired
    ? "Your session has ended. Sign in again to continue."
    : mode === "signin"
      ? "Access your team workspace."
      : "Join your team workspace.";

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
          <h1 className="text-base font-semibold text-white mb-1">{headingText}</h1>
          <p className="text-sm text-text-muted mb-7">{subtitleText}</p>

          {/* Email / password form */}
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

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* OAuth entry points */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => handleOAuth("github")}
              disabled={loading || oauthLoading !== null}
              className="w-full h-10 bg-white/5 border border-white/10 text-text-main text-sm font-mono rounded-sm flex items-center justify-center gap-2 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {oauthLoading === "github" ? (
                <span className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.341-3.369-1.341-.454-1.155-1.11-1.463-1.11-1.463-.908-.62.069-.607.069-.607 1.004.07 1.532 1.032 1.532 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.983 1.029-2.682-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.591 1.028 2.682 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.163 22 16.418 22 12c0-5.523-4.477-10-10-10z"/></svg>
              )}
              Continue with GitHub
            </button>
            <button
              disabled
              className="w-full h-10 bg-white/5 border border-white/10 text-text-muted text-sm font-mono rounded-sm flex items-center justify-center gap-2 opacity-50 cursor-not-allowed"
              title="Google OAuth — coming soon"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
              <span className="text-[9px] text-text-dim ml-auto">soon</span>
            </button>
          </div>

          {error && (
            <p className="mt-4 text-xs text-red-400 font-mono text-center">{error}</p>
          )}
        </div>

        {/* Toggle mode */}
        {!sessionExpired && (
          <p className="mt-5 text-center text-xs text-text-dim">
            {mode === "signin" ? "No account?" : "Already have an account?"}{" "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
              className="text-primary hover:underline"
            >
              {mode === "signin" ? "Sign up" : "Sign in"}
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthGate;
