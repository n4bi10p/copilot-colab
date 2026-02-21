import React, { useState } from "react";
import NavRail from "./components/NavRail";
import StatColumn from "./components/StatColumn";
import TaskBoard from "./components/TaskBoard";
import AgentPanel from "./components/AgentPanel";
import TasksView from "./components/TasksView";
import AgentView from "./components/AgentView";
import TerminalView from "./components/TerminalView";
import AuthGate from "./components/AuthGate";
import { useStore } from "../state/store";
import { useAuth } from "./hooks/useAuth";
import { useTasksListener } from "./hooks/useTasks";
import { useMessagesListener } from "./hooks/useMessages";
import { usePresenceListener, useOwnPresence } from "./hooks/usePresence";

// -- Realtime listeners — mounted once user + project are ready ----------------
const RealtimeListeners: React.FC = () => {
  const uid = useStore((s) => s.currentUser?.uid);
  useTasksListener();
  useMessagesListener();
  usePresenceListener();
  useOwnPresence(uid);
  return null;
};

// -- Simple project selector ----------------------------------------------------
const ProjectSelector: React.FC = () => {
  const setProject = useStore((s) => s.setProject);
  const currentUser = useStore((s) => s.currentUser);
  const [input, setInput] = useState("");

  const handleJoin = () => {
    const id = input.trim();
    if (!id) return;
    setProject({
      id,
      name: "Team Workspace",
      created_at: new Date().toISOString(),
      created_by: currentUser?.uid ?? "",
    });
  };

  return (
    <div className="min-h-screen bg-[#111113] flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="size-9 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
          </div>
          <span className="font-mono text-lg text-white tracking-tight">
            Copilot<span className="text-primary">CoLab</span>
          </span>
        </div>

        <div className="bg-[#18181B] border border-white/8 rounded-sm p-8">
          <h1 className="text-base font-semibold text-white mb-1">Enter Project ID</h1>
          <p className="text-sm text-text-muted mb-7">
            Paste the project UUID from your team to join the shared workspace.
          </p>
          <div className="flex flex-col gap-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2.5 text-sm text-text-main outline-none focus:border-primary/50 font-mono placeholder:text-text-dim"
            />
            <button
              onClick={handleJoin}
              disabled={!input.trim()}
              className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[16px]">group</span>
              Join Workspace
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-text-dim">
          Signed in as <span className="text-text-muted">{currentUser?.email}</span>
        </p>
      </div>
    </div>
  );
};

// -- Root app ------------------------------------------------------------------
const App: React.FC = () => {
  useAuth();
  const activePanel = useStore((s) => s.activePanel);
  const currentUser = useStore((s) => s.currentUser);
  const authReady = useStore((s) => s.authReady);
  const project = useStore((s) => s.project);

  // 1. Spinner while auth initializes
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#111113] flex items-center justify-center">
        <span className="size-6 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // 2. Auth gate
  if (!currentUser) return <AuthGate />;

  // 3. Project setup
  if (!project?.id) return <ProjectSelector />;

  // 4. Main app
  return (
    <>
      <RealtimeListeners />
      {activePanel === "dashboard" ? (
        <div className="dashboard-grid bg-background-dark selection:bg-primary/30 selection:text-white">
          <NavRail />
          <StatColumn />
          <TaskBoard />
          <AgentPanel />
        </div>
      ) : (
        <div className="flex h-screen overflow-hidden bg-background-dark selection:bg-primary/30 selection:text-white">
          <NavRail />
          {activePanel === "tasks" && <TasksView />}
          {activePanel === "agent" && <AgentView />}
          {activePanel === "terminal" && <TerminalView />}
        </div>
      )}
    </>
  );
};

export default App;
