import React, { useState, useRef, useEffect } from "react";

type LogLevel = "info" | "success" | "warning" | "error" | "command" | "dim";

interface LogEntry {
  id: number;
  level: LogLevel;
  text: string;
  time: string;
}

const TAB_LOGS: Record<string, LogEntry[]> = {
  Build: [
    { id: 1, level: "command", text: "webpack --mode production", time: "02:04:11" },
    { id: 2, level: "dim", text: "  > compiling extension (node target)...", time: "02:04:11" },
    { id: 3, level: "dim", text: "  > compiling webview (web target)...", time: "02:04:12" },
    { id: 4, level: "dim", text: "  > running ts-loader on 22 files...", time: "02:04:14" },
    { id: 5, level: "success", text: "✔ extension compiled successfully in 4141ms", time: "02:04:15" },
    { id: 6, level: "success", text: "✔ webview compiled successfully in 7772ms", time: "02:04:19" },
    { id: 7, level: "info", text: "  asset extension.js    3.74 KiB [minimized]", time: "02:04:19" },
    { id: 8, level: "info", text: "  asset webview.js    159 KiB [minimized]", time: "02:04:19" },
    { id: 9, level: "info", text: "  asset webview.css   26.8 KiB", time: "02:04:19" },
    { id: 10, level: "success", text: "✔ Build complete. 0 errors, 0 warnings.", time: "02:04:19" },
  ],
  Sync: [
    { id: 1, level: "command", text: "git fetch origin", time: "02:01:03" },
    { id: 2, level: "info", text: "  From https://github.com/n4bi10p/copilot-colab", time: "02:01:04" },
    { id: 3, level: "info", text: "  * [new branch]  feat/backend-firestore -> origin/feat/backend-firestore", time: "02:01:04" },
    { id: 4, level: "command", text: "git rebase origin/main", time: "02:01:05" },
    { id: 5, level: "success", text: "✔ Current branch feat/frontend-ui is up to date.", time: "02:01:05" },
    { id: 6, level: "command", text: "git push -u origin feat/frontend-ui", time: "02:04:22" },
    { id: 7, level: "dim", text: "  Counting objects: 32, done.", time: "02:04:22" },
    { id: 8, level: "dim", text: "  Compressing objects: 100% (28/28), done.", time: "02:04:23" },
    { id: 9, level: "success", text: "✔ Branch feat/frontend-ui pushed to origin.", time: "02:04:24" },
  ],
  "Agent Logs": [
    { id: 1, level: "info", text: "[AGENT] Orchestrator initialized. Model: GPT-4", time: "02:00:00" },
    { id: 2, level: "info", text: "[AGENT] Scanning workspace for conflicts...", time: "02:00:01" },
    { id: 3, level: "dim", text: "  > Parsing AST for src/api/payments/...", time: "02:00:02" },
    { id: 4, level: "dim", text: "  > Checking merge base with origin/main...", time: "02:00:03" },
    { id: 5, level: "warning", text: "⚠ Conflict detected in payment-api.ts (lines 142–167)", time: "02:00:04" },
    { id: 6, level: "info", text: "[AGENT] Conflict report generated. Notifying team...", time: "02:00:04" },
    { id: 7, level: "warning", text: "⚠ 'TransactionType' is deprecated. Suggest migration.", time: "02:00:05" },
    { id: 8, level: "success", text: "✔ No circular dependencies found.", time: "02:00:06" },
    { id: 9, level: "info", text: "[AGENT] Presence sync: 3 users online.", time: "02:00:10" },
    { id: 10, level: "info", text: "[AGENT] Listening for Firestore updates on demo-project...", time: "02:00:11" },
  ],
};

const LINE_COLORS: Record<LogLevel, string> = {
  command: "text-cyan-400",
  success: "text-emerald-400",
  warning: "text-yellow-400",
  error: "text-red-400",
  info: "text-text-muted",
  dim: "text-text-dim",
};

const TerminalView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>("Build");
  const [filter, setFilter] = useState("");
  const [liveLines, setLiveLines] = useState<LogEntry[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(100);

  const tabs = Object.keys(TAB_LOGS);

  const baseLines = TAB_LOGS[activeTab] ?? [];
  const allLines = [...baseLines, ...liveLines];
  const filtered = allLines.filter((l) =>
    filter ? l.text.toLowerCase().includes(filter.toLowerCase()) : true
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filtered.length, activeTab]);

  const handleClear = () => setLiveLines([]);

  const appendLine = (text: string, level: LogLevel = "command") => {
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLiveLines((prev) => [...prev, { id: nextId.current++, level, text, time: now }]);
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
          </div>
        </div>

        {/* Terminal output */}
        <div className="flex-1 overflow-y-auto p-6 font-mono text-[12px] leading-relaxed">
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
            { label: "Firestore Sync", status: "CONNECTED", color: "text-emerald-400" },
            { label: "AI Orchestrator", status: "ONLINE", color: "text-emerald-400" },
            { label: "Presence", status: "3 ONLINE", color: "text-blue-400" },
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
