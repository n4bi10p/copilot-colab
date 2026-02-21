import React, { useState } from "react";
import { useStore } from "../../state/store";
import { backendClient } from "../utils/backendClient";

const NAV_ITEMS = [
  { icon: "dashboard", panel: "dashboard" as const },
  { icon: "account_tree", panel: "tasks" as const },
  { icon: "smart_toy", panel: "agent" as const },
  { icon: "terminal", panel: "terminal" as const },
];

const NavRail: React.FC = () => {
  const { activePanel, setActivePanel } = useStore();
  const currentUser = useStore((s) => s.currentUser);
  const setCurrentUser = useStore((s) => s.setCurrentUser);
  const setProject = useStore((s) => s.setProject);
  const [showMenu, setShowMenu] = useState(false);

  const handleSignOut = async () => {
    try {
      await backendClient.signOut();
    } catch {
      /* ignore */
    }
    setCurrentUser(null);
    setProject(null as any);
    setShowMenu(false);
  };

  const initial = currentUser?.displayName?.charAt(0).toUpperCase() ?? currentUser?.email?.charAt(0).toUpperCase() ?? "?";

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
      <div className="mt-auto flex flex-col gap-4 w-full px-2 relative">
        <button className="group flex items-center justify-center p-3 rounded-lg text-text-muted hover:text-white hover:bg-white/5 transition-colors">
          <span className="material-symbols-outlined text-[24px]">settings</span>
        </button>

        {/* User avatar + menu */}
        <div className="relative flex justify-center">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="size-8 rounded-full bg-surface-dark border border-white/10 overflow-hidden relative flex items-center justify-center hover:border-primary/50 transition-colors"
            title={currentUser?.email ?? "User"}
          >
            <span className="text-xs font-mono text-white font-semibold">{initial}</span>
          </button>

          {/* Dropdown */}
          {showMenu && (
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 bg-[#1a1a1e] border border-white/10 rounded-sm shadow-xl shadow-black/40 z-50 overflow-hidden">
              {/* User info */}
              <div className="px-3 py-3 border-b border-white/5">
                <p className="text-xs font-mono text-white truncate">{currentUser?.displayName}</p>
                <p className="text-[10px] font-mono text-text-dim truncate">{currentUser?.email}</p>
              </div>
              {/* Sign out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs font-mono text-red-400 hover:bg-white/5 transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default NavRail;
