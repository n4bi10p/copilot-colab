import React, { useState, useEffect } from "react";
import { useStore } from "../../state/store";
import { updateTaskStatus, updateTaskAssignee } from "../hooks/useTasks";
import { LoadingState, EmptyState } from "./StatusState";
import { backendClient, BACKEND_COMMANDS } from "../utils/backendClient";
import type { Task, TaskStatus, ProjectMember } from "../../types";

const STATUSES: { value: TaskStatus | "all"; label: string; color: string }[] = [
  { value: "all", label: "All Tasks", color: "text-text-muted" },
  { value: "backlog", label: "Backlog", color: "text-text-muted" },
  { value: "in_progress", label: "In Progress", color: "text-blue-400" },
  { value: "done", label: "Done", color: "text-emerald-400" },
];

const ALL_TAGS = ["backend", "infra", "perf", "maint", "frontend", "high-priority"];

const StatusBadge: React.FC<{ status: TaskStatus }> = ({ status }) => {
  const map: Record<TaskStatus, string> = {
    backlog: "text-text-muted border-white/10 bg-white/5",
    in_progress: "text-blue-400 border-blue-400/20 bg-blue-400/10",
    done: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10",
  };
  return (
    <span className={`px-2 py-0.5 rounded-sm border text-[10px] font-mono uppercase ${map[status]}`}>
      {status}
    </span>
  );
};

