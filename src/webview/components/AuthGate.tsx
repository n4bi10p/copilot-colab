import React, { useState } from "react";
import { signInWithGoogle, signInWithGitHub } from "../lib/auth";

// ── AuthGate ─────────────────────────────────────────────────────────────────
// Shown when no user is signed in. Provides Google + GitHub OAuth buttons.
const AuthGate: React.FC = () => {
  const [loading, setLoading] = useState<"google" | "github" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading("google");
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    }
    setLoading(null);
  };

  const handleGitHub = async () => {
    setLoading("github");
    setError(null);
    try {
      await signInWithGitHub();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Sign-in failed");
    }
    setLoading(null);
  };

  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
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
          <h1 className="text-base font-semibold text-white mb-1">Sign in to continue</h1>
          <p className="text-sm text-text-muted mb-8">
            Access your team workspace and collaborative tools.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3">
            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-sm font-medium text-text-main transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "google" ? (
                <span className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="size-4 shrink-0" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              Continue with Google
            </button>

            {/* GitHub */}
            <button
              onClick={handleGitHub}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-sm text-sm font-medium text-text-main transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === "github" ? (
                <span className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="size-4 shrink-0 fill-current text-white" viewBox="0 0 24 24">
                  <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                </svg>
              )}
              Continue with GitHub
            </button>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-5 text-xs text-red-400 text-center font-mono">{error}</p>
          )}
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-text-dim">
          By signing in you agree to the workspace terms.
        </p>
      </div>
    </div>
  );
};

export default AuthGate;
