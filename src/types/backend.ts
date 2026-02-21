export type TaskStatus = "backlog" | "in_progress" | "done";
export type PresenceStatus = "online" | "idle";
export type ProjectMemberRole = "owner" | "member";

export interface Project {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
  repo_full_name?: string | null;
}

export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  created_at: string;
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  status: TaskStatus;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  project_id: string;
  text: string;
  author_id: string;
  sender_kind?: "user" | "assistant";
  sender_label?: string | null;
  created_at: string;
}

export interface Presence {
  user_id: string;
  project_id: string;
  status: PresenceStatus;
  last_active_at: string;
}

export interface UpsertPresenceInput {
  user_id: string;
  project_id: string;
  status: PresenceStatus;
  last_active_at?: string;
}

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: Project;
        Insert: Pick<Project, "name" | "created_by"> &
          Partial<Pick<Project, "id" | "created_at" | "repo_full_name">>;
        Update: Partial<Pick<Project, "name" | "created_by" | "repo_full_name">>;
      };
      project_members: {
        Row: ProjectMember;
        Insert: Pick<ProjectMember, "project_id" | "user_id"> &
          Partial<Pick<ProjectMember, "role" | "id" | "created_at">>;
        Update: Partial<Pick<ProjectMember, "role">>;
      };
      tasks: {
        Row: Task;
        Insert: Pick<Task, "project_id" | "title"> &
          Partial<Pick<Task, "status" | "assignee_id" | "id" | "created_at" | "updated_at">>;
        Update: Partial<Pick<Task, "title" | "status" | "assignee_id" | "updated_at">>;
      };
      messages: {
        Row: Message;
        Insert: Pick<Message, "project_id" | "text" | "author_id"> &
          Partial<Pick<Message, "id" | "created_at" | "sender_kind" | "sender_label">>;
        Update: Partial<Pick<Message, "text">>;
      };
      presence: {
        Row: Presence;
        Insert: Pick<Presence, "user_id" | "project_id" | "status"> & Partial<Pick<Presence, "last_active_at">>;
        Update: Partial<Pick<Presence, "project_id" | "status" | "last_active_at">>;
      };
    };
  };
}
