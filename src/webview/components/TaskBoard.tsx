import React, { useState } from "react";
import { useStore } from "../../state/store";
import { createTask, updateTaskAssignee, aiAssignTasks } from "../hooks/useTasks";
import { LoadingState, EmptyState } from "./StatusState";
import type { Task, TaskStatus, ProjectMember } from "../../types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

// ── Assignee Dropdown ────────────────────────────────────────────────────────
const AssigneeDropdown: React.FC<{
  taskId: string;
  currentAssignee: string | null | undefined;
  members: ProjectMember[];
}> = ({ taskId, currentAssignee, members }) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const updateTask = useStore((s) => s.updateTask);

  const handleAssign = async (assigneeId: string | null) => {
    setOpen(false);
    setLoading(true);
    // Optimistic update
    const prevAssignee = currentAssignee;
    updateTask(taskId, { assignee_id: assigneeId });
    try {
      await updateTaskAssignee(taskId, assigneeId);
    } catch {
      // Rollback on failure
      updateTask(taskId, { assignee_id: prevAssignee });
    } finally {
      setLoading(false);
    }
  };

  const assignedMember = members.find((m) => m.user_id === currentAssignee);
  const initial = assignedMember
    ? (assignedMember.display_name ?? assignedMember.email ?? assignedMember.user_id).charAt(0).toUpperCase()
    : null;

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        disabled={loading}
        className="flex items-center gap-1 text-[10px] font-mono text-text-dim hover:text-text-muted transition-colors"
        title={assignedMember ? `Assigned to ${assignedMember.display_name ?? assignedMember.email ?? assignedMember.user_id}` : "Unassigned — click to assign"}
      >
        {loading ? (
          <span className="size-3 border border-white/20 border-t-primary rounded-full animate-spin" />
        ) : initial ? (
          <span className="size-5 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-[9px] text-primary font-semibold">{initial}</span>
        ) : (
          <span className="material-symbols-outlined text-[14px]">person_add</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-6 z-30 w-40 bg-[#1a1a1e] border border-white/10 rounded-sm shadow-xl shadow-black/40 overflow-hidden">
          <button
            onClick={() => handleAssign(null)}
            className={`w-full px-3 py-2 text-left text-[11px] font-mono hover:bg-white/5 transition-colors ${!currentAssignee ? "text-primary" : "text-text-muted"}`}
          >
            Unassigned
          </button>
          {members.map((m) => (
            <button
              key={m.user_id}
              onClick={() => handleAssign(m.user_id)}
              className={`w-full px-3 py-2 text-left text-[11px] font-mono hover:bg-white/5 transition-colors truncate ${m.user_id === currentAssignee ? "text-primary" : "text-text-muted"}`}
            >
              {m.display_name ?? m.email ?? m.user_id.slice(0, 8)}
            </button>
          ))}
          {members.length === 0 && (
            <p className="px-3 py-2 text-[10px] text-text-dim">No members loaded</p>
          )}
        </div>
      )}
    </div>
  );
};

