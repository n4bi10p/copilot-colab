
import React, { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "../../state/store";
import AuthWidget from "./AuthWidget";
import AICommandPanel from './AICommandPanel';
import { backendClient } from "../utils/backendClient";
import type { AgentMessage } from "../../types/index";

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

    // Default: send to AI assistant
    try {
      const result = await backendClient.suggestFromSelection<{ content: string }>({ prompt: text });
      addAgentMessage({
        id: `agent-${Date.now()}`,
        role: "agent",
        content: result.content || "(No response from AI)",
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setSendError(err?.message || "Failed to get AI response.");
      addAgentMessage({
        id: `agent-err-${Date.now()}`,
        role: "agent",
        content: "Sorry, the AI could not process your request.",
        timestamp: Date.now(),
      });
    } finally {
      setSending(false);
    }
  }, [inputValue, addAgentMessage]);

  // Handle agent action chips — call AI with context
  const handleActionClick = useCallback(async (action: string) => {
    addAgentMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: `[${action}]`,
      timestamp: Date.now(),
    });
    try {
      const result = await backendClient.suggestFromSelection<{ content: string }>({
        prompt: action,
      });
      addAgentMessage({
        id: `agent-${Date.now()}`,
        role: "agent",
        content: result.content || "(No response)",
        timestamp: Date.now(),
      });
    } catch (err: any) {
      addAgentMessage({
        id: `agent-err-${Date.now()}`,
        role: "agent",
        content: `Error: ${err?.message ?? "AI request failed"}`,
        timestamp: Date.now(),
      });
    }
  }, [addAgentMessage]);

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
                      {para}
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

          <div ref={bottomRef} />
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
