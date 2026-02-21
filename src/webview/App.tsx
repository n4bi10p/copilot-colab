import React from "react";
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

// Wires all realtime subscriptions once a user is authenticated.
const RealtimeListeners: React.FC = () => {
  const uid = useStore((s) => s.currentUser?.uid);
  useTasksListener();
  useMessagesListener();
  usePresenceListener();
  useOwnPresence(uid);
  return null;
};

const App: React.FC = () => {
  useAuth();
  const activePanel = useStore((s) => s.activePanel);
  const currentUser = useStore((s) => s.currentUser);
  const authReady = useStore((s) => s.authReady);

  // Show minimal spinner while auth initializes
  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#111113] flex items-center justify-center">
        <span className="size-6 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  // Show login screen until auth resolves
  if (currentUser === null) {
    return <AuthGate />;
  }

  return (
    <>
      <RealtimeListeners />
      {/* Dashboard uses the 4-column grid layout */}
      {activePanel === "dashboard" ? (
        <div className="dashboard-grid bg-background-dark selection:bg-primary/30 selection:text-white">
          <NavRail />
          <StatColumn />
          <TaskBoard />
          <AgentPanel />
        </div>
      ) : (
        /* Other panels: NavRail (80px) + full remaining width */
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
