import type { RealtimeChannel, RealtimePostgresChangesPayload, SupabaseClient } from "@supabase/supabase-js";
import type { Message, Presence, ProjectMember, Task } from "../../types/backend";

type ApiClient = SupabaseClient;
type Event = "INSERT" | "UPDATE" | "DELETE";
type Handler<T> = (payload: RealtimePostgresChangesPayload<any>) => void;

function subscribeToTable<T>(
  client: ApiClient,
  channelName: string,
  table: "tasks" | "messages" | "presence" | "project_members",
  projectId: string,
  handler: Handler<T>
): RealtimeChannel {
  return client
    .channel(channelName)
    .on(
      "postgres_changes" as any,
      {
        event: "*",
        schema: "public",
        table,
        filter: `project_id=eq.${projectId}`,
      } as any,
      handler as any
    )
    .subscribe();
}

export class CopilotColabRealtimeApi {
  constructor(private readonly client: ApiClient) {}

  subscribeTasksByProject(projectId: string, handler: Handler<Task>): RealtimeChannel {
    return subscribeToTable<Task>(this.client, `tasks:project:${projectId}`, "tasks", projectId, handler);
  }

  subscribeMessagesByProject(projectId: string, handler: Handler<Message>): RealtimeChannel {
    return subscribeToTable<Message>(
      this.client,
      `messages:project:${projectId}`,
      "messages",
      projectId,
      handler
    );
  }

  subscribePresenceByProject(projectId: string, handler: Handler<Presence>): RealtimeChannel {
    return subscribeToTable<Presence>(
      this.client,
      `presence:project:${projectId}`,
      "presence",
      projectId,
      handler
    );
  }

  subscribeMembersByProject(projectId: string, handler: Handler<ProjectMember>): RealtimeChannel {
    return subscribeToTable<ProjectMember>(
      this.client,
      `members:project:${projectId}`,
      "project_members",
      projectId,
      handler
    );
  }

  async unsubscribe(channel: RealtimeChannel): Promise<"ok" | "timed out" | "error"> {
    return this.client.removeChannel(channel);
  }
}

export { type Event };
