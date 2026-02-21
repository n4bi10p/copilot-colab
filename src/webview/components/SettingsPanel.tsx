import React, { useState, useEffect } from "react";
import { useStore } from "../../state/store";
import { backendClient, BACKEND_COMMANDS } from "../utils/backendClient";

/* ── Section wrapper ──────────────────────────────────────────────────────── */
const Section: React.FC<{
  icon: string;
  title: string;
  children: React.ReactNode;
}> = ({ icon, title, children }) => (
  <div className="bg-[#18181b] border border-white/6 rounded-sm overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-white/5">
      <span className="material-symbols-outlined text-[18px] text-text-muted">{icon}</span>
      <h2 className="text-sm font-semibold text-white tracking-tight">{title}</h2>
    </div>
    <div className="px-5 py-4 space-y-4">{children}</div>
  </div>
);

/* ── Field row ────────────────────────────────────────────────────────────── */
const Field: React.FC<{
  label: string;
  hint?: string;
  children: React.ReactNode;
}> = ({ label, hint, children }) => (
  <div className="flex items-start justify-between gap-6">
    <div className="min-w-0">
      <p className="text-sm text-text-main">{label}</p>
      {hint && <p className="text-[11px] text-text-dim mt-0.5 leading-relaxed">{hint}</p>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

/* ── Toggle switch ────────────────────────────────────────────────────────── */
const Toggle: React.FC<{
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors
      ${checked ? "bg-primary" : "bg-white/10"}
      ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`inline-block size-3.5 rounded-full bg-white shadow transform transition-transform
        ${checked ? "translate-x-[18px]" : "translate-x-[3px]"}`}
    />
  </button>
);

/* ── Status dot ───────────────────────────────────────────────────────────── */
const StatusDot: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <div className="flex items-center gap-2">
    <span className={`size-2 rounded-full ${ok ? "bg-emerald-400" : "bg-red-400"}`} />
    <span className={`text-xs font-mono ${ok ? "text-emerald-400" : "text-red-400"}`}>{label}</span>
  </div>
);

/* ── Preferences (persisted in localStorage) ──────────────────────────────── */
const PREFS_KEY = "copilot-colab.settings";
interface Prefs {
  theme: "dark" | "system";
  notifyToasts: boolean;
  notifySound: boolean;
  toastDuration: number; // seconds
  geminiModel: string;
}
const DEFAULT_PREFS: Prefs = {
  theme: "dark",
  notifyToasts: true,
  notifySound: false,
  toastDuration: 5,
  geminiModel: "gemini-2.5-flash",
};

function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: Prefs): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/* ── Gemini model options ─────────────────────────────────────────────────── */
const GEMINI_MODELS = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash", desc: "Fast, cost-effective" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro", desc: "Best quality" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash", desc: "Previous gen, fast" },
];

