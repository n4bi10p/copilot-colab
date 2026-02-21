
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "../../state/store";
import AuthWidget from "./AuthWidget";
import AICommandPanel from './AICommandPanel';
import { backendClient } from "../utils/backendClient";
import type { AgentMessage, TerminalLine } from "../../types/index";

const AgentPanel: React.FC = () => {
  // Chat state
  const agentMessages = useStore((s) => s.agentMessages);
  const addAgentMessage = useStore((s) => s.addAgentMessage);
  const unreadCount = useStore((s) => s.unreadCount);
  const setUnreadCount = useStore((s) => s.setUnreadCount);
  const [inputValue, setInputValue] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const project = useStore((s) => s.project);
  const currentUser = useStore((s) => s.currentUser);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const isScrollLockedRef = useRef(true);
  const prevMessageCountRef = useRef(0);

  // Scroll lock detection
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    isScrollLockedRef.current = atBottom;
    if (atBottom) setUnreadCount(0);
  }, [setUnreadCount]);

  // Auto-scroll on new messages if locked to bottom
  useEffect(() => {
    const count = agentMessages.length;
    if (count > prevMessageCountRef.current) {
      if (isScrollLockedRef.current) {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      } else {
        // Not at bottom — increment unread
        const newMessages = count - prevMessageCountRef.current;
        setUnreadCount(unreadCount + newMessages);
      }
    }
    prevMessageCountRef.current = count;
  }, [agentMessages.length, setUnreadCount]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadCount(0);
    isScrollLockedRef.current = true;
  }, [setUnreadCount]);

  // Send message with optimistic update
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;
    setInputValue("");
    setSendError(null);
    setSending(true);
    const tempId = `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimisticMsg: AgentMessage = {
      id: tempId,
      role: "user",
      content: text,
      timestamp: Date.now(),
    };
    addAgentMessage(optimisticMsg);
    isScrollLockedRef.current = true;
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    // If @gemini is present, call Gemini
    if (text.includes("@gemini")) {
      try {
        // Compose prompt for Gemini (strip @gemini for clarity)
        const prompt = text.replace(/@gemini/gi, "").trim() || "How can I help?";
        const response = await backendClient.suggestFromSelection<{ content: string }>({ prompt });
        addAgentMessage({
          id: `agent-gemini-${Date.now()}`,
          role: "agent",
          content: response.content || "(No response from Gemini)",
          timestamp: Date.now(),
        });
      } catch (err: any) {
        setSendError(err?.message || "Failed to get Gemini response.");
        addAgentMessage({
          id: `agent-gemini-err-${Date.now()}`,
          role: "agent",
          content: "Sorry, Gemini could not process your request.",
          timestamp: Date.now(),
        });
      } finally {
        setSending(false);
      }
      return;
    }

    // Default: Simulate agent response
    setTimeout(() => {
      addAgentMessage({
        id: `agent-${Date.now()}`,
        role: "agent",
        content: `Echo: ${text}`,
        timestamp: Date.now(),
      });
      setSending(false);
    }, 800);
  }, [inputValue, addAgentMessage]);

  // Handle agent action chips
  const handleActionClick = useCallback((action: string) => {
    addAgentMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: `[${action}]`,
      timestamp: Date.now(),
    });
    setTimeout(() => {
      addAgentMessage({
        id: `agent-${Date.now()}`,
        role: "agent",
        content:
          action === "Run Analysis"
            ? "Running predictive analysis on affected lines in payment-api.ts...\n\nFound 3 conflicting sections. Generating diff..."
            : action === "Diff Check"
            ? "Fetching latest diff from origin/main. Comparing 142 lines..."
            : "Conflict warning dismissed. I'll re-check on next sync.",
        timestamp: Date.now(),
      });
    }, 800);
  }, [addAgentMessage]);

  // Terminal lines mock
  const TERMINAL_LINES: TerminalLine[] = [
    { type: "command", text: "scanning dependency tree..." },
    { type: "output", text: "  > analyzing src/api/payments/..." },
    { type: "output", text: "  > parsing AST..." },
    { type: "success", text: "✔ No circular refs found." },
    { type: "command", text: "checking typings..." },
    { type: "warning", text: "⚠ Warning: 'TransactionType' is deprecated." },
    { type: "cursor", text: "" },
  ];

  // Unread marker component
  const UnreadMarker: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => (
    <button
      onClick={onClick}
      className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-primary text-white text-xs font-mono rounded-full shadow-lg shadow-black/40 flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
    >
      <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
      {count} new message{count !== 1 ? "s" : ""}
    </button>
  );

  return (
    <aside className="flex h-full min-h-0 flex-col bg-[#111113] border-l border-border-dark overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border-dark shrink-0">
        <h2 className="text-sm font-mono tracking-editorial text-text-muted uppercase">
          Team Chat
        </h2>
        <div className="flex items-center gap-2">
          <span className="size-2 bg-emerald-500 rounded-full" />
          <span className="text-xs font-mono text-text-dim">LIVE</span>
        </div>
      </div>

      {/* Scrollable content stack */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-4 py-3"
      >
        <AuthWidget />
        <div className="my-3">
          <AICommandPanel />
        </div>

        {/* Chat + Actions */}
        <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">
          {agentMessages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-3">
              <div className="flex gap-4">
                {msg.role === "agent" ? (
                  <div className="size-8 rounded bg-surface-dark border border-white/10 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
                  </div>
                ) : (
                  <div className="size-8 rounded bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-primary text-sm">person</span>
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  {msg.content.split("\n\n").map((para, i) => (
                    <p key={i} className="text-sm text-text-main leading-relaxed">
                      {para.includes("payment-api.ts") ? (
                        <>
                          {para.split("payment-api.ts")[0]}
                          <span className="font-mono text-accent-warm bg-accent-warm/10 px-1 py-0.5 rounded-sm">
                            payment-api.ts
                          </span>
                          {para.split("payment-api.ts")[1]}
                        </>
                      ) : (
                        para
                      )}
                    </p>
                  ))}
                </div>
              </div>

              {/* Action chips (only for agent messages with actions) */}
              {msg.role === "agent" && msg.actions && msg.actions.length > 0 && (
                <div className="flex flex-wrap gap-2 pl-12">
                  {msg.actions.map((action) => (
                    <button
                      key={action}
                      onClick={() => handleActionClick(action)}
                      className="px-3 py-1.5 rounded-sm border border-[#3F3F46] text-[#A1A1AA] text-xs font-mono hover:border-white/30 hover:text-white transition-all bg-transparent"
                    >
                      [{action}]
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="w-full h-px bg-border-dark my-2" />

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
        </div>
      </div>

      {/* Unread marker */}
      {unreadCount > 0 && <UnreadMarker count={unreadCount} onClick={scrollToBottom} />}

      {/* Send error */}
      {sendError && (
        <div className="px-4 py-2 bg-red-500/10 border-t border-red-500/20">
          <p className="text-[11px] font-mono text-red-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">error</span>
            {sendError}
          </p>
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-border-dark shrink-0">
        <div className="flex gap-2">
            <input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !sending) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Message your team... (@gemini for AI)"
              className="flex-1 bg-surface-dark border border-white/10 rounded-sm px-3 py-2 text-xs font-mono text-text-main placeholder-text-dim outline-none focus:border-primary/50"
              disabled={sending}
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || sending}
              className="px-3 py-2 bg-primary/20 border border-primary/30 rounded-sm text-primary hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="material-symbols-outlined animate-spin text-[16px]">autorenew</span>
              ) : (
                <span className="material-symbols-outlined text-[16px]">send</span>
              )}
            </button>
        </div>
        <p className="text-[9px] text-text-dim mt-1.5 font-mono">
          Use <span className="text-indigo-400">@gemini</span> to get AI assistance in chat
        </p>
      </div>
    </aside>
  );
};

export default AgentPanel;
