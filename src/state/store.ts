import { create } from "zustand";
import type {
  Task,
  TaskStatus,
  Message,
  Presence,
  Project,
  User,
  DashboardMetrics,
  AgentMessage,
} from "../types";

// ── App State ─────────────────────────────────────────────────────────────────
interface AppState {
  // Auth
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  authReady: boolean;
  setAuthReady: (ready: boolean) => void;

  // Project
  project: Project | null;
  setProject: (project: Project) => void;

  // Tasks
  tasks: Task[];
  tasksLoading: boolean;
  setTasksLoading: (loading: boolean) => void;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  removeTask: (id: string) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  moveTask: (id: string, status: TaskStatus) => void;

  // Chat
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;

  // Presence
  presenceMap: Record<string, Presence>;
  setPresence: (userId: string, presence: Presence) => void;

  // Dashboard metrics
  metrics: DashboardMetrics;
  setMetrics: (metrics: DashboardMetrics) => void;

  // Agent
  agentMessages: AgentMessage[];
  addAgentMessage: (msg: AgentMessage) => void;

  // UI
  activePanel: "dashboard" | "tasks" | "chat" | "agent" | "terminal";
  setActivePanel: (panel: AppState["activePanel"]) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  authReady: false,
  setAuthReady: (ready) => set({ authReady: ready }),

  // Project
  project: null,
  setProject: (project) => set({ project }),

  // Tasks
  tasks: [],
  tasksLoading: true,
  setTasksLoading: (loading) => set({ tasksLoading: loading }),
  setTasks: (tasks) => set({ tasks: Array.isArray(tasks) ? tasks : [], tasksLoading: false }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
  removeTask: (id) => set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) })),
  updateTask: (id, updates) =>
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  moveTask: (id, status) =>
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === id ? { ...t, status, updated_at: new Date().toISOString() } : t
      ),
    })),

  // Chat
  messages: [],
  setMessages: (messages) => set({ messages: Array.isArray(messages) ? messages : [] }),
  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  // Presence
  presenceMap: {},
  setPresence: (userId, presence) =>
    set((s) => ({ presenceMap: { ...s.presenceMap, [userId]: presence } })),

  // Metrics
  metrics: {
    activeAgents: 0,
    openPRs: 0,
    buildTime: "—",
    coverage: "—",
    agentDelta: "",
    buildDelta: "",
  },
  setMetrics: (metrics) => set({ metrics }),

  // Agent
  agentMessages: [],
  addAgentMessage: (msg) =>
    set((s) => ({ agentMessages: [...s.agentMessages, msg] })),

  // UI
  activePanel: "dashboard",
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
