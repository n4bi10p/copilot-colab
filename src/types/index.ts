// ── Task ─────────────────────────────────────────────────────────────────────
// Aligned with Nabil's Supabase schema (snake_case field names)
export type TaskStatus = "backlog" | "in_progress" | "done";

export interface Task {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  assignee_id?: string | null;
  // Frontend-only display fields
  tags?: string[];
  priority?: "low" | "medium" | "high";
  progress?: number; // 0-100
  hasConflict?: boolean;
  prNumber?: string;
  approvals?: number;
  totalApprovals?: number;
  commentCount?: number;
  created_at: string;
  updated_at: string;
}

// ── Project Member ───────────────────────────────────────────────────────────
export type ProjectMemberRole = "owner" | "member";

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  display_name?: string;
  email?: string;
  created_at: string;
}

// ── User ──────────────────────────────────────────────────────────────────────
export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
}

// ── Presence ──────────────────────────────────────────────────────────────────
export type PresenceStatus = "online" | "idle";

export interface Presence {
  user_id: string;
  project_id: string;
  status: PresenceStatus;
  last_active_at: string;
}

// ── Chat ─────────────────────────────────────────────────────────────────────
export type MessageStatus = "sending" | "sent" | "failed";

export interface Message {
  id: string;
  project_id: string;
  text: string;
  author_id: string;
  sender_kind?: "user" | "assistant";
  sender_label?: string | null;
  created_at: string;
  /** Frontend-only: tracks send state for optimistic messages */
  _status?: MessageStatus;
}

// ── Project ──────────────────────────────────────────────────────────────────
export interface Project {
  id: string;
  name: string;
  version?: string;
  env?: string;
  created_at: string;
  created_by: string;
  repo_full_name?: string | null;
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
