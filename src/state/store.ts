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
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
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
  activePanel: "dashboard" | "tasks" | "agent" | "terminal";
  setActivePanel: (panel: AppState["activePanel"]) => void;
}

export const useStore = create<AppState>((set) => ({
  // Auth
  currentUser: null,
  setCurrentUser: (user) => set({ currentUser: user }),
  authReady: false,
  setAuthReady: (ready) => set({ authReady: ready }),

  // Project
  project: {
    id: "demo-project",
    name: "Project Alpha",
    version: "v2.4.0",
    env: "prod-us-east",
    created_at: new Date().toISOString(),
    created_by: "demo",
  },
  setProject: (project) => set({ project }),

  // Tasks — seeded with demo data matching the UI design
  tasks: [
    {
      id: "NET-204",
      project_id: "demo-project",
      title: "Refactor auth middleware for new token standard",
      status: "backlog",
      tags: ["backend"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "NET-221",
      project_id: "demo-project",
      title: "Implement Redis caching layer",
      status: "backlog",
      tags: ["infra", "perf"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "NET-conflict",
      project_id: "demo-project",
      title: "Fix race condition in payment API webhook handler",
      status: "in_progress",
      priority: "high",
      hasConflict: true,
      progress: 66,
      tags: ["high-priority"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "NET-199",
      project_id: "demo-project",
      title: "Update dependencies for security patch",
      status: "in_progress",
      tags: ["maint"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "NET-review-1",
      project_id: "demo-project",
      title: "API Gateway schema validation",
      status: "in_progress",
      prNumber: "#4092",
      approvals: 2,
      totalApprovals: 2,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "NET-215",
      project_id: "demo-project",
      title: "Dashboard V2 layout implementation",
      status: "in_progress",
      prNumber: "#4088",
      commentCount: 5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "NET-188",
      project_id: "demo-project",
      title: "User profile image optimization",
      status: "done",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "NET-192",
      project_id: "demo-project",
      title: "Dark mode toggle persistence",
      status: "done",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ],
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
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
  setMessages: (messages) => set({ messages }),
  addMessage: (message) =>
    set((s) => ({ messages: [...s.messages, message] })),

  // Presence
  presenceMap: {},
  setPresence: (userId, presence) =>
    set((s) => ({ presenceMap: { ...s.presenceMap, [userId]: presence } })),

  // Metrics
  metrics: {
    activeAgents: 4,
    openPRs: 12,
    buildTime: "42s",
    coverage: "94%",
    agentDelta: "+1",
    buildDelta: "-12%",
  },
  setMetrics: (metrics) => set({ metrics }),

  // Agent
  agentMessages: [
    {
      id: "agent-1",
      role: "agent",
      content:
        "I've detected a potential conflict in payment-api.ts based on the latest merge from origin/main.\n\nWould you like me to run a predictive analysis on the affected lines?",
      timestamp: Date.now(),
      actions: ["Run Analysis", "Diff Check", "Ignore"],
    },
  ],
  addAgentMessage: (msg) =>
    set((s) => ({ agentMessages: [...s.agentMessages, msg] })),

  // UI
  activePanel: "dashboard",
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
