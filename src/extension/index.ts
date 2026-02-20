import * as vscode from "vscode";
import { registerCommands } from "./commands";

let panel: vscode.WebviewPanel | undefined;

export function activate(context: vscode.ExtensionContext): void {
  console.log("Copilot CoLab is now active!");

  // Register all commands
  registerCommands(context);

  // Register the webview view provider for the activity bar sidebar
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "copilot-colab.mainView",
      new CoLabWebviewProvider(context)
    )
  );
}

export function deactivate(): void {
  panel?.dispose();
}

// ── Webview Provider ─────────────────────────────────────────────────────────
class CoLabWebviewProvider implements vscode.WebviewViewProvider {
  constructor(private readonly context: vscode.ExtensionContext) {}

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, "dist"),
      ],
    };

    webviewView.webview.html = this.getHtml(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
      switch (message.command) {
        case "alert":
          vscode.window.showInformationMessage(message.text);
          break;
        case "openFile":
          if (message.path) {
            vscode.workspace.openTextDocument(message.path).then((doc) => {
              vscode.window.showTextDocument(doc);
            });
          }
          break;
      }
    });
  }

  private getHtml(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.js")
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.context.extensionUri, "dist", "webview.css")
    );

    const nonce = getNonce();

    return /* html */ `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none';
             style-src ${webview.cspSource} 'unsafe-inline' https://fonts.googleapis.com;
             font-src ${webview.cspSource} https://fonts.gstatic.com;
             script-src 'nonce-${nonce}';
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
  let text = "";
  const possible =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
