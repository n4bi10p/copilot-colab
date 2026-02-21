import * as vscode from "vscode";

const STORAGE_PREFIX = "copilot-colab.supabase.auth.";

function makeStorageKey(key: string): string {
  return `${STORAGE_PREFIX}${encodeURIComponent(key)}`;
}

export class VscodeSecretStorageAdapter {
  constructor(private readonly secrets: vscode.SecretStorage) {}

  async getItem(key: string): Promise<string | null> {
    const value = await this.secrets.get(makeStorageKey(key));
    return value ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    await this.secrets.store(makeStorageKey(key), value);
  }

  async removeItem(key: string): Promise<void> {
    await this.secrets.delete(makeStorageKey(key));
  }
}
