import React, { useState, useEffect } from "react";
import { useStore } from "../../state/store";
import { backendClient } from "../utils/backendClient";
import type { TerminalLine, Message } from "../../types";
import AuthWidget from "./AuthWidget";
import AICommandPanel from './AICommandPanel';


const TERMINAL_LINES: TerminalLine[] = [
  { type: "command", text: "scanning dependency tree..." },
  { type: "output", text: "  > analyzing src/api/payments/..." },
  { type: "output", text: "  > parsing AST..." },
  { type: "success", text: "✔ No circular refs found." },
  { type: "command", text: "checking typings..." },
  { type: "warning", text: "⚠ Warning: 'TransactionType' is deprecated." },
  { type: "cursor", text: "" },
];

const AgentPanel: React.FC = () => {
  const messages = useStore((s) => s.messages);
  const setMessages = useStore((s) => s.setMessages);
  const addMessage = useStore((s) => s.addMessage);
  const currentUser = useStore((s) => s.currentUser);
  const project = useStore((s) => s.project);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);

  const handleActionClick = (action: string) => {
    addMessage({
      id: `user-${Date.now()}`,
      text: `[${action}]`,
      author_id: currentUser?.uid || "user",
      project_id: project?.id || "",
      created_at: new Date().toISOString(),
    });

    // Simulate agent response
    setTimeout(() => {
      addMessage({
        id: `agent-${Date.now()}`,
        text:
          action === "Run Analysis"
            ? "Running predictive analysis on affected lines in payment-api.ts...\n\nFound 3 conflicting sections. Generating diff..."
            : action === "Diff Check"
            ? "Fetching latest diff from origin/main. Comparing 142 lines..."
            : "Conflict warning dismissed. I'll re-check on next sync.",
        author_id: "gemini",
        project_id: project?.id || "",
        created_at: new Date().toISOString(),
      });
    }, 800);
  };

  // Fetch messages from DB on mount
  useEffect(() => {
    async function fetchMessages() {
      if (!project?.id) return;
      try {
        const dbMessages = await backendClient.execute<Message[]>("copilotColab.messages.list", { projectId: project.id });
        setMessages(Array.isArray(dbMessages) ? dbMessages : []);
      } catch {
        // fallback: keep current messages
      }
    }
    fetchMessages();
  }, [project?.id, setMessages]);

  // Send message to backend and optimistically add
  const handleSend = async () => {
    if (!inputValue.trim() || !project?.id || !currentUser?.uid) return;
    setSending(true);
    const msg: Message = {
      id: `msg-${Date.now()}`,
      project_id: project.id,
      text: inputValue.trim(),
      author_id: currentUser.uid,
      created_at: new Date().toISOString(),
    };
    addMessage(msg);
    setInputValue("");
    try {
      await backendClient.execute("copilotColab.messages.send", msg);
    } catch {
      // Optionally show error or retry
    }
    setSending(false);
  };

  return (
    <aside className="flex flex-col bg-[#111113] border-l border-border-dark p-6 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-sm font-mono tracking-editorial text-text-muted uppercase">
          Orchestrator
        </h2>
        <div className="flex items-center gap-2">
          <span className="size-2 bg-emerald-500 rounded-full" />
          <span className="text-xs font-mono text-text-dim">ONLINE</span>
        </div>
      </div>

      <AuthWidget />
      {/* AI Command Panel */}
      <div className="my-6">
        <AICommandPanel />
      </div>



      {/* Terminal Output */}
      <div className="flex flex-col gap-2 bg-surface-dark border border-white/5 p-4 rounded-sm font-mono text-[11px] h-48 overflow-y-auto font-light shrink-0">
        <div className="flex justify-between text-text-dim border-b border-white/5 pb-2 mb-2">
          <span>TERMINAL OUTPUT</span>
          <span>bash</span>
        </div>
        {TERMINAL_LINES.map((line, i) => {
          if (line.type === "cursor") {
            return (
              <div key={i} className="flex items-center gap-1 mt-1">
                <span className="text-blue-500">➜</span>
                <span className="w-2 h-4 bg-text-muted animate-pulse" />
              </div>
            );
          }
          return (
            <p
              key={i}
              className={
                line.type === "command"
                  ? "text-text-muted"
                  : line.type === "success"
                  ? "text-emerald-500/80"
                  : line.type === "warning"
                  ? "text-yellow-500/80"
                  : line.type === "error"
                  ? "text-red-500/80"
                  : "text-text-dim"
              }
            >
              {line.type === "command" && (
                <>
                  <span className="text-blue-500">➜ </span>
                  <span className="text-cyan-500">~ </span>
                </>
              )}
              {line.text}
            </p>
          );
        })}
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-border-dark mt-2">
        <div className="flex gap-2 mb-4">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask the orchestrator..."
            className="flex-1 bg-surface-dark border border-white/10 rounded-sm px-3 py-2 text-xs font-mono text-text-main placeholder-text-dim outline-none focus:border-primary/50"
          />
          <button
            onClick={handleSend}
            className="px-3 py-2 bg-primary/20 border border-primary/30 rounded-sm text-primary hover:bg-primary/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
          </button>
        </div>

        {/* Deploy button */}
        <button className="w-full flex items-center justify-between p-4 bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors group">
          <span className="text-sm font-medium tracking-wide">DEPLOY TO STAGING</span>
          <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
            arrow_forward
          </span>
        </button>
        <div className="flex justify-between items-center mt-3 px-1">
          <span className="text-[10px] text-text-dim font-mono">Last build: 12m ago</span>
          <span className="text-[10px] text-text-dim font-mono">v2.4.1-rc</span>
        </div>
      </div>
    </aside>
  );
};

export default AgentPanel;
