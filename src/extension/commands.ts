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
  aiAssignTasks: "copilotColab.ai.assignTasks",
  aiAssignTasksPrompt: "copilotColab.ai.assignTasksPrompt",
  aiSuggestFromSelection: "copilotColab.ai.suggestFromSelection",
  aiSmokeTest: "copilotColab.ai.smokeTest",
  backendSmokeTest: "copilotColab.backend.smokeTest",
  demoHealthcheck: "copilotColab.demo.healthcheck",
  githubRepoSummary: "copilotColab.github.repoSummary",
  githubListOpenPrs: "copilotColab.github.listOpenPrs",
  githubCreatePr: "copilotColab.github.createPr",
  githubMergePr: "copilotColab.github.mergePr",
  githubCommentPr: "copilotColab.github.commentPr",
  createProject: "copilotColab.project.create",
  resolveProjectForWorkspace: "copilotColab.project.resolveForWorkspace",
  inviteMember: "copilotColab.member.invite",
  removeMember: "copilotColab.member.remove",
  listMembers: "copilotColab.member.list",
  listTasks: "copilotColab.tasks.list",
  createTask: "copilotColab.tasks.create",
  updateTaskStatus: "copilotColab.tasks.updateStatus",
  updateTaskAssignee: "copilotColab.tasks.updateAssignee",
  listMessages: "copilotColab.messages.list",
  subscribeStateMessages: "copilotColab.messages.subscribeState",
  sendMessage: "copilotColab.messages.send",
  sendMessageAndList: "copilotColab.messages.sendAndList",
  upsertPresence: "copilotColab.presence.upsert",
  subscribeProject: "copilotColab.realtime.subscribeProject",
  unsubscribeProject: "copilotColab.realtime.unsubscribeProject",
  realtimeHealth: "copilotColab.realtime.health",
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
  repoFullName?: string;
}

interface ResolveProjectForWorkspaceArgs {
  fallbackName?: string;
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

interface UpdateTaskAssigneeArgs {
  id: string;
  assigneeId: string | null;
}

interface AssignTasksArgs {
  projectId: string;
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

interface AssignTasksArgs {
  projectId: string;
  taskIds?: string[];
  persist?: boolean;
  maxAssignments?: number;
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

interface RealtimeHealthArgs {
  projectId?: string;
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

