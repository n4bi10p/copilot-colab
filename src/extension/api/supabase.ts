import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Message,
  Presence,
  Project,
  ProjectMember,
  ProjectMemberRole,
  Task,
  UpsertPresenceInput,
} from "../../types/backend";

type ApiClient = SupabaseClient;

function ensureNoError(error: { message: string } | null): void {
  if (error) {
    throw new Error(error.message);
  }
}

export class CopilotColabSupabaseApi {
  constructor(private readonly client: ApiClient) {}

  async createProject(input: { name: string; createdBy: string }): Promise<Project> {
    const { data, error } = await this.client
      .from("projects")
      .insert({
        name: input.name,
        created_by: input.createdBy,
      })
      .select("*")
      .single();

    ensureNoError(error);
    return data as Project;
  }

  async addProjectMember(input: {
    projectId: string;
    userId: string;
    role?: ProjectMemberRole;
  }): Promise<ProjectMember> {
    const { data, error } = await this.client.rpc("invite_member", {
      p_project_id: input.projectId,
      p_user_id: input.userId,
      p_role: input.role ?? "member",
    });

    ensureNoError(error);
    return data as ProjectMember;
  }

  async listProjectMembers(projectId: string): Promise<ProjectMember[]> {
    const { data, error } = await this.client.rpc("list_project_members", {
      p_project_id: projectId,
    });

    ensureNoError(error);
    return (data ?? []) as ProjectMember[];
  }

  async removeProjectMember(input: { projectId: string; userId: string }): Promise<boolean> {
    const { data, error } = await this.client.rpc("remove_member", {
      p_project_id: input.projectId,
      p_user_id: input.userId,
    });

    ensureNoError(error);
    return Boolean(data);
  }

  async listTasksByProject(projectId: string): Promise<Task[]> {
    const { data, error } = await this.client
      .from("tasks")
      .select("*")
      .eq("project_id", projectId)
      .order("updated_at", { ascending: false });

    ensureNoError(error);
    return (data ?? []) as Task[];
  }

  async upsertPresence(input: UpsertPresenceInput): Promise<Presence> {
    const { data, error } = await this.client
      .from("presence")
      .upsert(
        {
          user_id: input.user_id,
          project_id: input.project_id,
          status: input.status,
          last_active_at: input.last_active_at ?? new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select("*")
      .single();

    ensureNoError(error);
    return data as Presence;
  }

  async listMessagesByProject(projectId: string, limit = 100): Promise<Message[]> {
    const { data, error } = await this.client
      .from("messages")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(limit);

    ensureNoError(error);
    return (data ?? []) as Message[];
  }
}
