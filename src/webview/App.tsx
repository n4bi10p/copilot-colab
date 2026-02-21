import React, { useState } from "react";
import NavRail from "./components/NavRail";
import StatColumn from "./components/StatColumn";
import TaskBoard from "./components/TaskBoard";
import AgentPanel from "./components/AgentPanel";
import TasksView from "./components/TasksView";
import AgentView from "./components/AgentView";
import TerminalView from "./components/TerminalView";
import AuthGate from "./components/AuthGate";
import ToastContainer from "./components/ToastContainer";
import { useStore } from "../state/store";
import { useAuth } from "./hooks/useAuth";
import { useTasksListener } from "./hooks/useTasks";
import { useMessagesListener } from "./hooks/useMessages";
import { usePresenceListener, useOwnPresence } from "./hooks/usePresence";
import { BACKEND_COMMANDS, backendClient } from "./utils/backendClient";
import type { Project } from "../types";

// Realtime listeners mounted once user + project are ready
const RealtimeListeners: React.FC = () => {
  const uid = useStore((s) => s.currentUser?.uid);
  useTasksListener();
  useMessagesListener();
  usePresenceListener();
  useOwnPresence(uid);
  return null;
};

const PROJECT_CACHE_KEY = "copilot-colab.project";

function readCachedProject(): Project | null {
  try {
    const raw = localStorage.getItem(PROJECT_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Project;
    return parsed?.id ? parsed : null;
  } catch {
    return null;
  }
}

function cacheProject(project: Project): void {
  try {
    localStorage.setItem(PROJECT_CACHE_KEY, JSON.stringify(project));
  } catch {
    // ignore storage failures
  }
}

// Auto project setup after login (no manual UUID input)
const ProjectBootstrap: React.FC = () => {
  const setProject = useStore((s) => s.setProject);
  const currentUser = useStore((s) => s.currentUser);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [noRepo, setNoRepo] = useState(false);

  React.useEffect(() => {
    if (!currentUser?.uid) return;
    let cancelled = false;

    const bootstrap = async () => {
      setLoading(true);
      setError(null);
      setNoRepo(false);

      const cached = readCachedProject();
      if (cached && !cancelled) {
        setProject(cached);
        setLoading(false);
        return;
      }

      try {
        const project = await backendClient.execute<Project>(
          BACKEND_COMMANDS.resolveProjectForWorkspace,
          {
            fallbackName: `${(currentUser.displayName || currentUser.email || "Team").split("@")[0]} Workspace`,
          }
        );

        if (!project?.id) {
          throw new Error("Workspace project resolver did not return a valid project.");
        }

        if (!cancelled) {
          setProject(project);
          cacheProject(project);
        }
      } catch (err) {
        // Fallback to explicit project creation for compatibility with older command surfaces.
        try {
          const project = await backendClient.execute<Project>(BACKEND_COMMANDS.createProject, {
            name: `${(currentUser.displayName || currentUser.email || "Team").split("@")[0]} Workspace`,
            createdBy: currentUser.uid,
            repoFullName: undefined,
          });

          if (!cancelled) {
            setProject(project);
            cacheProject(project);
          }
        } catch (fallbackErr) {
          if (!cancelled) {
            const msg = fallbackErr instanceof Error
              ? fallbackErr.message
              : err instanceof Error
              ? err.message
              : "Failed to initialize workspace.";
            // Detect repo-not-found or network errors
            if (/repo|repository|not found/i.test(msg)) {
              setNoRepo(true);
            }
            setError(msg);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, setProject]);

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
          <h1 className="text-base font-semibold text-white mb-1">Preparing your workspace</h1>
          <p className="text-sm text-text-muted mb-7">
            Setting up project context for this account. You do not need to enter any project ID.
          </p>
          {loading ? (
            <div className="flex items-center gap-3 text-text-muted">
              <span className="size-4 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
              <span className="text-sm">Initializing project...</span>
            </div>
          ) : noRepo ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-start gap-2.5 p-3 rounded-sm bg-yellow-500/10 border border-yellow-500/20">
                <span className="material-symbols-outlined text-yellow-500 text-[18px] shrink-0 mt-0.5">folder_off</span>
                <div>
                  <p className="text-xs text-yellow-400 font-medium mb-1">No repository detected</p>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Open a Git repository in VS Code, then retry. Copilot CoLab needs a repo context to set up your workspace.
                  </p>
                </div>
              </div>
              <button
                onClick={() => window.location.reload()}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : error ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-red-400 font-mono">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="w-full h-10 bg-primary hover:bg-primary/90 text-white text-sm font-medium rounded-sm transition-colors"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-sm text-emerald-400">Workspace ready. Loading dashboard...</p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-text-dim">
          Signed in as <span className="text-text-muted">{currentUser?.email}</span>
        </p>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  useAuth();
  const activePanel = useStore((s) => s.activePanel);
  const currentUser = useStore((s) => s.currentUser);
  const authReady = useStore((s) => s.authReady);
  const project = useStore((s) => s.project);
  const sessionExpired = useStore((s) => s.sessionExpired);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#111113] flex flex-col items-center justify-center gap-3">
        <span className="size-6 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
        <span className="text-xs font-mono text-text-dim">Restoring session…</span>
      </div>
    );
  }

  if (!currentUser) return <AuthGate sessionExpired={sessionExpired} />;
  if (!project?.id) return <ProjectBootstrap />;

  return (
    <>
      <ToastContainer />
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