  const ensureProjectSubscribed = (projectId: string): RealtimeChannel[] => {
    const existing = subscriptions.get(projectId);
    if (existing && existing.length > 0) {
      return existing;
    }
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
    return channels;
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

  register(COMMANDS.aiAssignTasks, async (args: AssignTasksArgs) => {
    assertUuid(args.projectId, "projectId");
    const allTasks = await api.listTasksByProject(args.projectId);
    const targetTaskIds = new Set((args.taskIds ?? []).map((id) => id.trim()).filter(Boolean));
    const candidateTasks = (args.taskIds?.length
      ? allTasks.filter((task) => targetTaskIds.has(task.id))
      : allTasks.filter((task) => task.status !== "done")
    ).slice(0, 50);

    const members = await api.listProjectMembers(args.projectId);
    const ai = await aiApi.assignTasks({
      projectId: args.projectId,
      tasks: candidateTasks,
      members,
      maxAssignments: args.maxAssignments,
    });

    const taskById = new Map(candidateTasks.map((task) => [task.id, task]));
    const memberIdSet = new Set(members.map((member) => member.user_id));
    const validAssignments = ai.assignments.filter(
      (assignment) => taskById.has(assignment.taskId) && memberIdSet.has(assignment.assigneeId)
    );

    let persisted = 0;
    let usedFallback = false;
    let effectiveAssignments = validAssignments;
    if (effectiveAssignments.length === 0 && candidateTasks.length > 0 && members.length > 0) {
      usedFallback = true;
      const memberIds = members.map((m) => m.user_id);
      effectiveAssignments = candidateTasks
        .slice(0, Math.max(1, Math.min(args.maxAssignments ?? candidateTasks.length, candidateTasks.length)))
        .map((task, idx) => ({
          taskId: task.id,
          assigneeId: memberIds[idx % memberIds.length],
          reason: "Fallback round-robin assignment (AI returned no valid mapping).",
        }));
    }
    if (args.persist && validAssignments.length > 0) {
      await Promise.all(
        effectiveAssignments.map((assignment) => api.updateTaskAssignee(assignment.taskId, assignment.assigneeId))
      );
      persisted = effectiveAssignments.length;
    }

    output.appendLine(
      `[${COMMANDS.aiAssignTasks}] project=${args.projectId} proposed=${ai.assignments.length} valid=${validAssignments.length} fallback=${usedFallback} persisted=${persisted}`
    );

    return ok({
      projectId: args.projectId,
      model: ai.model,
      assignments: effectiveAssignments,
      notes: usedFallback ? [...ai.notes, "Used fallback round-robin assignment."] : ai.notes,
      usedFallback,
      persistedCount: persisted,
    });
  });

  register(COMMANDS.aiAssignTasksPrompt, async () => {
    const projectId = await vscode.window.showInputBox({
      title: "Copilot CoLab AI Assign Tasks",
      prompt: "Project UUID",
      placeHolder: "10ebe2d6-60d3-42f0-adf5-25ed751a44eb",
      ignoreFocusOut: true,
    });
    if (!projectId?.trim()) {
      return ok({ cancelled: true, step: "projectId" });
    }

    const persistChoice = await vscode.window.showQuickPick(
      [
        { label: "Yes (persist assignees)", value: true },
        { label: "No (preview only)", value: false },
      ],
      {
        title: "Persist assignee updates to tasks?",
        ignoreFocusOut: true,
      }
    );
    if (!persistChoice) {
      return ok({ cancelled: true, step: "persist" });
    }

    const maxAssignmentsRaw = await vscode.window.showInputBox({
      title: "Copilot CoLab AI Assign Tasks",
      prompt: "Max assignments (1-50)",
      value: "10",
      ignoreFocusOut: true,
    });
    const parsed = Number.parseInt(maxAssignmentsRaw ?? "10", 10);
    const maxAssignments = Number.isFinite(parsed) ? parsed : 10;

    const result = await vscode.commands.executeCommand<CommandResult>(COMMANDS.aiAssignTasks, {
      projectId: projectId.trim(),
      persist: persistChoice.value,
      maxAssignments,
    } satisfies AssignTasksArgs);

    if (!result) {
      throw new Error("No result returned from AI assign command.");
    }
    if (!result.ok && "error" in result) {
      throw new Error(result.error);
    }

    const data = (result as CommandSuccess).data as {
      persistedCount?: number;
      assignments?: unknown[];
      notes?: string[];
    };

    output.show(true);
    output.appendLine(
      `[${COMMANDS.aiAssignTasksPrompt}] assignments=${Array.isArray(data.assignments) ? data.assignments.length : 0} persisted=${data.persistedCount ?? 0}`
    );
    vscode.window.showInformationMessage(
      `AI assign complete: ${Array.isArray(data.assignments) ? data.assignments.length : 0} proposed, ${data.persistedCount ?? 0} persisted.`
    );
    return ok(data);
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

  register(COMMANDS.demoHealthcheck, async (args: BackendSmokeTestArgs = {}) => {
    const out: Record<string, unknown> = {
      auth: false,
      project: false,
      github: false,
      messages: false,
      realtime: false,
    };

    const user = await authApi.getCurrentUser();
    if (!user?.id) {
      throw makeCommandError("AUTH_REQUIRED", "Authentication required.");
    }
    out.auth = true;
    out.userId = user.id;

    const resolved = await vscode.commands.executeCommand<CommandResult>(COMMANDS.resolveProjectForWorkspace, {
      fallbackName: "Copilot CoLab",
    } satisfies ResolveProjectForWorkspaceArgs);
    if (!resolved?.ok || !("data" in resolved)) {
      throw makeCommandError("PROJECT_RESOLVE_FAILED", "Could not resolve workspace project.");
    }
    const project = resolved.data as { id?: string; name?: string };
    const projectId = args.projectId ?? project.id;
    if (!projectId) {
      throw makeCommandError("PROJECT_REQUIRED", "No project id available.");
    }
    out.project = true;
    out.projectId = projectId;

    try {
      await githubApi.getRepositorySummary();
      out.github = true;
    } catch (error) {
      out.github = false;
      out.githubError = error instanceof Error ? error.message : String(error);
    }

    await vscode.commands.executeCommand(COMMANDS.sendMessage, {
      projectId,
      authorId: args.authorId ?? user.id,
      text: "[demo] backend healthcheck ping",
    } satisfies SendMessageArgs);
    const rows = await api.listMessagesByProject(projectId, 5);
    out.messages = rows.length > 0;
    out.recentMessages = rows.length;

    const channels = ensureProjectSubscribed(projectId);
    out.realtime = channels.length > 0;
    out.realtimeChannels = channels.length;

    output.appendLine(`[${COMMANDS.demoHealthcheck}] ${JSON.stringify(out)}`);
    return ok(out);
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
    const data = await api.createProject({
      name: args.name,
      createdBy: args.createdBy,
      repoFullName: args.repoFullName ?? null,
    });
    output.appendLine(`[${COMMANDS.createProject}] project=${data.id}`);
    return ok(data);
  });

  register(COMMANDS.resolveProjectForWorkspace, async (args: ResolveProjectForWorkspaceArgs = {}) => {
    const user = await authApi.getCurrentUser();
    if (!user?.id) {
      throw makeCommandError("AUTH_REQUIRED", "Authentication required.");
    }

    const repoFullName = githubApi.getRepository();
    if (repoFullName) {
      const existing = await api.findProjectByRepo(repoFullName);
      if (existing) {
        output.appendLine(`[${COMMANDS.resolveProjectForWorkspace}] resolved existing project=${existing.id} repo=${repoFullName}`);
        return ok(existing);
      }
    }

    const baseName = (repoFullName ?? args.fallbackName ?? user.email ?? "workspace")
      .split("/")
      .pop()
      ?.replace(/\.git$/i, "")
      ?.trim();
    const created = await api.createProject({
      name: baseName ? `${baseName} Workspace` : "Workspace",
      createdBy: user.id,
      repoFullName: repoFullName ?? null,
    });
    output.appendLine(`[${COMMANDS.resolveProjectForWorkspace}] created project=${created.id} repo=${repoFullName ?? "none"}`);
    return ok(created);
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

  register(COMMANDS.updateTaskAssignee, async (args: UpdateTaskAssigneeArgs) => {
    const data = await api.updateTaskAssignee(args.id, args.assigneeId);
    output.appendLine(`[${COMMANDS.updateTaskAssignee}] id=${args.id} assignee=${args.assigneeId ?? "unassigned"}`);
    return ok(data);
  });

  register(COMMANDS.listMessages, async (args: ListByProjectArgs) => {
    const data = await api.listMessagesByProject(args.projectId);
    return ok(data);
  });

  register(COMMANDS.subscribeStateMessages, async (args: ListByProjectArgs) => {
    assertUuid(args.projectId, "projectId");
    const messages = await api.listMessagesByProject(args.projectId, 100);
    const channels = ensureProjectSubscribed(args.projectId);
    return ok({
      projectId: args.projectId,
      messages,
      subscribed: channels.length > 0,
      channelCount: channels.length,
    });
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
    const channels = ensureProjectSubscribed(projectId);
    return ok({ projectId, channels: channels.length });
  });

  register(COMMANDS.unsubscribeProject, async (args: SubscribeProjectArgs) => {
    const channels = subscriptions.get(args.projectId) ?? [];
    await Promise.all(channels.map((channel) => realtimeApi.unsubscribe(channel)));
    subscriptions.delete(args.projectId);
    return ok({ projectId: args.projectId, unsubscribed: channels.length });
  });

  register(COMMANDS.realtimeHealth, async (args: RealtimeHealthArgs = {}) => {
    const projectId = args.projectId?.trim();
    if (projectId) {
      const channels = subscriptions.get(projectId) ?? [];
      return ok({
        projectId,
        subscribed: channels.length > 0,
        channels: channels.length,
      });
    }
    const summary = Array.from(subscriptions.entries()).map(([id, channels]) => ({
      projectId: id,
      channels: channels.length,
    }));
    return ok({
      projectCount: summary.length,
      subscriptions: summary,
    });
  });
}
