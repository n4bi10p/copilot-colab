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
  ProjectMember,
} from "../types";

// ── Toast system ──────────────────────────────────────────────────────────────
export interface Toast {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  link?: { label: string; url: string };
}

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

  // Members
  members: ProjectMember[];
  setMembers: (members: ProjectMember[]) => void;

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
  messagesLoading: boolean;
  setMessagesLoading: (loading: boolean) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  removeMessage: (id: string) => void;
  unreadCount: number;
  setUnreadCount: (count: number) => void;

  // Presence
  presenceMap: Record<string, Presence>;
  setPresence: (userId: string, presence: Presence) => void;

  // Dashboard metrics
  metrics: DashboardMetrics;
  setMetrics: (metrics: DashboardMetrics) => void;

  // Agent
  agentMessages: AgentMessage[];
  addAgentMessage: (msg: AgentMessage) => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Toast) => void;
  removeToast: (id: string) => void;

  // UI
  activePanel: "dashboard" | "tasks" | "agent" | "terminal";
  setActivePanel: (panel: AppState["activePanel"]) => void;

  // Session
  sessionExpired: boolean;
  setSessionExpired: (expired: boolean) => void;
  resetState: () => void;
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

  // Members
  members: [],
  setMembers: (members) => set({ members: Array.isArray(members) ? members : [] }),

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
  messagesLoading: true,
  setMessagesLoading: (loading) => set({ messagesLoading: loading }),
  setMessages: (messages) => set({ messages: Array.isArray(messages) ? messages : [], messagesLoading: false }),
  addMessage: (message) =>
    set((s) => {
      // Avoid duplicates by id
      if (s.messages.some((m) => m.id === message.id)) return s;
      return { messages: [...s.messages, message] };
    }),
  updateMessage: (id, updates) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  removeMessage: (id) =>
    set((s) => ({ messages: s.messages.filter((m) => m.id !== id) })),
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),

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

  // Toasts
  toasts: [],
  addToast: (toast) =>
    set((s) => ({ toasts: [...s.toasts, toast] })),
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // UI
  activePanel: "dashboard",
  setActivePanel: (panel) => set({ activePanel: panel }),

  // Session
  sessionExpired: false,
  setSessionExpired: (expired) => set({ sessionExpired: expired }),
  resetState: () =>
    set({
      currentUser: null,
      project: null,
      members: [],
      tasks: [],
      tasksLoading: true,
      messages: [],
      messagesLoading: true,
      unreadCount: 0,
      presenceMap: {},
      agentMessages: [],
      toasts: [],
      activePanel: "dashboard",
      sessionExpired: false,
      metrics: {
        activeAgents: 0,
        openPRs: 0,
        buildTime: "—",
        coverage: "—",
        agentDelta: "",
        buildDelta: "",
      },
    }),
}));
