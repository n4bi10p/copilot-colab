import React, { useState } from "react";
import { backendClient } from "../utils/backendClient";

export default function AICommandPanel() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) {
      setError("Input required.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const rawResponse = await backendClient.generateWbs({
        projectId: "demo-project-id",
        goal: input,
        persist: true,
      });
      const res = rawResponse as { notes?: string; generated?: unknown[] };
      setResponse(
        res.notes ??
          (res.generated
            ? JSON.stringify(res.generated, null, 2)
            : "No tasks generated.")
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI command failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-4">
      <h2 className="text-xs font-mono tracking-editorial text-text-muted uppercase mb-3">
        AI Command
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Describe your goal…"
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-xs font-mono text-text-main placeholder-text-dim outline-none focus:border-primary/50"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full h-8 bg-primary/20 border border-primary/30 text-primary text-xs font-mono rounded-sm hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="size-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              Generate
            </>
          )}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-[11px] font-mono text-red-400">{error}</p>
      )}

      {response && (
        <div className="mt-3 bg-white/[0.03] border border-white/5 rounded-sm p-3">
          <p className="text-[10px] font-mono text-text-dim uppercase mb-2">Response</p>
          <pre className="text-xs font-mono text-text-muted whitespace-pre-wrap leading-relaxed">
            {response}
          </pre>
        </div>
      )}
    </div>
  );
}
