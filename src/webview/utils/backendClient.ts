declare function acquireVsCodeApi<T = unknown>(): {
  postMessage: (message: unknown) => void;
  getState: () => T;
  setState: (state: T) => void;
};

type BackendResponseMessage = {
  type: "backend.response";
  requestId: string;
  ok: boolean;
  data?: unknown;
  error?: string;
};

type PendingRequest = {
  resolve: (value: any) => void;
  reject: (reason?: unknown) => void;
  timer: ReturnType<typeof setTimeout>;
};

export const BACKEND_COMMANDS = {
  authGetSession: "copilotColab.auth.getSession",
  authGetUser: "copilotColab.auth.getUser",
  authSignInPassword: "copilotColab.auth.signInWithPassword",
  authSignUpPassword: "copilotColab.auth.signUpWithPassword",
  authSignOut: "copilotColab.auth.signOut",
  aiGenerateWbs: "copilotColab.ai.generateWbs",
  aiSuggestFromSelection: "copilotColab.ai.suggestFromSelection",
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

export class BackendClient {
  private readonly vscode =
    typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
  private readonly pending = new Map<string, PendingRequest>();
  private readonly defaultTimeoutMs = 12_000;

  constructor() {
    window.addEventListener("message", (event: MessageEvent) => {
      const message = event.data as BackendResponseMessage | undefined;
      if (!message || message.type !== "backend.response") {
        return;
      }

      const entry = this.pending.get(message.requestId);
      if (!entry) {
        return;
      }

      clearTimeout(entry.timer);
      this.pending.delete(message.requestId);

      if (message.ok) {
        // Extension commands wrap results with ok(data) → { ok: true, data: X }.
        // Unwrap that envelope so callers receive X directly and reject when command-level ok=false.
        const payload = message.data as any;
        if (
          payload !== null &&
          typeof payload === "object" &&
          Object.prototype.hasOwnProperty.call(payload, "ok")
        ) {
          if (payload.ok === true && Object.prototype.hasOwnProperty.call(payload, "data")) {
            entry.resolve(payload.data);
          } else {
            entry.reject(new Error(String(payload.error ?? "Unknown backend command error")));
          }
        } else {
          entry.resolve(payload);
        }
      } else {
        entry.reject(new Error(message.error ?? "Unknown backend error"));
      }
    });
  }

  async execute<T = unknown>(
    commandId: string,
    args?: unknown,
    timeoutMs = this.defaultTimeoutMs
  ): Promise<T> {
    if (!this.vscode) {
      throw new Error("VS Code API is not available in this webview context.");
    }
    const vscodeApi = this.vscode;

    const requestId = this.makeRequestId();

    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`Backend request timed out for command: ${commandId}`));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timer });

      vscodeApi.postMessage({
        command: "backend.execute",
        requestId,
        commandId,
        args,
      });
    });
  }

  getSession<T = unknown>(): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.authGetSession);
  }

  getUser<T = unknown>(): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.authGetUser);
  }

  signInWithPassword<T = unknown>(email: string, password: string): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.authSignInPassword, { email, password });
  }

  signUpWithPassword<T = unknown>(email: string, password: string): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.authSignUpPassword, { email, password });
  }

  signOut<T = unknown>(): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.authSignOut);
  }

  generateWbs<T = unknown>(args: {
    projectId: string;
    goal: string;
    constraints?: string[];
    maxTasks?: number;
    persist?: boolean;
  }): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.aiGenerateWbs, args, 20_000);
  }

  suggestFromSelection<T = unknown>(args?: {
    prompt?: string;
    model?: string;
    cliUrl?: string;
  }): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.aiSuggestFromSelection, args, 20_000);
  }

  getGithubRepoSummary<T = unknown>(): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.githubRepoSummary, undefined, 20_000);
  }

  listOpenPullRequests<T = unknown>(): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.githubListOpenPrs, undefined, 20_000);
  }

  createPullRequest<T = unknown>(args: {
    title: string;
    head: string;
    base: string;
    body?: string;
  }): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.githubCreatePr, args, 20_000);
  }

  commentOnPullRequest<T = unknown>(args: { pullNumber: number; body: string }): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.githubCommentPr, args, 20_000);
  }

  mergePullRequest<T = unknown>(args: {
    pullNumber: number;
    method?: "merge" | "squash" | "rebase";
    commitTitle?: string;
  }): Promise<T> {
    return this.execute<T>(BACKEND_COMMANDS.githubMergePr, args, 20_000);
  }

  private makeRequestId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `req_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  }
}

export const backendClient = new BackendClient();
