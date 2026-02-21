import React, { useState, useRef, useEffect } from "react";
import { useStore } from "../../state/store";
import { backendClient } from "../utils/backendClient";
import type { AgentMessage } from "../../types";
import { backendClient } from "../utils/backendClient";

const SLASH_COMMANDS = [
  { cmd: "/wbs", desc: "Generate Work Breakdown Structure from project description" },
  { cmd: "/digest", desc: "Summarize today's tasks + chat activity" },
  { cmd: "/analyze", desc: "Analyze codebase for conflicts and issues" },
  { cmd: "/assign", desc: "Suggest task assignment based on team workload" },
  { cmd: "/review", desc: "Generate PR summary and review checklist" },
];

const SUGGESTED_PROMPTS = [
  "Generate a WBS for the authentication module",
  "Summarize all open PRs and their blockers",
  "Who should review the payment API changes?",
  "What tasks are at risk of missing the deadline?",
  "Create a daily digest for the team standup",
];

const AgentBubble: React.FC<{ msg: AgentMessage }> = ({ msg }) => {
  const isAgent = msg.role === "agent";
  return (
    <div className={`flex gap-3 ${isAgent ? "" : "flex-row-reverse"}`}>
      {/* Avatar */}
      <div
        className={`size-8 rounded shrink-0 flex items-center justify-center border
          ${isAgent
            ? "bg-surface-dark border-white/10"
            : "bg-primary/20 border-primary/30"}`}
      >
        <span className={`material-symbols-outlined text-sm ${isAgent ? "text-white" : "text-primary"}`}>
          {isAgent ? "smart_toy" : "person"}
        </span>
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-2 max-w-[75%] ${isAgent ? "" : "items-end"}`}>
        <div
          className={`px-4 py-3 rounded-sm text-sm leading-relaxed
            ${isAgent
              ? "bg-surface-dark border border-white/5 text-text-main"
              : "bg-primary/20 border border-primary/20 text-white"}`}
        >
          {msg.content.split("\n\n").map((para, i) => (
            <p key={i} className={i > 0 ? "mt-2" : ""}>
              {para.split(/(`[^`]+`)/).map((part, j) =>
                part.startsWith("`") && part.endsWith("`") ? (
                  <span key={j} className="font-mono text-accent-warm bg-accent-warm/10 px-1 py-0.5 rounded-sm text-xs">
                    {part.slice(1, -1)}
                  </span>
                ) : (
                  part
                )
              )}
            </p>
          ))}
        </div>

        {/* Action chips */}
        {isAgent && msg.actions && msg.actions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {msg.actions.map((action) => (
              <button
                key={action}
                className="px-3 py-1.5 rounded-sm border border-[#3F3F46] text-[#A1A1AA] text-xs font-mono hover:border-white/30 hover:text-white transition-all bg-transparent"
              >
                [{action}]
              </button>
            ))}
          </div>
        )}

        <span className="text-[10px] font-mono text-text-dim">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
};

