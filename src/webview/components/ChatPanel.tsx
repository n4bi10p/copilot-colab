import React, { useState, useEffect, useRef } from "react";
import { useStore } from "../../state/store";
import { backendClient } from "../utils/backendClient";
import type { Message } from "../../types";

const ChatPanel: React.FC = () => {
  const messages = useStore((s) => s.messages);
  const setMessages = useStore((s) => s.setMessages);
  const addMessage = useStore((s) => s.addMessage);
  const currentUser = useStore((s) => s.currentUser);
  const project = useStore((s) => s.project);
  const [inputValue, setInputValue] = useState("");
  const [sending, setSending] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

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
  // Handle mention autocomplete
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "@") {
      setShowMention(true);
      setMentionIndex(0);
    } else if (showMention && e.key === "Tab") {
      e.preventDefault();
      // Autocomplete to @gemini at cursor position
      const input = inputRef.current;
      if (input) {
        const cursorPos = input.selectionStart ?? inputValue.length;
        // Find the nearest @ before the cursor
        const beforeCursor = inputValue.slice(0, cursorPos);
        const atIdx = beforeCursor.lastIndexOf("@");
        if (atIdx !== -1) {
          const afterAt = beforeCursor.slice(atIdx + 1);
          // Only autocomplete if after @ is empty or only whitespace/word chars
          if (/^\w*$/.test(afterAt)) {
            const before = inputValue.slice(0, atIdx);
            const after = inputValue.slice(cursorPos);
            const newValue = before + "@gemini " + after;
            setInputValue(newValue);
            setShowMention(false);
            setMentionIndex(-1);
            // Move cursor to after @gemini 
            setTimeout(() => {
              const pos = before.length + 8;
              input.setSelectionRange(pos, pos);
              input.focus();
            }, 0);
            return;
          }
        }
      }
    } else if (e.key === "Escape") {
      setShowMention(false);
      setMentionIndex(-1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    // Show mention popup if user types '@' and not already showing
    if (e.target.value.endsWith("@")) {
      setShowMention(true);
      setMentionIndex(0);
    } else if (!e.target.value.includes("@")) {
      setShowMention(false);
      setMentionIndex(-1);
    }
  };

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
    // If user mentions @gemini, call backend Gemini integration and persist reply
    if (/@gemini/i.test(msg.text)) {
      try {
        // Call Gemini via backend (AI WBS as a placeholder, can be replaced with a chat endpoint)
        const aiRes = await backendClient.execute<any>("copilotColab.ai.generateWbs", {
          projectId: project.id,
          goal: msg.text,
          maxTasks: 1,
          persist: false,
        });
        const geminiText = aiRes?.notes?.[0] || aiRes?.generated?.[0]?.title || "Gemini is thinking...";
        const geminiMsg: Message = {
          id: `gemini-${Date.now()}`,
          project_id: project.id,
          text: geminiText,
          author_id: "gemini",
          created_at: new Date().toISOString(),
        };
        addMessage(geminiMsg);
        await backendClient.execute("copilotColab.messages.send", geminiMsg);
      } catch {
        // Optionally show error or fallback
      }
    }
    setSending(false);
  };

  return (
    <section className="flex flex-col flex-1 bg-[#18181b] border border-border-dark rounded-2xl shadow-xl p-0 w-full h-full min-h-0 min-w-0 overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 pb-2 border-b border-white/5 flex items-center gap-3">
        <span className="material-symbols-outlined text-indigo-400 text-2xl">chat_bubble</span>
        <h2 className="text-base font-mono tracking-editorial text-text-muted uppercase">Team Chat</h2>
      </div>
      {/* Messages */}
      <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-0 px-4 py-6 bg-transparent">
        {messages.map((msg, idx) => (
          <div key={msg.id} className={`flex ${msg.author_id === currentUser?.uid ? 'justify-end' : 'justify-start'}`}> 
            <div className={`flex items-end gap-2 max-w-[70%] ${msg.author_id === currentUser?.uid ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              {msg.author_id === "gemini" ? (
                <div className="size-8 rounded-full bg-gradient-to-br from-purple-500 via-indigo-500 to-blue-500 border border-white/10 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-base">smart_toy</span>
                </div>
              ) : (
                <div className="size-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-primary text-base">person</span>
                </div>
              )}
              <div className={`flex flex-col gap-1 ${msg.author_id === currentUser?.uid ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-xl px-4 py-2 text-sm font-mono whitespace-pre-line ${msg.author_id === "gemini" ? 'bg-indigo-900/40 text-indigo-100' : msg.author_id === currentUser?.uid ? 'bg-primary/30 text-primary' : 'bg-surface-dark text-text-main'} shadow-sm`}>
                  {/* Highlight @gemini mentions */}
                  {msg.text.split(/(@gemini)/gi).map((part, i) =>
                    part.toLowerCase() === "@gemini" ? (
                      <span key={i} className="font-mono text-indigo-400 bg-indigo-400/10 px-1 py-0.5 rounded-sm">@gemini</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>
                {/* Gemini replied badge */}
                {msg.author_id === "gemini" && (
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded-sm inline-block">Gemini replied</span>
                )}
                <span className="text-[10px] text-text-dim font-mono mt-1">{new Date(msg.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Input */}
      <form
        className="flex gap-2 items-center px-6 py-4 border-t border-white/5 bg-[#19191d]"
        onSubmit={e => {
          e.preventDefault();
          handleSend();
        }}
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={e => {
              if (e.key === "Enter" && !showMention) handleSend();
              else handleInputKeyDown(e);
            }}
            placeholder="Message your team..."
            className="w-full bg-surface-dark border border-white/10 rounded-full px-4 py-3 text-sm font-mono text-text-main placeholder-text-dim outline-none focus:border-primary/50 transition-all"
            autoComplete="off"
          />
          {/* Mention popup */}
          {showMention && (
            <div className="absolute left-4 bottom-12 z-10 bg-[#18181b] border border-white/10 rounded shadow-lg px-3 py-2 flex items-center gap-2 animate-fade-in">
              <span className="material-symbols-outlined text-indigo-400 text-base">smart_toy</span>
              <span className="font-mono text-indigo-300">@gemini</span>
              <span className="ml-2 text-[10px] text-text-dim">Tab to autocomplete</span>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={sending}
          className="px-4 py-3 bg-primary/80 border border-primary/30 rounded-full text-white hover:bg-primary transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">send</span>
        </button>
      </form>
    </section>
  );
};

export default ChatPanel;
