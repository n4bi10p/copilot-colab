import React from "react";
import { useStore } from "../../state/store";

const EQUALIZER_HEIGHTS = [
  "h-full", "h-3/4", "h-1/2", "h-2/3", "h-full",
  "h-1/3", "h-1/2", "h-3/4", "h-1/4", "h-full", "h-2/3", "h-1/2",
];

const StatColumn: React.FC = () => {
  const { project, metrics } = useStore();

  return (
    <aside className="flex flex-col border-r border-border-dark bg-[#111113] p-8 overflow-y-auto">
      {/* Workspace Header */}
      <div className="mb-12">
        <h1 className="text-sm font-mono tracking-editorial text-text-muted uppercase mb-1">
          Workspace
        </h1>
        <div className="flex items-center gap-2 text-white font-medium text-lg">
          <span>{project?.name ?? "Project"}</span>
          <span className="material-symbols-outlined text-sm text-text-muted">expand_more</span>
        </div>
        <p className="text-xs text-text-dim mt-1 font-mono">
          {project?.version} • {project?.env}
        </p>
      </div>

      {/* Metrics Block */}
      <div className="flex flex-col gap-12">
        {/* Active Agents */}
        <div className="flex flex-col gap-2 group cursor-pointer">
          <h2 className="text-xs font-mono tracking-editorial text-text-muted uppercase flex items-center gap-2">
            Active Agents
            <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </h2>
          <div className="flex items-baseline gap-4">
            <span className="thin-stat text-white group-hover:text-primary transition-colors duration-300">
              {String(metrics.activeAgents).padStart(2, "0")}
            </span>
            <span className="text-emerald-500 font-mono text-sm">{metrics.agentDelta}</span>
          </div>
        </div>

        {/* Open PRs */}
        <div className="flex flex-col gap-2 group cursor-pointer">
          <h2 className="text-xs font-mono tracking-editorial text-text-muted uppercase">
            Open PRs
          </h2>
          <div className="flex items-baseline gap-4">
            <span className="thin-stat text-white group-hover:text-primary transition-colors duration-300">
              {metrics.openPRs}
            </span>
            <span className="text-text-dim font-mono text-sm">Reviewing</span>
          </div>
        </div>

        {/* Build Time */}
        <div className="flex flex-col gap-2 group cursor-pointer">
          <h2 className="text-xs font-mono tracking-editorial text-text-muted uppercase">
            Build Time
          </h2>
          <div className="flex items-baseline gap-4">
            <span className="thin-stat text-white group-hover:text-primary transition-colors duration-300">
              {metrics.buildTime}
            </span>
            <span className="text-orange-400 font-mono text-sm">{metrics.buildDelta}</span>
          </div>
        </div>

        {/* Coverage */}
        <div className="flex flex-col gap-2 group cursor-pointer">
          <h2 className="text-xs font-mono tracking-editorial text-text-muted uppercase">
            Coverage
          </h2>
          <div className="flex items-baseline gap-4">
            <span className="thin-stat text-white group-hover:text-primary transition-colors duration-300">
              {metrics.coverage}
            </span>
            <span className="text-text-dim font-mono text-sm">Stable</span>
          </div>
        </div>
      </div>

      {/* System Status Footer */}
      <div className="mt-auto pt-12 border-t border-white/5">
        <div className="flex items-center justify-between text-xs text-text-dim font-mono mb-4">
          <span>SYSTEM STATUS</span>
          <span className="text-emerald-500">OPTIMAL</span>
        </div>
        {/* Equalizer bars */}
        <div className="flex items-end gap-[2px] h-8 opacity-40">
          {EQUALIZER_HEIGHTS.map((h, i) => (
            <div key={i} className={`w-1 bg-white ${h}`} />
          ))}
        </div>
      </div>
    </aside>
  );
};

export default StatColumn;
