import * as vscode from "vscode";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { CopilotColabAiApi } from "./api/ai";
import { CopilotColabAuthApi } from "./api/auth";
import { CopilotSdkApi } from "./api/copilot";
import { CopilotColabGithubApi } from "./api/github";
import { CopilotColabRealtimeApi } from "./api/realtime";
import { CopilotColabSupabaseApi } from "./api/supabase";
import type { PresenceStatus, ProjectMemberRole, TaskStatus } from "../types/backend";

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
  authSignInOAuth: "copilotColab.auth.signInWithOAuth",
  aiGenerateWbs: "copilotColab.ai.generateWbs",
  aiSuggestFromSelection: "copilotColab.ai.suggestFromSelection",
  aiSmokeTest: "copilotColab.ai.smokeTest",
  backendSmokeTest: "copilotColab.backend.smokeTest",
  githubRepoSummary: "copilotColab.github.repoSummary",
  githubListOpenPrs: "copilotColab.github.listOpenPrs",
  githubCreatePr: "copilotColab.github.createPr",
  githubMergePr: "copilotColab.github.mergePr",
  githubCommentPr: "copilotColab.github.commentPr",
  createProject: "copilotColab.project.create",
  inviteMember: "copilotColab.member.invite",
  removeMember: "copilotColab.member.remove",
  listMembers: "copilotColab.member.list",
  listTasks: "copilotColab.tasks.list",
  createTask: "copilotColab.tasks.create",
  updateTaskStatus: "copilotColab.tasks.updateStatus",
  listMessages: "copilotColab.messages.list",
  sendMessage: "copilotColab.messages.send",
  sendMessageAndList: "copilotColab.messages.sendAndList",
  upsertPresence: "copilotColab.presence.upsert",
  subscribeProject: "copilotColab.realtime.subscribeProject",
  unsubscribeProject: "copilotColab.realtime.unsubscribeProject",
} as const;

