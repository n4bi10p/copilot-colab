
import React, { useState } from "react";
import { backendClient, BACKEND_COMMANDS } from "../utils/backendClient";
import { useStore } from "../../state/store";
import type { Task } from "../../types";

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
  const project = useStore((s) => s.project);
  const addToast = useStore((s) => s.addToast);
  const [prompt, setPrompt] = useState("Explain this code and suggest concrete improvements.");
  const [model, setModel] = useState("gpt-4.1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopilotResponse | null>(null);
  const [memberUserId, setMemberUserId] = useState("");
  const [memberRole, setMemberRole] = useState<"owner" | "member">("member");
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamResult, setTeamResult] = useState<string | null>(null);
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
  const [persist, setPersist] = useState(true);
  const addTask = useStore((s) => s.addTask);

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
    } catch (err: any) {
      let msg = "Copilot request failed.";
      if (err && typeof err.message === "string") {
        if (err.message.includes("401") || err.message.toLowerCase().includes("key")) {
          msg = "Invalid Gemini API key. Please check your .env configuration.";
        } else if (err.message.toLowerCase().includes("rate limit")) {
          msg = "Gemini API rate limit or quota exceeded. Try again later.";
        } else if (err.message.toLowerCase().includes("timeout")) {
          msg = "Network timeout. Please check your connection or try again.";
        } else {
          msg = err.message;
        }
      }
      setError(msg);
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

  const inviteMember = async () => {
    if (!project?.id) {
      setTeamError("No active project found.");
      return;
    }
    if (!memberUserId.trim()) {
      setTeamError("Member user UUID is required.");
      return;
    }
    setTeamLoading(true);
    setTeamError(null);
    setTeamResult(null);
    try {
      await backendClient.execute(BACKEND_COMMANDS.inviteMember, {
        projectId: project.id,
        userId: memberUserId.trim(),
        role: memberRole,
      });
      setTeamResult(`Member invited: ${memberUserId.trim()} (${memberRole})`);
      setMemberUserId("");
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to invite member.");
    } finally {
      setTeamLoading(false);
    }
  };

  const createStarterTasks = async () => {
    if (!project?.id) {
      setTeamError("No active project found.");
      return;
    }
    const starters = [
      "Integrate chat message list + send flow",
      "Hook realtime subscription for messages",
      "Render assistant messages with sender badges",
    ];
    setTeamLoading(true);
    setTeamError(null);
    setTeamResult(null);
    try {
      await Promise.all(
        starters.map((title) =>
          backendClient.execute(BACKEND_COMMANDS.createTask, {
            projectId: project.id,
            title,
            status: "backlog",
          })
        )
      );
      setTeamResult(`Created ${starters.length} starter tasks.`);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to create starter tasks.");
    } finally {
      setTeamLoading(false);
    }
  };

  const assignTasksWithGemini = async () => {
    if (!project?.id) {
      setTeamError("No active project found.");
      return;
    }
    setTeamLoading(true);
    setTeamError(null);
    setTeamResult(null);
    try {
      const data = await backendClient.assignTasks<{
        assignments?: Array<{ taskId: string; assigneeId: string }>;
        persistedCount?: number;
      }>({
        projectId: project.id,
        persist: true,
        maxAssignments: 10,
      });
      const proposed = Array.isArray(data.assignments) ? data.assignments.length : 0;
      setTeamResult(`Gemini assignment complete: proposed=${proposed}, persisted=${data.persistedCount ?? 0}`);
    } catch (err) {
      setTeamError(err instanceof Error ? err.message : "Failed to assign tasks with Gemini.");
    } finally {
      setTeamLoading(false);
    }
  };

  const createPr = async () => {
    if (!prTitle.trim() || !prHead.trim() || !prBase.trim()) {
      setRepoError("PR title, head, and base are required.");
      return;
    }
    // Branch name validation
    const branchRe = /^[a-zA-Z0-9._\-/]+$/;
    if (!branchRe.test(prHead.trim())) {
      setRepoError("Head branch contains invalid characters.");
      return;
    }
    if (!branchRe.test(prBase.trim())) {
      setRepoError("Base branch contains invalid characters.");
      return;
    }
    if (prHead.trim() === prBase.trim()) {
      setRepoError("Head and base branches must be different.");
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
      addToast({
        id: `pr-create-${Date.now()}`,
        type: "success",
        message: `PR #${pr.number} created: ${pr.title}`,
        link: pr.url ? { label: `View PR #${pr.number}`, url: pr.url } : undefined,
      });
      setPrTitle("");
      setPrHead("");
      setPrBase("main");
      setPrBody("");
      setGithubResult(null);
      await loadRepoSummary();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create PR.";
      setRepoError(msg);
      addToast({ id: `pr-err-${Date.now()}`, type: "error", message: msg });
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
      addToast({
        id: `pr-comment-${Date.now()}`,
        type: "success",
        message: `Comment posted on PR #${pullNumber}`,
        link: comment.url ? { label: "View comment", url: comment.url } : undefined,
      });
      setPrComment("");
      setGithubResult(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to comment on PR.";
      setRepoError(msg);
      addToast({ id: `comment-err-${Date.now()}`, type: "error", message: msg });
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
      const msg = `PR #${pullNumber}: ${result.message || (result.merged ? "merged successfully" : "not merged")}`;
      addToast({
        id: `pr-merge-${Date.now()}`,
        type: result.merged ? "success" : "error",
        message: msg,
      });
      setGithubResult(null);
      setPrNumberInput("");
      await loadRepoSummary();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to merge PR.";
      setRepoError(msg);
      addToast({ id: `merge-err-${Date.now()}`, type: "error", message: msg });
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
        <label className="flex items-center gap-2 text-xs font-mono text-text-dim">
          <input
            type="checkbox"
            checked={persist}
            onChange={() => setPersist((v) => !v)}
            className="accent-primary"
          />
          Persist generated tasks to board
        </label>
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
        <h3 className="text-[10px] font-mono tracking-editorial text-text-muted uppercase mb-2">Team Setup</h3>
        <p className="text-[11px] text-text-dim mb-2">
          Project: <span className="font-mono text-text-main">{project?.id ?? "not ready"}</span>
        </p>
        <div className="grid grid-cols-1 gap-2 mb-2">
          <input
            value={memberUserId}
            onChange={(e) => setMemberUserId(e.target.value)}
            placeholder="Member Email, Username, or UUID"
            className="w-full h-8 bg-white/5 border border-white/10 rounded-sm px-2.5 text-[11px] font-mono text-text-main outline-none focus:border-primary/50"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={memberRole}
              onChange={(e) => setMemberRole(e.target.value as "owner" | "member")}
              className="h-8 appearance-none bg-[#111113] border border-white/10 rounded-sm px-2.5 text-[11px] font-mono text-white outline-none focus:border-primary/50"
            >
              <option value="member">member</option>
              <option value="owner">owner</option>
            </select>
            <button
              onClick={inviteMember}
              disabled={teamLoading}
              className="h-8 border border-white/15 text-text-muted text-[11px] font-mono rounded-sm hover:text-white transition-colors disabled:opacity-50"
            >
              Invite Member
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={createStarterTasks}
              disabled={teamLoading}
              className="h-8 border border-white/15 text-text-muted text-[11px] font-mono rounded-sm hover:text-white transition-colors disabled:opacity-50"
            >
              Create Starter Tasks
            </button>
            <button
              onClick={assignTasksWithGemini}
              disabled={teamLoading}
              className="h-8 border border-primary/30 text-primary text-[11px] font-mono rounded-sm hover:bg-primary/10 transition-colors disabled:opacity-50"
            >
              Assign Tasks (Gemini)
            </button>
          </div>
        </div>
        {teamError && <p className="mt-2 text-[11px] font-mono text-red-400">{teamError}</p>}
        {teamResult && <p className="mt-2 text-[11px] font-mono text-emerald-400">{teamResult}</p>}
      </div>

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
