import React from "react";
import NavRail from "./components/NavRail";
import StatColumn from "./components/StatColumn";
import TaskBoard from "./components/TaskBoard";
import AgentPanel from "./components/AgentPanel";

const App: React.FC = () => {
  return (
    <div className="dashboard-grid bg-background-dark selection:bg-primary/30 selection:text-white">
      <NavRail />
      <StatColumn />
      <TaskBoard />
      <AgentPanel />
    </div>
  );
};

export default App;
