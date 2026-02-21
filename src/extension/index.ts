import * as vscode from "vscode";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createClient } from "@supabase/supabase-js";
import { CopilotColabAiApi } from "./api/ai";
import { CopilotColabAuthApi } from "./api/auth";
import { CopilotColabGithubApi } from "./api/github";
import { CopilotColabRealtimeApi } from "./api/realtime";
import { CopilotColabSupabaseApi } from "./api/supabase";
import { registerBackendCommands, registerCommands } from "./commands";

const OUTPUT_CHANNEL = "Copilot CoLab Backend";
const execFileAsync = promisify(execFile);

let panel: vscode.WebviewPanel | undefined;

function readEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.trim().length > 0 ? value : undefined;
}

function getSupabaseConfig(): { url: string; anonKey: string } | null {
  const url = readEnv("SUPABASE_URL");
  const anonKey = readEnv("SUPABASE_ANON_KEY");
  if (!url || !anonKey) {
    return null;
  }
  return { url, anonKey };
}

function parseGithubRepository(remoteUrl: string): string | null {
  const trimmed = remoteUrl.trim();

  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/i);
  if (sshMatch) {
    return `${sshMatch[1]}/${sshMatch[2]}`;
  }

  const httpsMatch = trimmed.match(/^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/i);
  if (httpsMatch) {
    return `${httpsMatch[1]}/${httpsMatch[2]}`;
  }

  const sshUrlMatch = trimmed.match(/^ssh:\/\/git@github\.com\/([^/]+)\/(.+?)(?:\.git)?$/i);
  if (sshUrlMatch) {
    return `${sshUrlMatch[1]}/${sshUrlMatch[2]}`;
  }

  return null;
}

async function detectWorkspaceGithubRepository(): Promise<string | null> {
  const folder = vscode.workspace.workspaceFolders?.[0];
  if (!folder) {
    return null;
  }

  try {
    const { stdout } = await execFileAsync("git", ["-C", folder.uri.fsPath, "remote", "get-url", "origin"]);
    return parseGithubRepository(stdout);
  } catch {
    return null;
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  console.log("Copilot CoLab is now active!");

  registerCommands(context);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider("copilot-colab.mainView", new CoLabWebviewProvider(context))
  );

  const output = vscode.window.createOutputChannel(OUTPUT_CHANNEL);
  context.subscriptions.push(output);

  const config = getSupabaseConfig();
  if (!config) {
    output.appendLine(
      "Supabase config missing. Set SUPABASE_URL and SUPABASE_ANON_KEY before using backend commands."
    );
    return;
  }

  const client = createClient(config.url, config.anonKey);
  const aiApi = new CopilotColabAiApi({
    apiKey: readEnv("GEMINI_API_KEY"),
    model: readEnv("GEMINI_MODEL"),
  });
  const authApi = new CopilotColabAuthApi(client);
  const detectedRepository = await detectWorkspaceGithubRepository();
  const envRepository = readEnv("GITHUB_REPOSITORY");
  const githubApi = new CopilotColabGithubApi({
    token: readEnv("GITHUB_TOKEN"),
    repository: detectedRepository ?? envRepository,
  });
  if (detectedRepository) {
    output.appendLine(`GitHub repository detected from workspace: ${detectedRepository}`);
  } else if (envRepository) {
    output.appendLine(`GitHub repository loaded from env: ${envRepository}`);
  } else {
    output.appendLine("GitHub repository not detected. Set GITHUB_REPOSITORY for GitHub context.");
  }
  const api = new CopilotColabSupabaseApi(client);
  const realtimeApi = new CopilotColabRealtimeApi(client);
  registerBackendCommands(context, { aiApi, authApi, githubApi, api, realtimeApi, output });
  output.appendLine("Copilot CoLab backend commands registered.");
}

export function deactivate(): void {
  panel?.dispose();
}

class CoLabWebviewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.context.extensionUri, "dist")],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      async (message: {
        command?: string;
        text?: string;
        path?: string;
        requestId?: string;
        commandId?: string;
        args?: unknown;
      }) => {
      switch (message.command) {
        case "alert":
          if (message.text) {
            vscode.window.showInformationMessage(message.text);
          }
          break;
        case "openFile":
          if (message.path) {
            vscode.workspace.openTextDocument(message.path).then((doc) => {
              vscode.window.showTextDocument(doc);
            });
          }
          break;
        case "backend.execute":
          if (!message.requestId || !message.commandId) {
            return;
          }
          try {
            const data = await vscode.commands.executeCommand(message.commandId, message.args);
            webviewView.webview.postMessage({
              type: "backend.response",
              requestId: message.requestId,
              ok: true,
              data,
            });
          } catch (error) {
            webviewView.webview.postMessage({
              type: "backend.response",
              requestId: message.requestId,
              ok: false,
              error: error instanceof Error ? error.message : String(error),
            });
          }
          break;
      }
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js"));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.css"));
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
             font-src ${webview.cspSource} https://fonts.gstatic.com;
             script-src ${webview.cspSource} 'nonce-${nonce}';
             img-src ${webview.cspSource} https: data:;" />
  <link rel="stylesheet" href="${styleUri}" />
  <title>Copilot CoLab</title>
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