/* ══════════════════════════════════════════════════════════════════════════ */
const SettingsPanel: React.FC = () => {
  const currentUser = useStore((s) => s.currentUser);
  const project = useStore((s) => s.project);
  const members = useStore((s) => s.members);
  const addToast = useStore((s) => s.addToast);

  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [githubStatus, setGithubStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [githubRepo, setGithubRepo] = useState<string | null>(null);

  // Check GitHub connection on mount
  useEffect(() => {
    backendClient
      .execute<{ name: string; full_name: string; default_branch: string }>(
        BACKEND_COMMANDS.githubRepoSummary
      )
      .then((res) => {
        setGithubStatus("connected");
        setGithubRepo(res?.full_name ?? null);
      })
      .catch(() => {
        setGithubStatus("disconnected");
      });
  }, []);

  const updatePref = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
    if (key === "geminiModel") {
      addToast({ id: Date.now().toString(), type: "info", message: `AI model switched to ${value}` });
    }
  };

  const memberCount = members.length;
  const roleLabel = project ? "Owner" : "Member";

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-[#111113]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#111113]/90 backdrop-blur-md border-b border-white/5 px-8 py-5">
        <h1 className="text-lg font-semibold text-white tracking-tight flex items-center gap-2">
          <span className="material-symbols-outlined text-[22px] text-text-muted">settings</span>
          Settings
        </h1>
        <p className="text-xs text-text-dim mt-1">Manage your account, preferences, and connections</p>
      </div>

      <div className="max-w-2xl mx-auto px-8 py-6 space-y-5">
        {/* ── Account ──────────────────────────────────────────────────────── */}
        <Section icon="person" title="Account">
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary font-mono">
                {currentUser?.displayName?.charAt(0).toUpperCase() ??
                  currentUser?.email?.charAt(0).toUpperCase() ?? "?"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">
                {currentUser?.displayName || "No display name"}
              </p>
              <p className="text-xs text-text-dim font-mono truncate">{currentUser?.email}</p>
            </div>
            <span className="px-2 py-0.5 rounded-sm border border-white/10 bg-white/5 text-[10px] font-mono text-text-muted uppercase">
              {roleLabel}
            </span>
          </div>

          {project && (
            <div className="mt-2 pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-dim">Project</span>
                <span className="text-xs text-text-muted font-mono truncate max-w-[200px]">{project.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-dim">Project ID</span>
                <span className="text-[10px] text-text-dim font-mono truncate max-w-[200px]">{project.id}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-dim">Team members</span>
                <span className="text-xs text-text-muted font-mono">{memberCount}</span>
              </div>
            </div>
          )}
        </Section>

        {/* ── GitHub Connection ─────────────────────────────────────────────── */}
        <Section icon="link" title="GitHub Connection">
          <Field label="Repository" hint="Auto-detected from your workspace's Git origin">
            {githubStatus === "checking" ? (
              <span className="size-4 border-2 border-white/20 border-t-primary rounded-full animate-spin" />
            ) : githubStatus === "connected" ? (
              <StatusDot ok label={githubRepo ?? "Connected"} />
            ) : (
              <StatusDot ok={false} label="Not connected" />
            )}
          </Field>

          {githubStatus === "connected" && githubRepo && (
            <Field label="View on GitHub">
              <a
                href={`https://github.com/${githubRepo}`}
                className="text-xs text-primary hover:text-primary/80 font-mono flex items-center gap-1 transition-colors"
              >
                {githubRepo}
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </Field>
          )}

          {githubStatus === "disconnected" && (
            <div className="flex items-start gap-2.5 p-3 rounded-sm bg-yellow-500/10 border border-yellow-500/20">
              <span className="material-symbols-outlined text-yellow-500 text-[16px] shrink-0 mt-0.5">warning</span>
              <p className="text-[11px] text-text-muted leading-relaxed">
                No GitHub connection detected. Ensure a <code className="text-accent-warm">GITHUB_TOKEN</code> is set in your <code className="text-accent-warm">.env</code> file, or the workspace is inside a Git repository.
              </p>
            </div>
          )}
        </Section>

        {/* ── AI / Gemini ──────────────────────────────────────────────────── */}
        <Section icon="auto_awesome" title="AI Model">
          <Field label="Gemini Model" hint="Model used for WBS generation, chat @gemini replies, and code analysis">
            <select
              value={prefs.geminiModel}
              onChange={(e) => updatePref("geminiModel", e.target.value)}
              className="bg-[#0c0c0e] border border-white/10 rounded-sm px-3 py-1.5 text-xs font-mono text-text-main focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
            >
              {GEMINI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>
          <p className="text-[10px] text-text-dim">
            {GEMINI_MODELS.find((m) => m.value === prefs.geminiModel)?.desc ?? ""}
          </p>
        </Section>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <Section icon="notifications" title="Notifications">
          <Field label="Toast notifications" hint="Show pop-up alerts for actions like PR creation and errors">
            <Toggle checked={prefs.notifyToasts} onChange={(v) => updatePref("notifyToasts", v)} />
          </Field>

          <Field label="Notification sound" hint="Play a subtle sound for incoming messages">
            <Toggle checked={prefs.notifySound} onChange={(v) => updatePref("notifySound", v)} />
          </Field>

          <Field label="Toast duration" hint="How long toast notifications stay visible">
            <div className="flex items-center gap-2">
              <select
                value={prefs.toastDuration}
                onChange={(e) => updatePref("toastDuration", Number(e.target.value))}
                className="bg-[#0c0c0e] border border-white/10 rounded-sm px-2.5 py-1.5 text-xs font-mono text-text-main focus:border-primary/50 focus:outline-none transition-colors cursor-pointer"
              >
                <option value={3}>3s</option>
                <option value={5}>5s</option>
                <option value={8}>8s</option>
                <option value={10}>10s</option>
              </select>
            </div>
          </Field>
        </Section>

        {/* ── Appearance ───────────────────────────────────────────────────── */}
        <Section icon="palette" title="Appearance">
          <Field label="Theme" hint="Controls the extension's color scheme">
            <div className="flex gap-1.5">
              {(["dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updatePref("theme", t)}
                  className={`px-3 py-1.5 rounded-sm text-xs font-mono border transition-colors
                    ${prefs.theme === t
                      ? "border-primary/50 bg-primary/10 text-primary"
                      : "border-white/10 bg-white/5 text-text-muted hover:text-white hover:border-white/20"
                    }`}
                >
                  {t === "dark" ? "Dark" : "System"}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        {/* ── About ────────────────────────────────────────────────────────── */}
        <Section icon="info" title="About">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-dim">Extension</span>
              <span className="text-xs text-text-muted font-mono">Copilot CoLab</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-dim">Version</span>
              <span className="text-xs text-text-muted font-mono">0.1.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-dim">Publisher</span>
              <span className="text-xs text-text-muted font-mono">n4bi10p</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-dim">Engine</span>
              <span className="text-xs text-text-muted font-mono">VS Code ^1.90.0</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-text-dim">Source</span>
              <a
                href="https://github.com/n4bi10p/copilot-colab"
                className="text-xs text-primary hover:text-primary/80 font-mono flex items-center gap-1 transition-colors"
              >
                GitHub
                <span className="material-symbols-outlined text-[12px]">open_in_new</span>
              </a>
            </div>
          </div>
        </Section>

        {/* Bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
};

export default SettingsPanel;
