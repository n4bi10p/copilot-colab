// ── Task ─────────────────────────────────────────────────────────────────────
export type TaskStatus = "backlog" | "in-progress" | "review" | "merged";

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
  assigneeId?: string;
  tags?: string[];
  priority?: "low" | "medium" | "high";
  progress?: number; // 0-100
  hasConflict?: boolean;
  prNumber?: string;
  approvals?: number;
  totalApprovals?: number;
  commentCount?: number;
  createdAt: number;
  updatedAt: number;
}

// ── User / Presence ──────────────────────────────────────────────────────────
export type PresenceStatus = "online" | "idle" | "offline";

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

export interface Presence {
  userId: string;
  projectId: string;
  status: PresenceStatus;
  lastActiveAt: number;
  activeFile?: string;
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  projectId: string;
  text: string;
  authorId: string;
  authorName: string;
  authorPhoto?: string;
  createdAt: number;
}

// ── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  version?: string;
  env?: string;
  createdAt: number;
  createdBy: string;
}

// ── Dashboard metrics ────────────────────────────────────────────────────────
export interface DashboardMetrics {
  activeAgents: number;
  openPRs: number;
  buildTime: string;
  coverage: string;
  agentDelta?: string;
  buildDelta?: string;
}

// ── Agent / Orchestrator ─────────────────────────────────────────────────────
export interface AgentMessage {
  id: string;
  role: "agent" | "user";
  content: string;
  timestamp: number;
  actions?: string[];
}

export interface TerminalLine {
  type: "command" | "output" | "success" | "warning" | "error" | "cursor";
  text: string;
}