const AgentView: React.FC = () => {
  const { agentMessages, addAgentMessage } = useStore();
  const project = useStore((s) => s.project);
  const [input, setInput] = useState("");
  const [showCommands, setShowCommands] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [agentMessages, isTyping]);

  const handleInputChange = (val: string) => {
    setInput(val);
    setShowCommands(val.startsWith("/") && val.length >= 1);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    addAgentMessage({
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    });
    setInput("");
    setShowCommands(false);
    setIsTyping(true);

    try {
<<<<<<< Updated upstream
      let content = "";
      let actions: string[] | undefined;

      if (/^\/wbs/i.test(text.trim()) || /\bwbs\b/i.test(text)) {
        const goal = text.replace(/^\/wbs\s*/i, "").trim() || "the current project";
        if (!project?.id) {
          content = "No project selected. Please set up a project first.";
        } else {
          const result = await backendClient.generateWbs<{
            generated: Array<{ title: string; description?: string }>;
            model: string;
          }>({ projectId: project.id, goal });
          const taskLines = result.generated
            .slice(0, 10)
            .map((t, i) => `${i + 1}. ${t.title}`)
            .join("\n");
          content = `**WBS generated (${result.model}):**\n\n${taskLines}\n\nWould you like to save these tasks to the board?`;
          actions = ["Open Task Board", "Dismiss"];
        }
      } else if (/^\/assign/i.test(text.trim()) || /\bassign\b/i.test(text)) {
        if (!project?.id) {
          content = "No project selected. Please set up a project first.";
        } else {
          const result = await backendClient.aiAssignTasks<{
            assignments: Array<{ taskId: string; assigneeId: string; reason: string }>;
            usedFallback: boolean;
          }>(project.id);
          const count = result.assignments.length;
          const fallbackNote = result.usedFallback
            ? "\n\n_Used round-robin fallback (AI returned no valid mapping)._"
            : "";
          content = `Proposed **${count}** task assignment${count !== 1 ? "s" : ""}.${fallbackNote}\n\nUse the Task Board's "Assign via Gemini" button to persist.`;
          actions = ["Open Task Board", "Dismiss"];
        }
      } else {
        // General AI prompt → suggestFromSelection
        const cleanPrompt = text.replace(/^\/\w+\s*/, "").trim() || text;
        const result = await backendClient.suggestFromSelection<{ content: string; model: string }>({
          prompt: cleanPrompt,
        });
        content = result.content || "(No response from AI)";
      }

      addAgentMessage({
        id: `agent-${Date.now()}`,
        role: "agent",
        content,
        timestamp: Date.now(),
        actions,
      });
    } catch (err: any) {
      addAgentMessage({
        id: `agent-err-${Date.now()}`,
        role: "agent",
        content: `Error: ${err?.message ?? "AI request failed"}`,
=======
      const response = await getAgentResponse(text);
      addAgentMessage({
        id: `agent-${Date.now()}`,
        role: "agent",
        content: response.content,
        timestamp: Date.now(),
        actions: response.actions,
      });
    } catch (error) {
      addAgentMessage({
        id: `agent-${Date.now()}`,
        role: "agent",
        content: `Error: ${error instanceof Error ? error.message : String(error)}`,
>>>>>>> Stashed changes
        timestamp: Date.now(),
      });
    } finally {
      setIsTyping(false);
<<<<<<< Updated upstream
    }
=======
    }
  };

  const getAgentResponse = async (text: string): Promise<{ content: string; actions?: string[] }> => {
    const lower = text.toLowerCase();
    const project = useStore.getState().project;

    if (lower.includes("/wbs")) {
      if (!project?.id) {
        return { content: "I need an active project context to generate a WBS. Please ensure you are logged in and a project is selected." };
      }

      // Extract goal from text (remove /wbs)
      const goal = text.replace(/\/wbs/i, "").trim() || "General project breakdown";

      const result = await backendClient.generateWbs<{
        generated: Array<{ title: string; status: string }>;
        notes: string[];
        persistedCount: number;
      }>({
        projectId: project.id,
        goal,
        persist: true,
      });

      const taskList = result.generated.map((t) => `- \`${t.status}\` ${t.title}`).join("\n");
      const notes = result.notes.length > 0 ? `\n\n**Notes:**\n${result.notes.join("\n")}` : "";

      return {
        content: `**WBS Generated:**\n\n${taskList}${notes}\n\n${result.persistedCount} tasks were created in the board.`,
        actions: ["View Board"],
      };
    }
    if (lower.includes("/digest")) {
      return {
        content: "**Daily Digest — Feb 21, 2026**\n\nTasks completed: 2 | In progress: 2 | Blocked: 1\n\nKey updates:\n- `NET-conflict` has a merge conflict with `origin/main` in `payment-api.ts`\n- `NET-review-1` is ready to merge (2/2 approvals)\n- Build time improved by 12% vs yesterday\n\nTeam is on track for Cycle 42 deadline.",
        actions: ["Send to Team", "Copy", "Dismiss"],
      };
    }
    return {
      content: "I've analyzed your request. Based on the current project state, I recommend prioritizing the `in-progress` tasks before picking up new backlog items. The payment API conflict should be resolved first as it blocks 2 downstream tasks.",
    };
>>>>>>> Stashed changes
  };

  const filteredCommands = SLASH_COMMANDS.filter((c) =>
    c.cmd.includes(input.toLowerCase())
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main chat area */}
      <div className="flex-1 flex flex-col bg-[#111113] overflow-hidden">
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-8 border-b border-border-dark shrink-0">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded bg-surface-dark border border-white/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
            </div>
            <div>
              <h2 className="text-sm font-mono text-white">AI Orchestrator</h2>
              <p className="text-[10px] font-mono text-emerald-500">ONLINE • Ready</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="text-text-muted hover:text-white transition-colors text-xs font-mono flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
              Clear
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 flex flex-col gap-6">
          {/* Welcome */}
          {agentMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-center">
              <div className="size-16 rounded-xl bg-surface-dark border border-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-3xl">smart_toy</span>
              </div>
              <h3 className="text-lg font-semibold text-white">Copilot CoLab Orchestrator</h3>
              <p className="text-sm text-text-muted max-w-md">
                Your AI agent for task planning, conflict detection, PR review, and team coordination.
                Use <span className="font-mono text-primary">/</span> for slash commands.
              </p>
            </div>
          )}

          {agentMessages.map((msg) => (
            <AgentBubble key={msg.id} msg={msg} />
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex gap-3">
              <div className="size-8 rounded bg-surface-dark border border-white/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-white text-sm">smart_toy</span>
              </div>
              <div className="bg-surface-dark border border-white/5 px-4 py-3 rounded-sm flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:0ms]" />
                <span className="size-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:150ms]" />
                <span className="size-1.5 rounded-full bg-text-muted animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input area */}
        <div className="p-6 border-t border-border-dark relative">
          {/* Slash command dropdown */}
          {showCommands && filteredCommands.length > 0 && (
            <div className="absolute bottom-full left-6 right-6 mb-2 bg-surface-dark border border-white/10 rounded-sm overflow-hidden shadow-xl">
              {filteredCommands.map(({ cmd, desc }) => (
                <button
                  key={cmd}
                  onClick={() => { setInput(cmd + " "); setShowCommands(false); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <span className="text-primary font-mono text-sm w-24 shrink-0">{cmd}</span>
                  <span className="text-xs text-text-muted">{desc}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <div className="flex-1 bg-surface-dark border border-white/10 rounded-sm flex items-center gap-3 px-4 py-3 focus-within:border-primary/40 transition-colors">
              <span className="material-symbols-outlined text-[18px] text-text-dim">chat</span>
              <input
                value={input}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && !isTyping && void sendMessage(input)}
                placeholder="Ask the orchestrator... (type / for commands)"
                className="flex-1 bg-transparent text-sm font-mono text-text-main placeholder-text-dim outline-none"
              />
              {input && (
                <button onClick={() => { setInput(""); setShowCommands(false); }} className="text-text-dim hover:text-white">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>
            <button
              onClick={() => void sendMessage(input)}
              disabled={!input.trim() || isTyping}
              className="px-4 bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
          <p className="text-[10px] font-mono text-text-dim mt-2 px-1">
            Press <span className="text-text-muted">Enter</span> to send · <span className="text-text-muted">/</span> for slash commands
          </p>
        </div>
      </div>

      {/* Suggested Prompts Sidebar */}
      <aside className="w-72 shrink-0 border-l border-border-dark bg-[#0f0f11] flex flex-col p-6 overflow-y-auto">
        <h3 className="text-xs font-mono tracking-editorial text-text-dim uppercase mb-6">
          Suggested Prompts
        </h3>
        <div className="flex flex-col gap-2 mb-8">
          {SUGGESTED_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              onClick={() => void sendMessage(prompt)}
              className="text-left px-4 py-3 bg-surface-dark border border-white/5 rounded-sm text-xs text-text-muted hover:text-white hover:border-white/10 transition-colors leading-relaxed"
            >
              {prompt}
            </button>
          ))}
        </div>

        <div className="border-t border-border-dark pt-6">
          <h3 className="text-xs font-mono tracking-editorial text-text-dim uppercase mb-4">
            Slash Commands
          </h3>
          <div className="flex flex-col gap-2">
            {SLASH_COMMANDS.map(({ cmd, desc }) => (
              <button
                key={cmd}
                onClick={() => { setInput(cmd + " "); }}
                className="text-left flex flex-col gap-0.5 px-4 py-3 bg-surface-dark border border-white/5 rounded-sm hover:border-white/10 transition-colors"
              >
                <span className="text-xs font-mono text-primary">{cmd}</span>
                <span className="text-[10px] text-text-dim leading-relaxed">{desc}</span>
              </button>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
};

export default AgentView;