interface CommandDeps {
  aiApi: CopilotColabAiApi;
  copilotApi: CopilotSdkApi;
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

interface CreateTaskArgs {
  projectId: string;
  title: string;
  status?: TaskStatus;
  assigneeId?: string | null;
}

interface UpdateTaskStatusArgs {
  id: string;
  status: TaskStatus;
}

interface SendMessageArgs {
  projectId: string;
  text: string;
  authorId: string;
}

interface SendMessageAndListArgs extends SendMessageArgs {
  limit?: number;
}

interface PasswordAuthArgs {
  email: string;
  password: string;
}

interface OAuthArgs {
  provider: "github" | "google";
}

interface GenerateWbsArgs {
  projectId: string;
  goal: string;
  constraints?: string[];
  maxTasks?: number;
  persist?: boolean;
}

interface SuggestFromSelectionArgs {
  prompt?: string;
  model?: string;
  cliUrl?: string;
}

interface BackendSmokeTestArgs {
  projectId?: string;
  authorId?: string;
}

interface GithubCreatePrArgs {
  title: string;
  head: string;
  base: string;
  body?: string;
}

interface GithubMergePrArgs {
  pullNumber: number;
  method?: "merge" | "squash" | "rebase";
  commitTitle?: string;
}

interface GithubCommentPrArgs {
  pullNumber: number;
  body: string;
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

function hasGeminiMention(text: string): boolean {
  return /(^|\s)@gemini\b/i.test(text);
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 4000;
const GEMINI_MENTION_COOLDOWN_MS = 20_000;

function makeCommandError(code: string, message: string): Error {
  return new Error(`[${code}] ${message}`);
}

function assertUuid(value: string, fieldName: string): void {
  if (!UUID_RE.test(value.trim())) {
    throw makeCommandError("VALIDATION_INVALID_UUID", `${fieldName} must be a valid UUID.`);
  }
}

function normalizeMessageText(value: string): string {
  const text = value.trim();
  if (!text) {
    throw makeCommandError("VALIDATION_EMPTY_MESSAGE", "Message text cannot be empty.");
  }
  if (text.length > MAX_MESSAGE_LENGTH) {
    throw makeCommandError(
      "VALIDATION_MESSAGE_TOO_LONG",
      `Message text exceeds ${MAX_MESSAGE_LENGTH} characters.`
    );
  }
  return text;
}

export function registerBackendCommands(context: vscode.ExtensionContext, deps: CommandDeps): void {
  const { aiApi, copilotApi, authApi, githubApi, api, realtimeApi, output } = deps;
  const subscriptions = new Map<string, RealtimeChannel[]>();
  const geminiMentionCooldown = new Map<string, number>();

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

  register(COMMANDS.authSignInOAuth, async (args: OAuthArgs) => {
    const extensionId = context.extension.id;
    const session = await authApi.signInWithOAuth(args.provider, extensionId);
    output.appendLine(`[${COMMANDS.authSignInOAuth}] provider=${args.provider} user=${session?.user?.email ?? "unknown"}`);
    return ok(session?.user ?? null);
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

  register(COMMANDS.aiSuggestFromSelection, async (args: SuggestFromSelectionArgs = {}) => {
    const editor = vscode.window.activeTextEditor;
    const selectionText = editor
      ? editor.document.getText(editor.selection.isEmpty ? undefined : editor.selection).trim()
      : "";

    if (!selectionText) {
      throw new Error("No active selection found. Select code/text in the editor and retry.");
    }

    const language = editor?.document.languageId ?? "plaintext";
    const filePath = editor?.document.uri.fsPath ?? "untitled";
    const userPrompt = args.prompt?.trim() || "Explain this code and suggest concrete improvements.";
    const composedPrompt = [
      `You are reviewing code from file: ${filePath}`,
      `Language: ${language}`,
      "",
      "Task:",
      userPrompt,
      "",
      "Selected code:",
      "```",
      selectionText,
      "```",
      "",
      "Return practical, concise guidance with suggested edits.",
    ].join("\n");

    const data = await copilotApi.suggestFromSelection({
      prompt: composedPrompt,
      model: args.model ?? "",
      cliUrl: args.cliUrl,
    });

    output.appendLine(
      `[${COMMANDS.aiSuggestFromSelection}] file=${filePath} language=${language} model=${data.model}`
    );
    return ok(data);
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

  register(COMMANDS.backendSmokeTest, async (args: BackendSmokeTestArgs = {}) => {
    const result: Record<string, unknown> = {
      auth: false,
      github: false,
      messageRoundtrip: false,
    };

    const user = await authApi.getCurrentUser();
    result.auth = true;
    result.userId = user?.id ?? null;

    try {
      const summary = await githubApi.getRepositorySummary();
      result.github = true;
      result.repository = summary.repository;
    } catch (error) {
      result.github = false;
      result.githubError = error instanceof Error ? error.message : String(error);
    }

    if (args.projectId && args.authorId) {
      assertUuid(args.projectId, "projectId");
      assertUuid(args.authorId, "authorId");
      await vscode.commands.executeCommand(COMMANDS.sendMessage, {
        projectId: args.projectId,
        authorId: args.authorId,
        text: "[smoke] backend roundtrip test",
      } satisfies SendMessageArgs);
      const rows = await api.listMessagesByProject(args.projectId, 5);
      result.messageRoundtrip = true;
      result.recentMessages = rows.length;
    }

    output.appendLine(`[${COMMANDS.backendSmokeTest}] ${JSON.stringify(result)}`);
    return ok(result);
  });

  register(COMMANDS.githubRepoSummary, async () => {
    const data = await githubApi.getRepositorySummary();
    output.appendLine(`[${COMMANDS.githubRepoSummary}] repo=${data.repository}`);
    return ok(data);
  });

  register(COMMANDS.githubListOpenPrs, async () => {
    const data = await githubApi.listOpenPullRequests();
    output.appendLine(`[${COMMANDS.githubListOpenPrs}] count=${data.length}`);
    return ok(data);
  });

  register(COMMANDS.githubCreatePr, async (args: GithubCreatePrArgs) => {
    const data = await githubApi.createPullRequest(args);
    output.appendLine(`[${COMMANDS.githubCreatePr}] #${data.number} ${data.title}`);
    return ok(data);
  });

  register(COMMANDS.githubCommentPr, async (args: GithubCommentPrArgs) => {
    const data = await githubApi.commentOnPullRequest(args.pullNumber, args.body);
    output.appendLine(`[${COMMANDS.githubCommentPr}] #${args.pullNumber} comment=${data.id}`);
    return ok(data);
  });

  register(COMMANDS.githubMergePr, async (args: GithubMergePrArgs) => {
    const data = await githubApi.mergePullRequest(args.pullNumber, args.method ?? "squash", args.commitTitle);
    output.appendLine(
      `[${COMMANDS.githubMergePr}] #${args.pullNumber} merged=${data.merged} message=${data.message}`
    );
    return ok(data);
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

  register(COMMANDS.createTask, async (args: CreateTaskArgs) => {
    const data = await api.createTask({
      project_id: args.projectId,
      title: args.title,
      status: args.status,
      assignee_id: args.assigneeId ?? null,
    });
    output.appendLine(`[${COMMANDS.createTask}] id=${data.id} title=${args.title}`);
    return ok(data);
  });

  register(COMMANDS.updateTaskStatus, async (args: UpdateTaskStatusArgs) => {
    const data = await api.updateTaskStatus(args.id, args.status);
    output.appendLine(`[${COMMANDS.updateTaskStatus}] id=${args.id} status=${args.status}`);
    return ok(data);
  });

  register(COMMANDS.listMessages, async (args: ListByProjectArgs) => {
    const data = await api.listMessagesByProject(args.projectId);
    return ok(data);
  });

  register(COMMANDS.sendMessage, async (args: SendMessageArgs) => {
    assertUuid(args.projectId, "projectId");
    assertUuid(args.authorId, "authorId");
    const safeText = normalizeMessageText(args.text);

    const userMessage = await api.sendMessage({
      project_id: args.projectId,
      text: safeText,
      author_id: args.authorId,
      sender_kind: "user",
      sender_label: null,
    });

    let geminiReplyId: string | null = null;
    if (hasGeminiMention(safeText)) {
      try {
        const cooldownKey = `${args.projectId}:${args.authorId}`;
        const now = Date.now();
        const lastRun = geminiMentionCooldown.get(cooldownKey) ?? 0;
        if (now - lastRun < GEMINI_MENTION_COOLDOWN_MS) {
          output.appendLine(
            `[${COMMANDS.sendMessage}] gemini mention skipped: cooldown active (${Math.ceil(
              (GEMINI_MENTION_COOLDOWN_MS - (now - lastRun)) / 1000
            )}s left)`
          );
        } else {
          geminiMentionCooldown.set(cooldownKey, now);
          const [existingTasks, recentMessages] = await Promise.all([
            api.listTasksByProject(args.projectId),
            api.listMessagesByProject(args.projectId, 20),
          ]);

        const reply = await aiApi.generateMentionReply({
          projectId: args.projectId,
          message: args.text,
          existingTasks,
          recentMessages,
        });

          const geminiMessage = await api.sendMessage({
            project_id: args.projectId,
            text: reply.text,
            author_id: args.authorId,
            sender_kind: "assistant",
            sender_label: "gemini",
          });
          geminiReplyId = geminiMessage.id;
        }
      } catch (error) {
        output.appendLine(
          `[${COMMANDS.sendMessage}] gemini mention failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }

    output.appendLine(`[${COMMANDS.sendMessage}] id=${userMessage.id} geminiReply=${geminiReplyId ?? "none"}`);
    return ok(userMessage);
  });

  register(COMMANDS.sendMessageAndList, async (args: SendMessageAndListArgs) => {
    assertUuid(args.projectId, "projectId");
    assertUuid(args.authorId, "authorId");
    const limit = Math.max(1, Math.min(args.limit ?? 100, 200));
    await vscode.commands.executeCommand(COMMANDS.sendMessage, {
      projectId: args.projectId,
      text: args.text,
      authorId: args.authorId,
    } satisfies SendMessageArgs);
    const messages = await api.listMessagesByProject(args.projectId, limit);
    return ok(messages);
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
