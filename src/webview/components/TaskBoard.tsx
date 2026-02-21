import React, { useState } from "react";
import { useStore } from "../../state/store";
import { createTask } from "../hooks/useTasks";
import type { Task, TaskStatus } from "../../types";

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "backlog", label: "Backlog" },
  { status: "in_progress", label: "In Progress" },
  { status: "done", label: "Done" },
];

// ── Task Card ────────────────────────────────────────────────────────────────
const TaskCard: React.FC<{ task: Task }> = ({ task }) => {
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
const KanbanColumn: React.FC<{ status: TaskStatus; label: string; tasks: Task[] }> = ({
  status,
  label,
  tasks,
}) => {
  const [showInput, setShowInput] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const project = useStore((s) => s.project);
  const addTask = useStore((s) => s.addTask);

  const handleAddTask = async () => {
    if (!newTitle.trim() || !project?.id) return;
    const title = newTitle.trim();
    // Optimistic store update
    addTask({
      id: `TASK-${Date.now()}`,
      project_id: project.id,
      title,
      status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    setNewTitle("");
    setShowInput(false);
    // Persist via extension host
    try { await createTask(project.id, title); } catch { /* non-fatal */ }
  };

  return (
    <div
      className={`flex flex-col w-[320px] shrink-0 gap-4 h-full
        ${status === "done" ? "opacity-60 hover:opacity-100 transition-opacity" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-text-muted uppercase tracking-widest">{label}</span>
        <span className="text-xs font-mono text-text-dim">{tasks.length}</span>
      </div>

      {/* Cards */}
      {tasks.map((task) => (
        <TaskCard key={task.id} task={task} />
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

  const getTasksByStatus = (status: TaskStatus) =>
    tasks.filter((t) => t.status === status);

  return (
    <main className="flex flex-col bg-[#141416] overflow-hidden relative">
      {/* Header */}
      <header className="h-16 flex items-center justify-between px-8 border-b border-border-dark shrink-0">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-mono tracking-editorial text-white uppercase">
            Sprint Board / Active
          </h2>
          <div className="h-4 w-px bg-border-dark mx-2" />
          <span className="text-xs text-text-muted font-mono bg-white/5 px-2 py-1 rounded">
            Cycle 42
          </span>
        </div>
        <div className="flex items-center gap-4">
          {/* Presence avatars */}
          <div className="flex -space-x-2 mr-4">
            {["A", "N", "B"].map((initial) => (
              <div
                key={initial}
                className="inline-flex h-6 w-6 rounded-full ring-2 ring-[#141416] bg-gradient-to-br from-blue-500/50 to-purple-500/50 items-center justify-center text-[10px] font-mono text-white"
              >
                {initial}
              </div>
            ))}
          </div>
          <button className="text-text-muted hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">filter_list</span>
          </button>
          <button className="text-text-muted hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>
        </div>
      </header>

      {/* Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-8">
        <div className="flex h-full gap-6">
          {COLUMNS.map(({ status, label }) => (
            <KanbanColumn
              key={status}
              status={status}
              label={label}
              tasks={getTasksByStatus(status)}
            />
          ))}
        </div>
      </div>

      {/* Scroll fade */}
      <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#141416] to-transparent pointer-events-none" />
    </main>
  );
};

export default TaskBoard;
