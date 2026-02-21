import * as vscode from "vscode";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CopilotColabRealtimeApi } from "./api/realtime";
import { CopilotColabSupabaseApi } from "./api/supabase";
import type { PresenceStatus, ProjectMemberRole } from "../types/backend";

export function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("copilot-colab.openDashboard", () => {
      vscode.commands.executeCommand("workbench.view.extension.copilot-colab");
    })
  );
}

export const COMMANDS = {
  createProject: "copilotColab.project.create",
  inviteMember: "copilotColab.member.invite",
  removeMember: "copilotColab.member.remove",
  listMembers: "copilotColab.member.list",
  listTasks: "copilotColab.tasks.list",
  listMessages: "copilotColab.messages.list",
  upsertPresence: "copilotColab.presence.upsert",
  subscribeProject: "copilotColab.realtime.subscribeProject",
  unsubscribeProject: "copilotColab.realtime.unsubscribeProject",
} as const;

interface CommandDeps {
  api: CopilotColabSupabaseApi;
  realtimeApi: CopilotColabRealtimeApi;
  output: vscode.OutputChannel;
}

interface CreateProjectArgs {
  name: string;
  createdBy: string;
}

interface InviteMemberArgs {
  projectId: string;
  userId: string;
  role?: ProjectMemberRole;
}

interface RemoveMemberArgs {
  projectId: string;
  userId: string;
}

interface ListByProjectArgs {
  projectId: string;
}

interface UpsertPresenceArgs {
  userId: string;
  projectId: string;
  status: PresenceStatus;
}

interface SubscribeProjectArgs {
  projectId: string;
}

type CommandSuccess = { ok: true; data: unknown };
type CommandFailure = { ok: false; error: string };
type CommandResult = CommandSuccess | CommandFailure;

function ok(data: unknown): CommandSuccess {
  return { ok: true, data };
}

function fail(error: unknown): CommandFailure {
  return { ok: false, error: error instanceof Error ? error.message : String(error) };
}

export function registerBackendCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const { api, realtimeApi, output } = deps;
  const subscriptions = new Map<string, RealtimeChannel[]>();

  const register = (command: string, handler: (...args: any[]) => Promise<CommandResult>) => {
    context.subscriptions.push(
      vscode.commands.registerCommand(command, async (...args: unknown[]) => {
        try {
          const result = await handler(...args);
          if (!result.ok && "error" in result) {
            output.appendLine(`[${command}] ERROR ${result.error}`);
          }
          return result;
        } catch (error) {
          const result = fail(error);
          output.appendLine(`[${command}] ERROR ${result.error}`);
          return result;
        }
      })
    );
  };

  register(COMMANDS.createProject, async (args: CreateProjectArgs) => {
    const data = await api.createProject({ name: args.name, createdBy: args.createdBy });
    output.appendLine(`[${COMMANDS.createProject}] project=${data.id}`);
    return ok(data);
  });

  register(COMMANDS.inviteMember, async (args: InviteMemberArgs) => {
    const data = await api.addProjectMember({
      projectId: args.projectId,
      userId: args.userId,
      role: args.role ?? "member",
    });
    output.appendLine(`[${COMMANDS.inviteMember}] project=${args.projectId} user=${args.userId}`);
    return ok(data);
  });

  register(COMMANDS.removeMember, async (args: RemoveMemberArgs) => {
    const data = await api.removeProjectMember({
      projectId: args.projectId,
      userId: args.userId,
    });
    output.appendLine(`[${COMMANDS.removeMember}] project=${args.projectId} user=${args.userId} removed=${data}`);
    return ok(data);
  });

  register(COMMANDS.listMembers, async (args: ListByProjectArgs) => {
    const data = await api.listProjectMembers(args.projectId);
    return ok(data);
  });

  register(COMMANDS.listTasks, async (args: ListByProjectArgs) => {
    const data = await api.listTasksByProject(args.projectId);
    return ok(data);
  });

  register(COMMANDS.listMessages, async (args: ListByProjectArgs) => {
    const data = await api.listMessagesByProject(args.projectId);
    return ok(data);
  });

  register(COMMANDS.upsertPresence, async (args: UpsertPresenceArgs) => {
    const data = await api.upsertPresence({
      user_id: args.userId,
      project_id: args.projectId,
      status: args.status,
    });
    return ok(data);
  });

  register(COMMANDS.subscribeProject, async (args: SubscribeProjectArgs) => {
    const projectId = args.projectId;
    const channels: RealtimeChannel[] = [
      realtimeApi.subscribeTasksByProject(projectId, (payload) => {
        output.appendLine(`[realtime:tasks] project=${projectId} event=${payload.eventType}`);
      }),
      realtimeApi.subscribeMessagesByProject(projectId, (payload) => {
        output.appendLine(`[realtime:messages] project=${projectId} event=${payload.eventType}`);
      }),
      realtimeApi.subscribePresenceByProject(projectId, (payload) => {
        output.appendLine(`[realtime:presence] project=${projectId} event=${payload.eventType}`);
      }),
      realtimeApi.subscribeMembersByProject(projectId, (payload) => {
        output.appendLine(`[realtime:members] project=${projectId} event=${payload.eventType}`);
      }),
    ];
    subscriptions.set(projectId, channels);
    return ok({ projectId, channels: channels.length });
  });

  register(COMMANDS.unsubscribeProject, async (args: SubscribeProjectArgs) => {
    const channels = subscriptions.get(args.projectId) ?? [];
    await Promise.all(channels.map((channel) => realtimeApi.unsubscribe(channel)));
    subscriptions.delete(args.projectId);
    return ok({ projectId: args.projectId, unsubscribed: channels.length });
  });
}
