import React from "react";
import NavRail from "./components/NavRail";
import StatColumn from "./components/StatColumn";
import TaskBoard from "./components/TaskBoard";
import AgentPanel from "./components/AgentPanel";
import TasksView from "./components/TasksView";
import AgentView from "./components/AgentView";
import TerminalView from "./components/TerminalView";
import { useStore } from "../state/store";

const App: React.FC = () => {
  const activePanel = useStore((s) => s.activePanel);

  // Dashboard uses the 4-column grid layout
  if (activePanel === "dashboard") {
    return (
      <div className="dashboard-grid bg-background-dark selection:bg-primary/30 selection:text-white">
        <NavRail />
        <StatColumn />
        <TaskBoard />
        <AgentPanel />
      </div>
    );
  }

  // Other panels: NavRail (80px) + full remaining width
  return (
    <div className="flex h-screen overflow-hidden bg-background-dark selection:bg-primary/30 selection:text-white">
      <NavRail />
      {activePanel === "tasks" && <TasksView />}
      {activePanel === "agent" && <AgentView />}
      {activePanel === "terminal" && <TerminalView />}
    </div>
  );
};

export default App;
