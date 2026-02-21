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

  // Project
  project: {
    id: "demo-project",
    name: "Project Alpha",
    version: "v2.4.0",
    env: "prod-us-east",
    createdAt: Date.now(),
    createdBy: "demo",
  },
  setProject: (project) => set({ project }),

  // Tasks — seeded with demo data matching the UI design
  tasks: [
    {
      id: "NET-204",
      projectId: "demo-project",
      title: "Refactor auth middleware for new token standard",
      status: "backlog",
      tags: ["backend"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "NET-221",
      projectId: "demo-project",
      title: "Implement Redis caching layer",
      status: "backlog",
      tags: ["infra", "perf"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "NET-conflict",
      projectId: "demo-project",
      title: "Fix race condition in payment API webhook handler",
      status: "in-progress",
      priority: "high",
      hasConflict: true,
      progress: 66,
      tags: ["high-priority"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "NET-199",
      projectId: "demo-project",
      title: "Update dependencies for security patch",
      status: "in-progress",
      tags: ["maint"],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "NET-review-1",
      projectId: "demo-project",
      title: "API Gateway schema validation",
      status: "review",
      prNumber: "#4092",
      approvals: 2,
      totalApprovals: 2,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "NET-215",
      projectId: "demo-project",
      title: "Dashboard V2 layout implementation",
      status: "review",
      prNumber: "#4088",
      commentCount: 5,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "NET-188",
      projectId: "demo-project",
      title: "User profile image optimization",
      status: "merged",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: "NET-192",
      projectId: "demo-project",
      title: "Dark mode toggle persistence",
      status: "merged",
      createdAt: Date.now(),
      updatedAt: Date.now(),
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
        t.id === id ? { ...t, status, updatedAt: Date.now() } : t
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
