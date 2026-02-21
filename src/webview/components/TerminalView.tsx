import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../../state/store";
import { backendClient } from "../utils/backendClient";

type LogLevel = "info" | "success" | "warning" | "error" | "command" | "dim";

interface LogEntry {
  id: number;
  level: LogLevel;
  text: string;
  time: string;
}

const TABS = ["Backend", "Realtime", "Agent Logs"] as const;
type TabName = typeof TABS[number];

const LINE_COLORS: Record<LogLevel, string> = {
  command: "text-cyan-400",
  success: "text-emerald-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  info: "text-text-muted",
  dim: "text-text-dim",
};

const TerminalView: React.FC = () => {
  const members = useStore((s) => s.members);
  const project = useStore((s) => s.project);
  const [activeTab, setActiveTab] = useState<string>("Backend");
  const [filter, setFilter] = useState("");
  const [tabLines, setTabLines] = useState<Record<string, LogEntry[]>>({});
  const [loading, setLoading] = useState(false);
  const [liveLines, setLiveLines] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(100);

  const now = () =>
    new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const makeEntry = (text: string, level: LogLevel, id?: number): LogEntry => ({
    id: id ?? nextId.current++,
    level,
    text,
    time: now(),
  });

  // Load real data per tab from backend commands
  useEffect(() => {
    if (tabLines[activeTab]) return; // already loaded
    setLoading(true);

    const load = async () => {
      const entries: LogEntry[] = [];
      try {
        if (activeTab === "Backend") {
          entries.push(makeEntry("copilotColab.backend.smokeTest", "command"));
          const result = await backendClient.execute<Record<string, unknown>>(
            "copilotColab.backend.smokeTest", {}
          );
          for (const [key, val] of Object.entries(result ?? {})) {
            const ok = val === true || (typeof val === "object" && (val as any)?.ok);
            entries.push(makeEntry(`  ${key}: ${JSON.stringify(val)}`, ok ? "success" : "warning"));
          }
          entries.push(makeEntry("✔ Backend smoke test complete.", "success"));
        } else if (activeTab === "Realtime") {
          entries.push(makeEntry("copilotColab.realtime.health", "command"));
          const result = await backendClient.execute<Record<string, unknown>>(
            "copilotColab.realtime.health", {}
          );
          for (const [key, val] of Object.entries(result ?? {})) {
            entries.push(makeEntry(`  ${key}: ${JSON.stringify(val)}`, "info"));
          }
          entries.push(makeEntry("✔ Realtime health check complete.", "success"));
        } else if (activeTab === "Agent Logs") {
          entries.push(makeEntry("copilotColab.demo.healthcheck", "command"));
          const result = await backendClient.execute<{ checks?: Record<string, unknown> }>(
            "copilotColab.demo.healthcheck", { projectId: project?.id }
          );
          const checks = result?.checks ?? (result as any) ?? {};
          for (const [key, val] of Object.entries(checks)) {
            const ok = val === true || (typeof val === "object" && (val as any)?.ok);
            entries.push(makeEntry(`  [${key}] ${JSON.stringify(val)}`, ok ? "success" : "warning"));
          }
          entries.push(makeEntry("✔ Demo healthcheck complete.", "success"));
        }
      } catch (err: any) {
        entries.push(makeEntry(`✘ ${err?.message ?? "Command failed"}`, "error"));
      }
      setTabLines((prev) => ({ ...prev, [activeTab]: entries }));
      setLoading(false);
    };

    void load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const tabs = [...TABS];

  const baseLines = tabLines[activeTab] ?? [];
  const allLines = [...baseLines, ...liveLines];
  const filtered = allLines.filter((l) =>
    filter ? l.text.toLowerCase().includes(filter.toLowerCase()) : true
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered.length, activeTab, loading]);

  const handleClear = () => {
    setLiveLines([]);
    setTabLines((prev) => ({ ...prev, [activeTab]: [] }));
  };

  const appendLine = (text: string, level: LogLevel = "command") => {
    setLiveLines((prev) => [...prev, { id: nextId.current++, level, text, time: now() }]);
  };

  return (
    <div className="flex flex-1 overflow-hidden bg-[#0c0c0e]">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center h-12 border-b border-border-dark px-4 gap-1 shrink-0 bg-[#111113]">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setLiveLines([]); }}
              className={`px-4 py-1.5 rounded-sm text-xs font-mono transition-colors
                ${activeTab === tab
                  ? "bg-surface-dark text-white border border-white/10"
                  : "text-text-dim hover:text-text-muted"}`}
            >
              {tab}
              {tab === "Agent Logs" && (
                <span className="ml-2 size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
              )}
              {loading && activeTab === tab && (
                <span className="ml-2 size-1.5 rounded-full bg-yellow-400 inline-block animate-pulse" />
              )}
            </button>
          ))}

          {/* Filter */}
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-2 bg-surface-dark border border-white/5 rounded-sm px-3 py-1.5">
              <span className="material-symbols-outlined text-[14px] text-text-dim">filter_list</span>
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filter logs..."
                className="w-36 bg-transparent text-[11px] font-mono text-text-main placeholder-text-dim outline-none"
              />
            </div>
            <button
              onClick={handleClear}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-mono text-text-dim hover:text-white transition-colors border border-transparent hover:border-white/10 rounded-sm"
            >
              <span className="material-symbols-outlined text-[14px]">delete_sweep</span>
              Clear
            </button>
            <button
              onClick={() => setTabLines((prev) => ({ ...prev, [activeTab]: [] }))}
              className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-mono text-text-dim hover:text-white transition-colors border border-transparent hover:border-white/10 rounded-sm"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Reload
            </button>
          </div>
        </div>

        {/* Terminal output */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-[12px] leading-relaxed">
          {loading && (
            <div className="flex items-center gap-2 px-2 py-1 text-text-dim">
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
              Loading from backend...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <p className="text-text-dim px-2 py-1">No output yet. Run a command or switch tabs.</p>
          )}
          {filtered.map((line) => (
            <div key={line.id} className="flex items-start gap-4 group hover:bg-white/[0.02] px-2 py-0.5 rounded-sm">
              <span className="text-text-dim shrink-0 select-none">{line.time}</span>
              <p className={LINE_COLORS[line.level]}>
                {line.level === "command" && (
                  <>
                    <span className="text-blue-500">➜ </span>
                    <span className="text-cyan-500">~ </span>
                  </>
                )}
                {line.text}
              </p>
            </div>
          ))}

          {/* Live cursor */}
          <div className="flex items-center gap-4 px-2 py-0.5 mt-1">
            <span className="text-text-dim shrink-0">
              {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-blue-500">➜ </span>
              <span className="text-cyan-500">~ </span>
              <span className="w-2 h-4 bg-text-muted animate-pulse" />
            </div>
          </div>
          <div ref={bottomRef} />
        </div>

        {/* Quick command input */}
        <div className="p-4 border-t border-border-dark bg-[#111113] shrink-0">
          <QuickInput onRun={appendLine} />
        </div>
      </div>

      {/* Right status panel */}
      <aside className="w-64 shrink-0 border-l border-border-dark bg-[#111113] flex flex-col p-5 overflow-y-auto">
        <h3 className="text-xs font-mono tracking-editorial text-text-dim uppercase mb-6">Status</h3>

        <div className="flex flex-col gap-4 mb-8">
          {[
            { label: "Extension Host", status: "RUNNING", color: "text-emerald-400" },
            { label: "Webpack Watch", status: "IDLE", color: "text-text-muted" },
            { label: "Supabase Sync", status: "CONNECTED", color: "text-emerald-400" },
            { label: "AI Orchestrator", status: "ONLINE", color: "text-emerald-400" },
            { label: "Presence", status: `${members.length || 0} ONLINE`, color: "text-blue-400" },
          ].map(({ label, status, color }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-xs font-mono text-text-muted">{label}</span>
              <span className={`text-[10px] font-mono ${color}`}>{status}</span>
            </div>
          ))}
        </div>

        <div className="border-t border-border-dark pt-5">
          <h3 className="text-xs font-mono tracking-editorial text-text-dim uppercase mb-4">Quick Actions</h3>
          <div className="flex flex-col gap-2">
            {[
              { icon: "build", label: "Run Build", cmd: "npm run build", level: "command" as LogLevel },
              { icon: "sync", label: "Git Fetch", cmd: "git fetch origin", level: "command" as LogLevel },
              { icon: "bug_report", label: "Run Tests", cmd: "npm test", level: "command" as LogLevel },
              { icon: "cleaning_services", label: "Clean Dist", cmd: "rm -rf dist/", level: "warning" as LogLevel },
            ].map(({ icon, label, cmd, level }) => (
              <button
                key={label}
                onClick={() => { appendLine(cmd, level); }}
                className="flex items-center gap-3 px-3 py-2.5 bg-surface-dark border border-white/5 rounded-sm text-xs font-mono text-text-muted hover:text-white hover:border-white/10 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[16px]">{icon}</span>
                {label}
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

// ── Quick Command Input ───────────────────────────────────────────────────────
const QuickInput: React.FC<{ onRun: (text: string, level: LogLevel) => void }> = ({ onRun }) => {
  const [cmd, setCmd] = useState("");

  const run = () => {
    if (!cmd.trim()) return;
    onRun(cmd.trim(), "command");
    onRun("Command queued for execution...", "dim");
    setCmd("");
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 flex-1 bg-[#0c0c0e] border border-white/5 rounded-sm px-4 py-2.5 focus-within:border-primary/30 transition-colors">
        <span className="text-blue-500 font-mono text-sm">➜</span>
        <span className="text-cyan-500 font-mono text-sm">~</span>
        <input
          value={cmd}
          onChange={(e) => setCmd(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Enter command..."
          className="flex-1 bg-transparent font-mono text-[12px] text-text-main placeholder-text-dim outline-none"
        />
      </div>
      <button
        onClick={run}
        disabled={!cmd.trim()}
        className="px-4 py-2.5 bg-surface-dark border border-white/10 rounded-sm text-xs font-mono text-text-muted hover:text-white hover:border-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Run
      </button>
    </div>
  );
};

export default TerminalView;
