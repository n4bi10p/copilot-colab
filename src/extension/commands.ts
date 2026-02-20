import * as vscode from "vscode";

export function registerCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("copilot-colab.openDashboard", () => {
      vscode.commands.executeCommand(
        "workbench.view.extension.copilot-colab"
      );
    })
  );
}
