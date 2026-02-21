import * as vscode from "vscode";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CopilotColabAiApi } from "./api/ai";
import { CopilotColabAuthApi } from "./api/auth";
import { CopilotColabGithubApi } from "./api/github";
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
  authGetSession: "copilotColab.auth.getSession",
  authGetUser: "copilotColab.auth.getUser",
  authSignInPassword: "copilotColab.auth.signInWithPassword",
  authSignUpPassword: "copilotColab.auth.signUpWithPassword",
  authSignOut: "copilotColab.auth.signOut",
  aiGenerateWbs: "copilotColab.ai.generateWbs",
  aiSmokeTest: "copilotColab.ai.smokeTest",
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
  aiApi: CopilotColabAiApi;
  authApi: CopilotColabAuthApi;
  githubApi: CopilotColabGithubApi;
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

interface PasswordAuthArgs {
  email: string;
  password: string;
}

interface GenerateWbsArgs {
  projectId: string;
  goal: string;
  constraints?: string[];
  maxTasks?: number;
  persist?: boolean;
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
  const { aiApi, authApi, githubApi, api, realtimeApi, output } = deps;
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

  register(COMMANDS.authGetSession, async () => {
    const data = await authApi.getSession();
    return ok(data);
  });

  register(COMMANDS.authGetUser, async () => {
    const data = await authApi.getCurrentUser();
    return ok(data);
  });

  register(COMMANDS.authSignInPassword, async (args: PasswordAuthArgs) => {
    const data = await authApi.signInWithPassword({ email: args.email, password: args.password });
    output.appendLine(`[${COMMANDS.authSignInPassword}] email=${args.email}`);
    return ok(data);
  });

  register(COMMANDS.authSignUpPassword, async (args: PasswordAuthArgs) => {
    const data = await authApi.signUpWithPassword({ email: args.email, password: args.password });
    output.appendLine(`[${COMMANDS.authSignUpPassword}] email=${args.email}`);
    return ok(data);
  });

  register(COMMANDS.authSignOut, async () => {
    await authApi.signOut();
    output.appendLine(`[${COMMANDS.authSignOut}] done`);
    return ok({ signedOut: true });
  });

  register(COMMANDS.aiGenerateWbs, async (args: GenerateWbsArgs) => {
    const [existingTasks, recentMessages, members] = await Promise.all([
      api.listTasksByProject(args.projectId),
      api.listMessagesByProject(args.projectId, 20),
      api.listProjectMembers(args.projectId),
    ]);
    const github = await githubApi.getRecentContext();

    const suggestion = await aiApi.generateWbs({
      projectId: args.projectId,
      goal: args.goal,
      constraints: args.constraints,
      maxTasks: args.maxTasks,
      existingTasks,
      recentMessages,
      memberCount: members.length,
      github,
    });

    let persistedCount = 0;
    if (args.persist) {
      const created = await api.createTasks(
        suggestion.tasks.map((task) => ({
          project_id: args.projectId,
          title: task.title,
          status: task.status,
          assignee_id: null,
        }))
      );
      persistedCount = created.length;
    }

    output.appendLine(
      `[${COMMANDS.aiGenerateWbs}] project=${args.projectId} generated=${suggestion.tasks.length} persisted=${persistedCount}`
    );

    return ok({
      projectId: args.projectId,
      goal: args.goal,
      model: suggestion.model,
      generated: suggestion.tasks,
      notes: suggestion.notes,
      persistedCount,
    });
  });

  register(COMMANDS.aiSmokeTest, async () => {
    const projectId = await vscode.window.showInputBox({
      title: "Copilot CoLab AI Smoke Test",
      prompt: "Project UUID",
      placeHolder: "10ebe2d6-60d3-42f0-adf5-25ed751a44eb",
      ignoreFocusOut: true,
    });
    if (!projectId?.trim()) {
      return ok({ cancelled: true, step: "projectId" });
    }

    const goal = await vscode.window.showInputBox({
      title: "Copilot CoLab AI Smoke Test",
      prompt: "Planning goal",
      value: "Plan remaining hackathon implementation tasks",
      ignoreFocusOut: true,
    });
    if (!goal?.trim()) {
      return ok({ cancelled: true, step: "goal" });
    }

    const persistChoice = await vscode.window.showQuickPick(
      [
        { label: "No (preview only)", value: false },
        { label: "Yes (persist tasks)", value: true },
      ],
      {
        title: "Persist generated tasks to Supabase?",
        ignoreFocusOut: true,
      }
    );
    if (!persistChoice) {
      return ok({ cancelled: true, step: "persist" });
    }

    const maxTasksRaw = await vscode.window.showInputBox({
      title: "Copilot CoLab AI Smoke Test",
      prompt: "Max tasks (3-25)",
      value: "8",
      ignoreFocusOut: true,
    });
    const maxTasksParsed = Number.parseInt(maxTasksRaw ?? "8", 10);
    const maxTasks = Number.isFinite(maxTasksParsed) ? maxTasksParsed : 8;

    const result = await vscode.commands.executeCommand<CommandResult>(COMMANDS.aiGenerateWbs, {
      projectId: projectId.trim(),
      goal: goal.trim(),
      constraints: ["team of 3", "ship in 36 hours"],
      maxTasks,
      persist: persistChoice.value,
    } satisfies GenerateWbsArgs);

    if (!result) {
      throw new Error("No result returned from AI generate command.");
    }
    if (!result.ok && "error" in result) {
      throw new Error(result.error);
    }

    output.show(true);
    output.appendLine(`[${COMMANDS.aiSmokeTest}] success`);
    vscode.window.showInformationMessage("Copilot CoLab AI smoke test completed.");
    return ok((result as CommandSuccess).data);
  });

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
