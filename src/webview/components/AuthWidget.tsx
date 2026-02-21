import React, { useEffect, useState } from "react";
import { backendClient } from "../utils/backendClient";

type BasicUser = {
  id: string;
  email?: string;
} | null;

const AuthWidget: React.FC = () => {
  const [user, setUser] = useState<BasicUser>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      setLoading(true);
      setError(null);
      const currentUser = await backendClient.getUser<BasicUser>();
      setUser(currentUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const signIn = async () => {
    try {
      setLoading(true);
      setError(null);
      await backendClient.signInWithPassword(email.trim(), password);
      setPassword("");
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const signUp = async () => {
    try {
      setLoading(true);
      setError(null);
      await backendClient.signUpWithPassword(email.trim(), password);
      setPassword("");
      await refreshUser();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await backendClient.signOut();
      setUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-4 rounded-sm border border-white/10 bg-surface-dark p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-widest text-text-dim">Auth</span>
        {loading && <span className="text-[10px] font-mono text-text-dim">Loading...</span>}
      </div>

      {user ? (
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-text-main">{user.email ?? user.id}</span>
          <button
            onClick={signOut}
            disabled={loading}
            className="rounded-sm border border-white/15 px-2 py-1 text-[10px] font-mono text-text-muted hover:text-white"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email"
            className="rounded-sm border border-white/10 bg-[#111113] px-2 py-1.5 text-xs text-text-main outline-none focus:border-primary/50"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="password"
            className="rounded-sm border border-white/10 bg-[#111113] px-2 py-1.5 text-xs text-text-main outline-none focus:border-primary/50"
          />
          <div className="flex gap-2">
            <button
              onClick={signIn}
              disabled={loading || !email.trim() || !password}
              className="rounded-sm border border-primary/30 bg-primary/20 px-2 py-1 text-[10px] font-mono text-primary disabled:opacity-40"
            >
              Sign In
            </button>
            <button
              onClick={signUp}
              disabled={loading || !email.trim() || !password}
              className="rounded-sm border border-white/15 px-2 py-1 text-[10px] font-mono text-text-muted hover:text-white disabled:opacity-40"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-[10px] font-mono text-red-400">{error}</p>}
    </div>
  );
};

export default AuthWidget;
