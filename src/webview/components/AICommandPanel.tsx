import React, { useState } from "react";
import { backendClient } from "../utils/backendClient";

type CopilotResponse = {
  content: string;
  model: string;
  cliUrl: string | null;
};

type GithubRepoSummary = {
  repository: string;
  contributors: number;
  commitsLast30Days: number;
  openPullRequests: number;
  recentCommits: Array<{ sha: string; message: string; author: string; url: string }>;
  pulls: Array<{ number: number; title: string; author: string; url: string }>;
};

const MODEL_OPTIONS = ["gpt-4.1", "gpt-4o", "gpt-5"];

const AICommandPanel: React.FC = () => {
  const [prompt, setPrompt] = useState("Explain this code and suggest concrete improvements.");
  const [model, setModel] = useState("gpt-4.1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopilotResponse | null>(null);
  const [repoLoading, setRepoLoading] = useState(false);
  const [repoError, setRepoError] = useState<string | null>(null);
  const [repoSummary, setRepoSummary] = useState<GithubRepoSummary | null>(null);
  const [prTitle, setPrTitle] = useState("");
  const [prHead, setPrHead] = useState("");
  const [prBase, setPrBase] = useState("main");
  const [prBody, setPrBody] = useState("");
  const [prNumberInput, setPrNumberInput] = useState("");
  const [prComment, setPrComment] = useState("");
  const [githubResult, setGithubResult] = useState<string | null>(null);

  const openLink = (url: string) => {
    if (!url) return;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const runSuggestion = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await backendClient.suggestFromSelection<CopilotResponse>({
        prompt: prompt.trim(),
        model,
      });
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Copilot request failed.");
    } finally {
      setLoading(false);
    }
  };

  const loadRepoSummary = async () => {
    setRepoLoading(true);
    setRepoError(null);
    setGithubResult(null);
    try {
      const summary = await backendClient.getGithubRepoSummary<GithubRepoSummary>();
      setRepoSummary(summary);
    } catch (err) {
      setRepoError(err instanceof Error ? err.message : "Failed to load repository summary.");
    } finally {
      setRepoLoading(false);
    }
  };

  const createPr = async () => {
    if (!prTitle.trim() || !prHead.trim() || !prBase.trim()) {
      setRepoError("PR title, head, and base are required.");
      return;
    }
    setRepoLoading(true);
    setRepoError(null);
    try {
      const pr = await backendClient.createPullRequest<{
        number: number;
        title: string;
        url: string;
      }>({
        title: prTitle.trim(),
        head: prHead.trim(),
        base: prBase.trim(),
        body: prBody.trim() || undefined,
      });
      setGithubResult(`Created PR #${pr.number}: ${pr.title}`);
      await loadRepoSummary();
    } catch (err) {
      setRepoError(err instanceof Error ? err.message : "Failed to create PR.");
    } finally {
      setRepoLoading(false);
    }
  };

  const commentPr = async () => {
    const pullNumber = Number.parseInt(prNumberInput, 10);
    if (!Number.isFinite(pullNumber) || pullNumber <= 0 || !prComment.trim()) {
      setRepoError("Valid PR number and comment text are required.");
      return;
    }
    setRepoLoading(true);
    setRepoError(null);
    try {
      const comment = await backendClient.commentOnPullRequest<{ id: number; url: string }>({
        pullNumber,
        body: prComment.trim(),
      });
      setGithubResult(`Comment posted on PR #${pullNumber} (comment id ${comment.id}).`);
      setPrComment("");
    } catch (err) {
      setRepoError(err instanceof Error ? err.message : "Failed to comment on PR.");
    } finally {
      setRepoLoading(false);
    }
  };

  const mergePr = async () => {
    const pullNumber = Number.parseInt(prNumberInput, 10);
    if (!Number.isFinite(pullNumber) || pullNumber <= 0) {
      setRepoError("Valid PR number is required for merge.");
      return;
    }
    const confirmed = window.confirm(
      `Merge PR #${pullNumber} with squash strategy?\nThis action cannot be undone from this panel.`
    );
    if (!confirmed) return;
    setRepoLoading(true);
    setRepoError(null);
    try {
      const result = await backendClient.mergePullRequest<{ merged: boolean; message: string }>({
        pullNumber,
        method: "squash",
      });
      setGithubResult(`Merge PR #${pullNumber}: ${result.message || (result.merged ? "merged" : "not merged")}`);
      await loadRepoSummary();
    } catch (err) {
      setRepoError(err instanceof Error ? err.message : "Failed to merge PR.");
    } finally {
      setRepoLoading(false);
    }
  };

  return (
    <div className="bg-surface-dark border border-white/5 rounded-sm p-4">
      <div className="mb-3">
        <h2 className="text-xs font-mono tracking-editorial text-text-muted uppercase">Copilot SDK</h2>
        <p className="text-[11px] text-text-dim mt-1">
          Select code in editor, then run suggestion.
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full h-8 appearance-none bg-[#111113] border border-white/10 rounded-sm px-3 pr-8 text-xs font-mono text-white outline-none focus:border-primary/50"
          >
            {MODEL_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="pointer-events-none material-symbols-outlined text-[14px] text-text-dim absolute right-2 top-1/2 -translate-y-1/2">
            expand_more
          </span>
        </div>

        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={2}
          placeholder="Optional instruction for Copilot..."
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-xs font-mono text-text-main placeholder-text-dim outline-none focus:border-primary/50 resize-none"
        />

        <button
          onClick={runSuggestion}
          disabled={loading}
          className="w-full h-8 bg-primary/20 border border-primary/30 text-primary text-xs font-mono rounded-sm hover:bg-primary/30 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <span className="size-3 border border-primary/40 border-t-primary rounded-full animate-spin" />
              Running...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-[14px]">code</span>
              Suggest From Selection
            </>
          )}
        </button>
      </div>

      {error && <p className="mt-2 text-[11px] font-mono text-red-400">{error}</p>}

      {result && (
        <div className="mt-3 bg-white/[0.03] border border-white/5 rounded-sm p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] font-mono text-text-dim uppercase">Response</p>
            <span className="text-[10px] font-mono text-text-dim">
              {result.model}
              {result.cliUrl ? ` @ ${result.cliUrl}` : ""}
            </span>
          </div>
          <div className="min-h-40 max-h-[38vh] overflow-y-auto pr-1">
            <pre className="text-xs font-mono text-text-muted whitespace-pre-wrap break-words leading-relaxed">
              {result.content}
            </pre>
          </div>
        </div>
      )}

      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="text-[10px] font-mono tracking-editorial text-text-muted uppercase">GitHub Ops</h3>
          <button
            onClick={loadRepoSummary}
            disabled={repoLoading}
            className="h-7 px-2 rounded-sm border border-white/15 text-[10px] font-mono text-text-muted hover:text-white"
          >
            {repoLoading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {repoSummary && (
          <div className="mb-3 rounded-sm border border-white/5 bg-white/[0.03] p-2.5">
            <p className="text-[10px] font-mono text-text-dim mb-1">{repoSummary.repository}</p>
            <p className="text-[11px] text-text-muted">
              Contributors: <span className="text-text-main">{repoSummary.contributors}</span> | Commits(30d):{" "}
              <span className="text-text-main">{repoSummary.commitsLast30Days}</span> | Open PRs:{" "}
              <span className="text-text-main">{repoSummary.openPullRequests}</span>
            </p>
            <div className="mt-2 max-h-24 overflow-y-auto pr-1 space-y-1">
              {repoSummary.pulls.map((pr) => (
                <button
                  key={pr.number}
                  onClick={() => openLink(pr.url)}
                  className="w-full text-left text-[10px] font-mono text-text-dim hover:text-primary transition-colors"
                  title={`Open PR #${pr.number}`}
                >
                  #{pr.number} {pr.title}
                </button>
              ))}
            </div>
            <div className="mt-2 border-t border-white/5 pt-2 max-h-24 overflow-y-auto pr-1 space-y-1">
              {repoSummary.recentCommits.map((commit) => (
                <button
                  key={commit.sha + commit.url}
                  onClick={() => openLink(commit.url)}
                  className="w-full text-left text-[10px] font-mono text-text-dim hover:text-primary transition-colors"
                  title={`Open commit ${commit.sha}`}
                >
                  {commit.sha} {commit.message}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 mb-2">
          <input
            value={prTitle}
            onChange={(e) => setPrTitle(e.target.value)}
            placeholder="PR title"
            className="w-full h-8 bg-white/5 border border-white/10 rounded-sm px-2.5 text-[11px] font-mono text-text-main outline-none focus:border-primary/50"
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              value={prHead}
              onChange={(e) => setPrHead(e.target.value)}
              placeholder="head branch"
              className="w-full h-8 bg-white/5 border border-white/10 rounded-sm px-2.5 text-[11px] font-mono text-text-main outline-none focus:border-primary/50"
            />
            <input
              value={prBase}
              onChange={(e) => setPrBase(e.target.value)}
              placeholder="base branch"
              className="w-full h-8 bg-white/5 border border-white/10 rounded-sm px-2.5 text-[11px] font-mono text-text-main outline-none focus:border-primary/50"
            />
          </div>
          <textarea
            value={prBody}
            onChange={(e) => setPrBody(e.target.value)}
            rows={2}
            placeholder="PR description (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-sm px-2.5 py-1.5 text-[11px] font-mono text-text-main outline-none focus:border-primary/50 resize-none"
          />
          <button
            onClick={createPr}
            disabled={repoLoading}
            className="w-full h-8 bg-primary/20 border border-primary/30 text-primary text-[11px] font-mono rounded-sm hover:bg-primary/30 transition-colors disabled:opacity-50"
          >
            Create PR
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2">
          <input
            value={prNumberInput}
            onChange={(e) => setPrNumberInput(e.target.value)}
            placeholder="PR number"
            className="w-full h-8 bg-white/5 border border-white/10 rounded-sm px-2.5 text-[11px] font-mono text-text-main outline-none focus:border-primary/50"
          />
          <textarea
            value={prComment}
            onChange={(e) => setPrComment(e.target.value)}
            rows={2}
            placeholder="Comment text"
            className="w-full bg-white/5 border border-white/10 rounded-sm px-2.5 py-1.5 text-[11px] font-mono text-text-main outline-none focus:border-primary/50 resize-none"
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={commentPr}
              disabled={repoLoading}
              className="h-8 border border-white/15 text-text-muted text-[11px] font-mono rounded-sm hover:text-white transition-colors disabled:opacity-50"
            >
              Comment PR
            </button>
            <button
              onClick={mergePr}
              disabled={repoLoading}
              className="h-8 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono rounded-sm hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
            >
              Merge PR
            </button>
          </div>
        </div>

        {repoError && <p className="mt-2 text-[11px] font-mono text-red-400">{repoError}</p>}
        {githubResult && <p className="mt-2 text-[11px] font-mono text-emerald-400">{githubResult}</p>}
      </div>
    </div>
  );
};

export default AICommandPanel;