const TaskRow: React.FC<{
  task: Task;
  selected: boolean;
  assigneeLabel?: string;
  onClick: () => void;
}> = ({ task, selected, assigneeLabel, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-4 px-5 py-3.5 border-b border-white/5 cursor-pointer transition-colors group
      ${selected ? "bg-white/[0.04] border-l-2 border-l-primary" : "hover:bg-white/[0.02]"}`}
  >
    <span className="text-xs font-mono text-text-dim w-20 shrink-0">{task.id}</span>
    <span
      className={`flex-1 text-sm font-medium leading-snug truncate
        ${task.status === "done" ? "text-text-dim line-through" : "text-text-main group-hover:text-white"}`}
    >
      {task.hasConflict && (
        <span className="material-symbols-outlined text-[12px] text-accent-warm mr-1 align-middle">warning</span>
      )}
      {task.title}
    </span>
    <div className="flex items-center gap-2 shrink-0">
      {task.tags?.slice(0, 2).map((tag) => (
        <span key={tag} className="px-1.5 py-0.5 rounded-sm border border-white/10 bg-white/5 text-[10px] font-mono text-text-dim hidden sm:inline">
          {tag}
        </span>
      ))}
      {assigneeLabel && (
        <span
          className="px-1.5 py-0.5 rounded-sm bg-primary/10 text-[10px] font-mono text-primary border border-primary/20"
          title={assigneeLabel}
        >
          {assigneeLabel}
        </span>
      )}
      <StatusBadge status={task.status} />
    </div>
  </div>
);

const TaskDetail: React.FC<{ task: Task }> = ({ task }) => {
  const { updateTask, moveTask } = useStore();
  const project = useStore((s) => s.project);
  const currentUser = useStore((s) => s.currentUser);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [githubContributors, setGithubContributors] = useState<string[]>([]);

  useEffect(() => {
    if (!project?.id) return;
    let mounted = true;
    backendClient.listMembers<ProjectMember[]>(project.id).then((list) => {
      if (mounted) setMembers(list);
    }).catch(() => {
      // ignore error
    });

    backendClient.getGithubRepoSummary<{ recentCommits: { author: string }[] }>().then((summary) => {
      if (mounted && summary?.recentCommits) {
        setGithubContributors([...new Set(summary.recentCommits.map((c) => c.author))]);
      }
    }).catch(() => {});

    return () => { mounted = false; };
  }, [project?.id]);

  const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
    backlog: "in_progress",
    in_progress: "done",
    done: null,
  };
  const next = NEXT_STATUS[task.status];

  return (
    <div className="flex flex-col h-full p-8 overflow-y-auto">
      {/* ID + Status */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs font-mono text-text-dim">{task.id}</span>
        <StatusBadge status={task.status} />
      </div>

      {/* Title */}
      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => {
            updateTask(task.id, { title });
            setEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") { updateTask(task.id, { title }); setEditing(false); }
            if (e.key === "Escape") { setTitle(task.title); setEditing(false); }
          }}
          className="w-full bg-transparent border-b border-primary/50 text-xl font-semibold text-white outline-none pb-1 mb-6"
        />
      ) : (
        <h2
          onClick={() => setEditing(true)}
          className={`text-xl font-semibold leading-snug mb-6 cursor-text hover:text-white transition-colors
            ${task.status === "done" ? "text-text-dim line-through" : "text-text-main"}`}
        >
          {task.title}
        </h2>
      )}

      {/* Conflict warning */}
      {task.hasConflict && (
        <div className="flex items-start gap-3 p-4 mb-6 rounded-sm border border-accent-warm/30 bg-accent-warm/10">
          <span className="material-symbols-outlined text-accent-warm text-[18px] mt-0.5 shrink-0">warning</span>
          <div>
            <p className="text-sm font-mono text-accent-warm font-semibold mb-1">MERGE CONFLICT DETECTED</p>
            <p className="text-xs text-text-muted">This task has a conflict with origin/main. Resolve before merging.</p>
          </div>
        </div>
      )}

      {/* Progress */}
      {task.progress !== undefined && (
        <div className="mb-6">
          <div className="flex justify-between text-xs font-mono text-text-muted mb-2">
            <span>PROGRESS</span>
            <span>{task.progress}%</span>
          </div>
          <div className="w-full bg-white/5 rounded-full h-1.5 overflow-hidden">
            <div className="bg-primary h-full transition-all" style={{ width: `${task.progress}%` }} />
          </div>
        </div>
      )}

      {/* Assignee Picker */}
      <div className="mb-6">
        <p className="text-xs font-mono text-text-dim uppercase mb-2">Assignee</p>
        <select
          value={task.assignee_id || ""}
          onChange={(e) => {
            const val = e.target.value;
            if (!val.startsWith("gh:")) {
              const newAssignee = val || null;
              updateTask(task.id, { assignee_id: newAssignee });
              updateTaskAssignee(task.id, newAssignee).catch(() => {
                // Rollback
                updateTask(task.id, { assignee_id: task.assignee_id });
              });
            }
          }}
          className="w-full bg-white/5 border border-white/10 rounded-sm px-3 py-2 text-sm text-text-main outline-none focus:border-primary/50 font-mono"
        >
          <option value="">Unassigned</option>
          {currentUser && !members.some((m) => m.user_id === currentUser.uid) && (
            <option value={currentUser.uid}>
              Me ({currentUser.email || currentUser.displayName || "User"})
            </option>
          )}
          {members.map((m) => {
            const isMe = m.user_id === currentUser?.uid;
            const label = isMe
              ? `Me (${currentUser?.email || currentUser?.displayName || "User"})`
              : `${m.user_id.slice(0, 8)}... (${m.role})`;
            return (
              <option key={m.user_id} value={m.user_id}>
                {label}
              </option>
            );
          })}
          {githubContributors.filter(c => {
             if (currentUser?.displayName && c.toLowerCase() === currentUser.displayName.toLowerCase()) return false;
             if (currentUser?.email && currentUser.email.toLowerCase().includes(c.toLowerCase())) return false;
             return true;
          }).map((c) => (
            <option key={c} value={`gh:${c}`} disabled className="text-text-dim">
              {c} (GitHub - Invite needed)
            </option>
          ))}
        </select>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div>
          <p className="text-xs font-mono text-text-dim uppercase mb-2">Priority</p>
          <span className={`text-sm font-mono ${task.priority === "high" ? "text-red-400" : task.priority === "medium" ? "text-yellow-400" : "text-text-muted"}`}>
            {task.priority ?? "—"}
          </span>
        </div>
        <div>
          <p className="text-xs font-mono text-text-dim uppercase mb-2">PR</p>
          <span className="text-sm font-mono text-text-muted">{task.prNumber ?? "—"}</span>
        </div>
        <div>
          <p className="text-xs font-mono text-text-dim uppercase mb-2">Approvals</p>
          <span className="text-sm font-mono text-text-muted">
            {task.approvals !== undefined ? `${task.approvals}/${task.totalApprovals}` : "—"}
          </span>
        </div>
        <div>
          <p className="text-xs font-mono text-text-dim uppercase mb-2">Comments</p>
          <span className="text-sm font-mono text-text-muted">{task.commentCount ?? "—"}</span>
        </div>
      </div>

      {/* Tags */}
      {task.tags && task.tags.length > 0 && (
        <div className="mb-8">
          <p className="text-xs font-mono text-text-dim uppercase mb-3">Tags</p>
          <div className="flex flex-wrap gap-2">
            {task.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-sm border border-white/10 bg-white/5 text-xs font-mono text-text-muted">
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Timestamps */}
      <div className="mb-8 text-xs font-mono text-text-dim space-y-1">
        <p>Created: {new Date(task.created_at).toLocaleString()}</p>
        <p>Updated: {new Date(task.updated_at).toLocaleString()}</p>
      </div>

      {/* Move to next status */}
      {next && (
        <button
          onClick={() => {
            const prev = task.status;
            moveTask(task.id, next);
            updateTaskStatus(task.id, next).catch(() => {
              // Rollback on failure
              moveTask(task.id, prev);
            });
          }}
          className="mt-auto w-full flex items-center justify-between p-4 bg-primary text-white rounded-sm hover:bg-primary/90 transition-colors group"
        >
          <span className="text-sm font-medium tracking-wide uppercase">Move to {next}</span>
          <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
        </button>
      )}
    </div>
  );
};

const TasksView: React.FC = () => {
  const tasks = useStore((s) => s.tasks);
  const tasksLoading = useStore((s) => s.tasksLoading);
  const project = useStore((s) => s.project);
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const [filterStatus, setFilterStatus] = useState<TaskStatus | "all">("all");
  const [filterTag, setFilterTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(safeTasks[0]?.id ?? null);
  const currentUser = useStore((s) => s.currentUser);

  const [isCreating, setIsCreating] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [createLoading, setCreateLoading] = useState(false);

  const handleCreateTask = async () => {
    if (!newTaskTitle.trim() || !project?.id) return;
    setCreateLoading(true);
    try {
      await backendClient.execute(BACKEND_COMMANDS.createTask, {
        projectId: project.id,
        title: newTaskTitle.trim(),
        status: "backlog",
      });
      setNewTaskTitle("");
      setIsCreating(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    } finally {
      setCreateLoading(false);
    }
  };

  const filtered = safeTasks.filter((t) => {
    if (filterStatus !== "all" && t.status !== filterStatus) return false;
    if (filterTag && !t.tags?.includes(filterTag)) return false;
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const selectedTask = safeTasks.find((t) => t.id === selectedId) ?? null;

  const countByStatus = (s: TaskStatus | "all") =>
    s === "all" ? safeTasks.length : safeTasks.filter((t) => t.status === s).length;

  // Full loading state
  if (tasksLoading && safeTasks.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center bg-[#111113]">
        <LoadingState label="Loading tasks…" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Filter Sidebar */}
      <aside className="w-44 shrink-0 border-r border-border-dark bg-[#0f0f11] flex flex-col p-4 overflow-y-auto hidden md:flex">
        <h2 className="text-xs font-mono tracking-editorial text-text-dim uppercase mb-6">Filters</h2>

        {/* Status filters */}
        <div className="mb-8">
          <p className="text-[10px] font-mono text-text-dim uppercase tracking-widest mb-3">Status</p>
          <div className="flex flex-col gap-1">
            {STATUSES.map(({ value, label, color }) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                className={`flex items-center justify-between px-3 py-2 rounded-sm text-xs font-mono transition-colors
                  ${filterStatus === value ? "bg-white/5 text-white" : `${color} hover:bg-white/[0.03] hover:text-white`}`}
              >
                <span>{label}</span>
                <span className="text-text-dim">{countByStatus(value)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tag filters */}
        <div>
          <p className="text-[10px] font-mono text-text-dim uppercase tracking-widest mb-3">Tags</p>
          <div className="flex flex-col gap-1">
            {ALL_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`flex items-center gap-2 px-3 py-2 rounded-sm text-xs font-mono transition-colors
                  ${filterTag === tag ? "bg-white/5 text-white" : "text-text-dim hover:bg-white/[0.03] hover:text-white"}`}
              >
                <span className={`size-1.5 rounded-full ${filterTag === tag ? "bg-primary" : "bg-white/20"}`} />
                {tag}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Task List */}
      <div className="flex flex-col w-full md:w-[320px] shrink-0 border-r border-border-dark bg-[#111113] overflow-hidden">
        {/* Search header */}
        <div className="p-4 border-b border-border-dark flex flex-col gap-3">
          <button
            onClick={() => setIsCreating(true)}
            className="w-full h-9 bg-primary text-white text-xs font-medium rounded-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Create Task
          </button>

          {isCreating && (
            <div className="bg-surface-dark border border-white/10 rounded-sm p-3 animate-in fade-in slide-in-from-top-2">
              <input
                autoFocus
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateTask();
                  if (e.key === "Escape") setIsCreating(false);
                }}
                placeholder="Task title..."
                className="w-full bg-white/5 border border-white/10 rounded-sm px-2.5 py-1.5 text-xs text-text-main outline-none focus:border-primary/50 mb-2"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsCreating(false)} className="text-[10px] text-text-muted hover:text-white">Cancel</button>
                <button onClick={handleCreateTask} disabled={createLoading} className="text-[10px] text-primary hover:text-primary/80 font-medium disabled:opacity-50">
                  {createLoading ? "Creating..." : "Create"}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 bg-surface-dark border border-white/5 rounded-sm px-3 py-2">
            <span className="material-symbols-outlined text-[16px] text-text-dim">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="flex-1 bg-transparent text-xs font-mono text-text-main placeholder-text-dim outline-none"
            />
          </div>
        </div>

        {/* Count */}
        <div className="px-5 py-3 border-b border-border-dark">
          <span className="text-[10px] font-mono text-text-dim uppercase tracking-widest">
            {filtered.length} task{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-text-dim">
              <span className="material-symbols-outlined text-[32px] mb-2">inbox</span>
              <p className="text-xs font-mono">No tasks found</p>
            </div>
          ) : (
            filtered.map((task) => {
              let assigneeLabel = undefined;
              if (task.assignee_id) {
                assigneeLabel = task.assignee_id === currentUser?.uid ? "ME" : "USR";
              }
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  selected={selectedId === task.id}
                  assigneeLabel={assigneeLabel}
                  onClick={() => setSelectedId(task.id)}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Task Detail */}
      <div className="flex-1 bg-[#141416] overflow-hidden">
        {selectedTask ? (
          <TaskDetail task={selectedTask} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-text-dim">
            <span className="material-symbols-outlined text-[48px] mb-3">task_alt</span>
            <p className="text-sm font-mono">Select a task to view details</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TasksView;
