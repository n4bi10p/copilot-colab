interface CopilotClientOptions {
  cliUrl?: string;
}

interface SuggestInput {
  prompt: string;
  model: string;
  cliUrl?: string;
}

interface SuggestOutput {
  content: string;
  model: string;
  cliUrl: string | null;
}

interface CopilotModule {
  CopilotClient: new (options?: CopilotClientOptions) => {
    start: () => Promise<void>;
    stop: () => Promise<unknown>;
    createSession: (config?: { model?: string }) => Promise<{
      sendAndWait: (options: { prompt: string }) => Promise<{ data?: { content?: string } } | undefined>;
      destroy?: () => Promise<void>;
    }>;
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function ensureText(value: unknown): string {
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "";
}

export class CopilotSdkApi {
  constructor(
    private readonly config: {
      defaultModel?: string;
      defaultCliUrl?: string;
    }
  ) {}

  async suggestFromSelection(input: SuggestInput): Promise<SuggestOutput> {
    const mod = await this.loadSdkModule();
    const cliUrl = input.cliUrl ?? this.config.defaultCliUrl;
    const model = input.model || this.config.defaultModel || "gpt-4.1";
    const client = new mod.CopilotClient(cliUrl ? { cliUrl } : undefined);

    try {
      await client.start();
      const session = await client.createSession({ model });
      const response = await session.sendAndWait({ prompt: input.prompt });
      await session.destroy?.();

      const content = ensureText(response?.data?.content);
      if (!content) {
        throw new Error("Copilot SDK returned an empty response.");
      }

      return { content, model, cliUrl: cliUrl ?? null };
    } catch (error) {
      throw new Error(`Copilot SDK failed: ${toErrorMessage(error)}`);
    } finally {
      await client.stop().catch(() => undefined);
    }
  }

  private async loadSdkModule(): Promise<CopilotModule> {
    try {
      const specifier = "@github/" + "copilot-sdk";
      const importer = new Function("s", "return import(s)") as (s: string) => Promise<unknown>;
      return (await importer(specifier)) as CopilotModule;
    } catch {
      throw new Error(
        "Missing dependency '@github/copilot-sdk'. Install it and ensure Copilot CLI is authenticated."
      );
    }
  }
}
