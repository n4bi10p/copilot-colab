export interface GithubContext {
  repository: string;
  commits: string[];
  pullRequests: string[];
}

export interface GithubPullRequest {
  number: number;
  title: string;
  state: string;
  author: string;
  url: string;
}

export interface GithubRepositorySummary {
  repository: string;
  contributors: number;
  commitsLast30Days: number;
  openPullRequests: number;
  recentCommits: Array<{ sha: string; message: string; author: string; url: string }>;
  pulls: GithubPullRequest[];
}

export interface CreatePullRequestInput {
  title: string;
  head: string;
  base: string;
  body?: string;
}

interface GithubConfig {
  token?: string;
  repository?: string;
}

export class CopilotColabGithubApi {
  private readonly token?: string;
  private repository?: string;

  constructor(config: GithubConfig) {
    this.token = config.token;
    this.repository = config.repository;
  }

  setRepository(repository?: string): void {
    this.repository = repository;
  }

  getRepository(): string | null {
    return this.repository?.trim() || null;
  }

  private ensureConfigured(): { repository: string; headers: Record<string, string> } {
    if (!this.token || !this.repository) {
      throw new Error("GitHub is not configured. Set GITHUB_TOKEN and repository context.");
    }

    return {
      repository: this.repository,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${this.token}`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };
  }

  private async request<T>(url: string, init: RequestInit): Promise<T> {
    const response = await fetch(url, init);
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GitHub API ${response.status}: ${body}`);
    }
    return (await response.json()) as T;
  }

  private mapPr(
    raw: Array<{ number?: number; title?: string; state?: string; html_url?: string; user?: { login?: string } }>
  ): GithubPullRequest[] {
    return raw.map((item) => ({
      number: Number(item.number ?? 0),
      title: String(item.title ?? ""),
      state: String(item.state ?? "open"),
      author: String(item.user?.login ?? "unknown"),
      url: String(item.html_url ?? ""),
    }));
  }

  async getRepositorySummary(): Promise<GithubRepositorySummary> {
    const { repository, headers } = this.ensureConfigured();
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [contributors, commits, pulls] = await Promise.all([
      this.request<Array<{ login?: string }>>(
        `https://api.github.com/repos/${repository}/contributors?per_page=100&anon=true`,
        { headers }
      ),
      this.request<
        Array<{ sha?: string; html_url?: string; commit?: { message?: string; author?: { name?: string } } }>
      >(
        `https://api.github.com/repos/${repository}/commits?since=${encodeURIComponent(since)}&per_page=100`,
        { headers }
      ),
      this.request<Array<{ number?: number; title?: string; state?: string; html_url?: string; user?: { login?: string } }>>(
        `https://api.github.com/repos/${repository}/pulls?state=open&per_page=20`,
        { headers }
      ),
    ]);

    const mappedPulls = this.mapPr(pulls);
    const recentCommits = commits.slice(0, 10).map((item) => ({
      sha: String(item.sha ?? "").slice(0, 7),
      message: String(item.commit?.message ?? "").split("\n")[0],
      author: String(item.commit?.author?.name ?? "unknown"),
      url: String(item.html_url ?? ""),
    }));
    return {
      repository,
      contributors: contributors.length,
      commitsLast30Days: commits.length,
      openPullRequests: mappedPulls.length,
      recentCommits,
      pulls: mappedPulls,
    };
  }

  async listOpenPullRequests(): Promise<GithubPullRequest[]> {
    const { repository, headers } = this.ensureConfigured();
    const pulls = await this.request<
      Array<{ number?: number; title?: string; state?: string; html_url?: string; user?: { login?: string } }>
    >(`https://api.github.com/repos/${repository}/pulls?state=open&per_page=30`, { headers });
    return this.mapPr(pulls);
  }

  async createPullRequest(input: CreatePullRequestInput): Promise<GithubPullRequest> {
    const { repository, headers } = this.ensureConfigured();
    const pr = await this.request<{
      number?: number;
      title?: string;
      state?: string;
      html_url?: string;
      user?: { login?: string };
    }>(`https://api.github.com/repos/${repository}/pulls`, {
      method: "POST",
      headers: {
        ...headers,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: input.title,
        head: input.head,
        base: input.base,
        body: input.body ?? "",
      }),
    });

    return {
      number: Number(pr.number ?? 0),
      title: String(pr.title ?? ""),
      state: String(pr.state ?? "open"),
      author: String(pr.user?.login ?? "unknown"),
      url: String(pr.html_url ?? ""),
    };
  }

  async commentOnPullRequest(pullNumber: number, body: string): Promise<{ id: number; url: string }> {
    const { repository, headers } = this.ensureConfigured();
    const comment = await this.request<{ id?: number; html_url?: string }>(
      `https://api.github.com/repos/${repository}/issues/${pullNumber}/comments`,
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body }),
      }
    );
    return {
      id: Number(comment.id ?? 0),
      url: String(comment.html_url ?? ""),
    };
  }

  async mergePullRequest(
    pullNumber: number,
    mergeMethod: "merge" | "squash" | "rebase" = "squash",
    commitTitle?: string
  ): Promise<{ merged: boolean; message: string }> {
    const { repository, headers } = this.ensureConfigured();
    const result = await this.request<{ merged?: boolean; message?: string }>(
      `https://api.github.com/repos/${repository}/pulls/${pullNumber}/merge`,
      {
        method: "PUT",
        headers: {
          ...headers,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          merge_method: mergeMethod,
          commit_title: commitTitle,
        }),
      }
    );
    return {
      merged: Boolean(result.merged),
      message: String(result.message ?? ""),
    };
  }

  async getRecentContext(): Promise<GithubContext | null> {
    if (!this.token || !this.repository) {
      return null;
    }

    try {
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
    } catch {
      return null;
    }
  }
}
