
import React, { useState } from "react";
import { backendClient } from "../utils/backendClient";
import { useStore } from "../../state/store";
import type { Task } from "../../types";


export default function AICommandPanel() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [persist, setPersist] = useState(true);
  const addTask = useStore((s) => s.addTask);
  const project = useStore((s) => s.project);


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) {
      setError("Input required.");
      return;
    }
    setError("");
    setLoading(true);
    setResponse("");
    try {
      const rawResponse = await backendClient.generateWbs({
        projectId: project?.id || "demo-project-id",
        goal: input,
        persist,
      });
      const res = rawResponse as { notes?: string; generated?: any[] };
      // Optimistically insert generated tasks if persist is true and tasks are present
      if (persist && Array.isArray(res.generated) && project?.id) {
        res.generated.forEach((t, idx) => {
          // Map Gemini response to Task type (best effort)
          const task: Task = {
            id: t.id || `AI-${Date.now()}-${idx}`,
            project_id: project.id,
            title: t.title || (typeof t === "string" ? t : `AI Task ${idx + 1}`),
            status: t.status || "backlog",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Optionally map tags, priority, etc. if present
            ...(t.tags ? { tags: t.tags } : {}),
            ...(t.priority ? { priority: t.priority } : {}),
            ...(t.progress ? { progress: t.progress } : {}),
          };
          addTask(task);
        });
      }
      setResponse(
        res.notes ??
          (res.generated
            ? JSON.stringify(res.generated, null, 2)
            : "No tasks generated.")
      );
    } catch (err: any) {
      let msg = "AI command failed.";
      if (err && typeof err.message === "string") {
        if (err.message.includes("401") || err.message.toLowerCase().includes("key")) {
          msg = "Invalid Gemini API key. Please check your .env configuration.";
        } else if (err.message.toLowerCase().includes("rate limit")) {
          msg = "Gemini API rate limit or quota exceeded. Try again later.";
        } else if (err.message.toLowerCase().includes("timeout")) {
          msg = "Network timeout. Please check your connection or try again.";
        } else {
          msg = err.message;
        }
      }
      setError(msg);
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
        <label className="flex items-center gap-2 text-xs font-mono text-text-dim">
          <input
            type="checkbox"
            checked={persist}
            onChange={() => setPersist((v) => !v)}
            className="accent-primary"
          />
          Persist generated tasks to board
        </label>
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
