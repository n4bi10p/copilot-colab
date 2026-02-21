import type { Message, Task } from "../../types/backend";

export interface WbsTaskSuggestion {
  title: string;
  status: "backlog" | "in_progress" | "done";
  reason?: string;
  suggestedAssignee?: string;
}

export interface GenerateWbsInput {
  projectId: string;
  goal: string;
  constraints?: string[];
  maxTasks?: number;
  existingTasks?: Task[];
  recentMessages?: Message[];
  memberCount?: number;
  github?: {
    repository: string;
    commits: string[];
    pullRequests: string[];
  } | null;
}

export interface GenerateWbsOutput {
  tasks: WbsTaskSuggestion[];
  notes: string[];
  model: string;
}

interface AiConfig {
  apiKey?: string;
  model?: string;
}

function stripCodeFence(value: string): string {
  const trimmed = value.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function extractJsonObject(value: string): string {
  const stripped = stripCodeFence(value);
  const first = stripped.indexOf("{");
  const last = stripped.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) {
    throw new Error("AI response did not include a JSON object.");
  }
  return stripped.slice(first, last + 1);
}

function toTaskSuggestion(raw: unknown): WbsTaskSuggestion | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const row = raw as Record<string, unknown>;
  const title = String(row.title ?? "").trim();
  if (!title) {
    return null;
  }

  const statusRaw = String(row.status ?? "backlog");
  const status: WbsTaskSuggestion["status"] =
    statusRaw === "in_progress" || statusRaw === "done" ? statusRaw : "backlog";

  const reason = row.reason ? String(row.reason) : undefined;
  const suggestedAssignee = row.suggestedAssignee ? String(row.suggestedAssignee) : undefined;

  return { title, status, reason, suggestedAssignee };
}

export class CopilotColabAiApi {
  private readonly apiKey?: string;
  private readonly model: string;

  constructor(config: AiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? "gemini-1.5-flash";
  }

  async generateWbs(input: GenerateWbsInput): Promise<GenerateWbsOutput> {
    if (!this.apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Set it in your extension launch environment.");
    }

    const maxTasks = Math.max(3, Math.min(input.maxTasks ?? 10, 25));
    const endpoint =
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent` +
      `?key=${encodeURIComponent(this.apiKey)}`;

    const prompt = this.buildPrompt({ ...input, maxTasks });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Gemini API request failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini returned an empty response.");
    }

    const jsonText = extractJsonObject(text);
    const parsed = JSON.parse(jsonText) as { tasks?: unknown[]; notes?: unknown[] };
    const tasks = (parsed.tasks ?? []).map(toTaskSuggestion).filter((task): task is WbsTaskSuggestion => Boolean(task));
    if (tasks.length === 0) {
      throw new Error("Gemini returned no valid tasks.");
    }

    const notes = Array.isArray(parsed.notes) ? parsed.notes.map((item) => String(item)) : [];

    return {
      tasks: tasks.slice(0, maxTasks),
      notes,
      model: this.model,
    };
  }

  private buildPrompt(input: Required<Pick<GenerateWbsInput, "projectId" | "goal" | "maxTasks">> &
    Omit<GenerateWbsInput, "projectId" | "goal" | "maxTasks">): string {
    const existingTaskTitles = (input.existingTasks ?? []).slice(0, 20).map((task) => `- ${task.title}`).join("\n");
    const recentChat = (input.recentMessages ?? [])
      .slice(0, 10)
      .map((message) => `- ${message.text}`)
      .join("\n");
    const constraints = (input.constraints ?? []).map((c) => `- ${c}`).join("\n");
    const commits = (input.github?.commits ?? []).map((item) => `- ${item}`).join("\n");
    const pulls = (input.github?.pullRequests ?? []).map((item) => `- ${item}`).join("\n");

    return [
      "You are an engineering project planner.",
      `Create a work-breakdown structure for project ${input.projectId}.`,
      `Goal: ${input.goal}`,
      `Task count target: ${input.maxTasks}`,
      `Team size: ${input.memberCount ?? 0}`,
      "",
      "Existing tasks (avoid duplicates):",
      existingTaskTitles || "- none",
      "",
      "Recent team chat context:",
      recentChat || "- none",
      "",
      "Constraints:",
      constraints || "- none",
      "",
      `GitHub repository: ${input.github?.repository ?? "none"}`,
      "Recent commits:",
      commits || "- none",
      "Open pull requests:",
      pulls || "- none",
      "",
      "Output ONLY valid JSON with this shape:",
      '{"tasks":[{"title":"string","status":"backlog","reason":"string","suggestedAssignee":"string"}],"notes":["string"]}',
      "Rules:",
      "- Use status backlog for new tasks unless there is a strong reason to mark in_progress.",
      "- Keep titles concise and actionable.",
      "- No markdown, no code block, no extra keys.",
    ].join("\n");
  }
}