// ── Task Card ────────────────────────────────────────────────────────────────
const TaskCard: React.FC<{ task: Task; members: ProjectMember[] }> = ({ task, members }) => {
  const isDone = task.status === "done";
  const isConflict = task.hasConflict;
  const isReadyToMerge =
    task.status === "in_progress" &&
    task.approvals !== undefined &&
    task.approvals === task.totalApprovals;

  return (
    <div
      className={`bg-surface-dark border border-white/5 p-4 rounded-sm transition-colors group cursor-grab active:cursor-grabbing
        ${isConflict ? "border-l-2 border-l-accent-warm rounded-r-sm rounded-l-none shadow-lg shadow-black/20 hover:bg-white/[0.02]" : "hover:border-white/10"}
        ${isDone ? "opacity-70" : ""}`}
    >
      {/* Card Header */}
      <div className="flex justify-between items-start mb-3">
        {isConflict ? (
          <span className="text-xs font-mono text-accent-warm font-semibold flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">warning</span>
            CONFLICT
          </span>
        ) : isReadyToMerge ? (
          <span className="text-xs font-mono text-emerald-500">READY TO MERGE</span>
        ) : (
          <span className={`text-xs font-mono text-text-dim ${isDone ? "line-through" : ""}`}>
            {task.id}
          </span>
        )}

        {/* Right indicator */}
        {isReadyToMerge ? (
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        ) : isDone ? (
          <span className="material-symbols-outlined text-[16px] text-text-dim">check_circle</span>
        ) : task.tags?.includes("purple") ? (
          <span className="size-2 rounded-full bg-purple-500/20 border border-purple-500/50" />
        ) : null}
      </div>

      {/* Title */}
      <h3
        className={`text-sm font-medium leading-snug mb-3
          ${isDone ? "text-text-dim line-through" : "text-gray-200 group-hover:text-white"}`}
      >
        {task.title}
      </h3>

      {/* Progress bar (conflict cards) */}
      {isConflict && task.progress !== undefined && (
        <div className="w-full bg-white/5 rounded-full h-1 mb-3 overflow-hidden">
          <div
            className="bg-accent-warm h-full"
            style={{ width: `${task.progress}%` }}
          />
        </div>
      )}

      {/* Footer */}
      {!isDone && (
        <div className="flex items-center justify-between mt-auto">
          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex items-center gap-2">
              {task.tags.map((tag) => (
                <span
                  key={tag}
                  className={`px-1.5 py-0.5 rounded-sm border text-[10px] font-mono
                    ${tag === "high-priority"
                      ? "border-accent-warm/30 text-accent-warm bg-accent-warm/10"
                      : "border-white/10 bg-white/5 text-text-muted"}`}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Assignee */}
          <div className="ml-auto">
            <AssigneeDropdown taskId={task.id} currentAssignee={task.assignee_id} members={members} />
          </div>

          {/* Review info */}
          {task.status === "in_progress" && task.prNumber && (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-1 text-text-dim">
                {task.approvals !== undefined ? (
                  <>
                    <span className="material-symbols-outlined text-[14px]">thumb_up</span>
                    <span className="text-xs font-mono">{task.approvals}/{task.totalApprovals}</span>
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[14px]">comment</span>
                    <span className="text-xs font-mono">{task.commentCount}</span>
                  </>
                )}
              </div>
              <span className="text-[10px] font-mono text-text-dim">{task.prNumber}</span>
            </div>
          )}

          {/* Conflict timestamp */}
          {isConflict && (
            <span className="text-[10px] font-mono text-text-dim ml-auto">2h ago</span>
          )}
        </div>
      )}
    </div>
  );
};

// ── Kanban Column ────────────────────────────────────────────────────────────
const KanbanColumn: React.FC<{ status: TaskStatus; label: string; tasks: Task[]; members: ProjectMember[] }> = ({
  status,
  label,
  tasks,
  members,
}) => {
  const [showInput, setShowInput] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const project = useStore((s) => s.project);
  const addTask = useStore((s) => s.addTask);
  const removeTask = useStore((s) => s.removeTask);

  const handleAddTask = async () => {
    if (!newTitle.trim() || !project?.id) return;
    const title = newTitle.trim();
    const tempId = `TASK-${Date.now()}`;
    // Optimistic store update
    addTask({
      id: tempId,
      project_id: project.id,
      title,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setNewTitle("");
    setShowInput(false);
    // Persist via extension host — rollback on failure
    try {
      await createTask(project.id, title);
    } catch {
      removeTask(tempId);
    }
  };

  return (
    <div
      className={`flex flex-col w-[260px] min-w-[220px] shrink-0 gap-3 h-full
        ${status === "done" ? "opacity-60 hover:opacity-100 transition-opacity" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-text-muted uppercase tracking-widest">{label}</span>
        <span className="text-xs font-mono text-text-dim">{tasks.length}</span>
      </div>

      {/* Cards */}
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} members={members} />
      ))}

      {/* Add Task */}
      {status !== "done" && (
        <>
          {showInput ? (
            <div className="flex flex-col gap-2">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddTask();
                  if (e.key === "Escape") setShowInput(false);
                }}
                placeholder="Task title..."
                className="w-full bg-surface-dark border border-white/10 rounded-sm px-3 py-2 text-sm text-text-main font-mono outline-none focus:border-primary/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleAddTask}
                  className="px-3 py-1 bg-primary text-white text-xs font-mono rounded-sm hover:bg-primary/90"
                >
                  Add
                </button>
                <button
                  onClick={() => setShowInput(false)}
                  className="px-3 py-1 text-text-muted text-xs font-mono hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowInput(true)}
              className="w-full py-3 rounded-sm border border-dashed border-white/10 text-text-dim text-xs font-mono hover:text-text-muted hover:border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Create Issue
            </button>
          )}
        </>
      )}
    </div>
  );
};

// ── Task Board ───────────────────────────────────────────────────────────────
const TaskBoard: React.FC = () => {
  const tasks = useStore((s) => s.tasks);
  const tasksLoading = useStore((s) => s.tasksLoading);
  const members = useStore((s) => s.members);
  const project = useStore((s) => s.project);
  const addToast = useStore((s) => s.addToast);
  const [assigning, setAssigning] = useState(false);
  const safeTasks = Array.isArray(tasks) ? tasks : [];

  const handleAiAssign = async () => {
    if (!project?.id || assigning) return;
    setAssigning(true);
    try {
      const result = await aiAssignTasks(project.id);
      addToast({
        id: Date.now().toString(),
        type: "success",
        message: `Gemini assigned ${result.assigned} of ${result.total} unassigned tasks`,
      });
    } catch (err) {
      addToast({
        id: Date.now().toString(),
        type: "error",
        message: err instanceof Error ? err.message : "Failed to assign tasks via AI",
      });
    } finally {
      setAssigning(false);
    }
  };

  const getTasksByStatus = (status: TaskStatus) =>
    safeTasks.filter((t) => t.status === status);

  return (
    <main className="flex flex-col bg-[#141416] overflow-hidden relative">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-6 border-b border-border-dark shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-mono tracking-editorial text-white uppercase">
            Sprint Board
          </h2>
          {safeTasks.length > 0 && (
            <>
              <div className="h-4 w-px bg-border-dark" />
              <span className="text-[10px] text-text-dim font-mono">
                {safeTasks.length} task{safeTasks.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleAiAssign}
            disabled={assigning || safeTasks.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-sm text-indigo-400 text-[11px] font-mono hover:bg-indigo-500/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Let Gemini auto-assign unassigned tasks to team members"
          >
            {assigning ? (
              <span className="size-3 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
            ) : (
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
            )}
            {assigning ? "Assigning..." : "Assign via Gemini"}
          </button>
          <button className="text-text-muted hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
          </button>
          <button className="text-text-muted hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[18px]">search</span>
          </button>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        {tasksLoading ? (
          <LoadingState label="Fetching tasks…" />
        ) : safeTasks.length === 0 ? (
          <EmptyState
            icon="task_alt"
            title="No tasks yet"
            description="Create your first task using the button in any column."
          />
        ) : (
          <div className="flex h-full gap-5">
            {COLUMNS.map(({ status, label }) => (
              <KanbanColumn
                key={status}
                status={status}
                label={label}
                tasks={getTasksByStatus(status)}
                members={members}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

export default TaskBoard;
