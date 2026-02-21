import React, { useState, useRef, useEffect, useCallback } from "react";
import { useStore } from "../../state/store";
import type { Message } from "../../types";
import { backendClient } from "../utils/backendClient";
import AuthWidget from "./AuthWidget";
import AICommandPanel from './AICommandPanel';

// ── Message Bubble ───────────────────────────────────────────────────────────
const MessageBubble: React.FC<{
  msg: Message;
  isOwn: boolean;
  onRetry?: () => void;
}> = ({ msg, isOwn, onRetry }) => {
  const isGemini = msg.sender_kind === "assistant" && msg.sender_label === "gemini";
  const isFailed = msg._status === "failed";
  const isSending = msg._status === "sending";

  return (
    <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
      {/* Avatar */}
      {isGemini ? (
        <div className="size-7 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0" title="Gemini">
          <span className="material-symbols-outlined text-indigo-400 text-[14px]">auto_awesome</span>
        </div>
      ) : isOwn ? (
        <div className="size-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-[14px]">person</span>
        </div>
      ) : (
        <div className="size-7 rounded-full bg-surface-dark border border-white/10 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-text-muted text-[14px]">person</span>
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[85%] ${isOwn ? "items-end" : ""}`}>
        {/* Label */}
        {isGemini && (
          <span className="text-[10px] font-mono text-indigo-400 flex items-center gap-1">
            <span className="material-symbols-outlined text-[10px]">auto_awesome</span>
            gemini
          </span>
        )}

        {/* Bubble */}
        <div
          className={`px-3 py-2 rounded-lg text-sm leading-relaxed whitespace-pre-wrap break-words ${
            isFailed
              ? "bg-red-500/10 border border-red-500/30 text-red-300"
              : isOwn
                ? "bg-primary/15 border border-primary/20 text-text-main"
                : isGemini
                  ? "bg-indigo-500/10 border border-indigo-500/20 text-text-main"
                  : "bg-surface-dark border border-white/5 text-text-main"
          } ${isSending ? "opacity-60" : ""}`}
        >
          {msg.text}
        </div>

        {/* Meta row */}
        <div className={`flex items-center gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
          <span className="text-[9px] font-mono text-text-dim">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {isSending && (
            <span className="size-3 border border-white/20 border-t-primary rounded-full animate-spin" />
          )}
          {isFailed && onRetry && (
            <button
              onClick={onRetry}
              className="text-[10px] font-mono text-red-400 hover:text-red-300 flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[12px]">refresh</span>
              Retry
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Unread Marker ────────────────────────────────────────────────────────────
const UnreadMarker: React.FC<{ count: number; onClick: () => void }> = ({ count, onClick }) => (
  <button
    onClick={onClick}
    className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-primary text-white text-xs font-mono rounded-full shadow-lg shadow-black/40 flex items-center gap-1.5 hover:bg-primary/90 transition-colors"
  >
    <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
    {count} new message{count !== 1 ? "s" : ""}
  </button>
);

const AgentPanel: React.FC = () => {
  const messages = useStore((s) => s.messages);
  const currentUser = useStore((s) => s.currentUser);
  const project = useStore((s) => s.project);
  const addMessage = useStore((s) => s.addMessage);
  const updateMessage = useStore((s) => s.updateMessage);
  const removeMessage = useStore((s) => s.removeMessage);
  const unreadCount = useStore((s) => s.unreadCount);
  const setUnreadCount = useStore((s) => s.setUnreadCount);

  const [inputValue, setInputValue] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
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
    const count = messages.length;
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
  }, [messages.length, setUnreadCount]);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setUnreadCount(0);
    isScrollLockedRef.current = true;
  }, [setUnreadCount]);

  // Send message with optimistic update
  const handleSend = useCallback(async (retryText?: string) => {
    const text = retryText ?? inputValue.trim();
    if (!text || !project?.id || !currentUser?.uid) return;
    if (!retryText) setInputValue("");
    setSendError(null);

    const tempId = `pending-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const optimisticMsg: Message = {
      id: tempId,
      project_id: project.id,
      text,
      author_id: currentUser.uid,
      sender_kind: "user",
      created_at: new Date().toISOString(),
      _status: "sending",
    };

    addMessage(optimisticMsg);
    // Ensure we scroll to the new message
    isScrollLockedRef.current = true;
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      await backendClient.sendMessage(project.id, text, currentUser.uid);
      // Remove optimistic — real message arrives via polling
      removeMessage(tempId);
    } catch (err) {
      updateMessage(tempId, { _status: "failed" });
      setSendError(err instanceof Error ? err.message : "Failed to send message");
    }
  }, [inputValue, project?.id, currentUser?.uid, addMessage, removeMessage, updateMessage]);

  const handleRetry = useCallback((text: string, failedId: string) => {
    removeMessage(failedId);
    handleSend(text);
  }, [removeMessage, handleSend]);

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

        {/* Messages */}
        <div className="flex flex-col gap-3 mt-2">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <span className="material-symbols-outlined text-[32px] text-text-dim mb-2 block">chat</span>
              <p className="text-xs text-text-dim font-mono">No messages yet</p>
              <p className="text-[10px] text-text-dim mt-1">
                Type a message below. Mention <span className="text-indigo-400">@gemini</span> for AI help.
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                isOwn={msg.author_id === currentUser?.uid}
                onRetry={msg._status === "failed" ? () => handleRetry(msg.text, msg.id) : undefined}
              />
            ))
          )}
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
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message your team... (@gemini for AI)"
            className="flex-1 bg-surface-dark border border-white/10 rounded-sm px-3 py-2 text-xs font-mono text-text-main placeholder-text-dim outline-none focus:border-primary/50"
          />
          <button
            onClick={() => handleSend()}
            disabled={!inputValue.trim()}
            className="px-3 py-2 bg-primary/20 border border-primary/30 rounded-sm text-primary hover:bg-primary/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined text-[16px]">send</span>
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
