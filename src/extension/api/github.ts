export interface GithubContext {
  repository: string;
  commits: string[];
  pullRequests: string[];
}

interface GithubConfig {
  token?: string;
  repository?: string;
}

export class CopilotColabGithubApi {
  private readonly token?: string;
  private readonly repository?: string;

  constructor(config: GithubConfig) {
    this.token = config.token;
    this.repository = config.repository;
  }

  async getRecentContext(): Promise<GithubContext | null> {
    if (!this.token || !this.repository) {
      return null;
    }

    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${this.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };

    const [commitsRes, pullsRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${this.repository}/commits?per_page=5`, { headers }),
      fetch(`https://api.github.com/repos/${this.repository}/pulls?state=open&per_page=5`, { headers }),
    ]);

    if (!commitsRes.ok || !pullsRes.ok) {
      return null;
    }

    const commitsPayload = (await commitsRes.json()) as Array<{ commit?: { message?: string } }>;
    const pullsPayload = (await pullsRes.json()) as Array<{ title?: string }>;

    return {
      repository: this.repository,
      commits: commitsPayload.map((item) => String(item.commit?.message ?? "")).filter(Boolean).slice(0, 5),
      pullRequests: pullsPayload.map((item) => String(item.title ?? "")).filter(Boolean).slice(0, 5),
    };
  }
}
