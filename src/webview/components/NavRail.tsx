import React from "react";
import { useStore } from "../../state/store";

const NAV_ITEMS = [
  { icon: "dashboard", panel: "dashboard" as const },
  { icon: "account_tree", panel: "tasks" as const },
  { icon: "smart_toy", panel: "agent" as const },
  { icon: "terminal", panel: "terminal" as const },
];

const NavRail: React.FC = () => {
  const { activePanel, setActivePanel } = useStore();

  return (
    <nav className="flex flex-col items-center py-6 border-r border-border-dark h-full bg-[#0c0c0e]">
      {/* Logo */}
      <div className="mb-10">
        <div className="size-10 rounded-lg bg-gradient-to-br from-white/10 to-transparent border border-white/10 flex items-center justify-center">
          <span className="material-symbols-outlined text-white text-xl">hub</span>
        </div>
      </div>

      {/* Nav Items */}
      <div className="flex flex-col gap-6 w-full px-2">
        {NAV_ITEMS.map(({ icon, panel }) => (
          <button
            key={panel}
            onClick={() => setActivePanel(panel)}
            className={`group flex items-center justify-center p-3 rounded-lg transition-colors ${
              activePanel === panel
                ? "bg-surface-dark border border-white/5 text-white shadow-lg shadow-black/50"
                : "text-text-muted hover:text-white hover:bg-white/5"
            }`}
          >
            <span className="material-symbols-outlined text-[24px]">{icon}</span>
          </button>
        ))}
      </div>

      {/* Bottom */}
      <div className="mt-auto flex flex-col gap-6 w-full px-2">
        <button className="group flex items-center justify-center p-3 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-[24px]">settings</span>
        </button>
        <div className="size-8 rounded-full bg-surface-dark border border-white/10 overflow-hidden relative mx-auto">
          <div className="w-full h-full bg-gradient-to-br from-blue-500/40 to-purple-500/40 flex items-center justify-center">
            <span className="material-symbols-outlined text-white text-sm">person</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavRail;
