import React, { useEffect } from "react";
import { useStore, type Toast } from "../../state/store";

const TOAST_DURATION_MS = 5_000;

const ToastItem: React.FC<{ toast: Toast }> = ({ toast }) => {
  const removeToast = useStore((s) => s.removeToast);

  useEffect(() => {
    const timer = setTimeout(() => removeToast(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, removeToast]);

  const bgClass =
    toast.type === "success"
      ? "bg-emerald-500/15 border-emerald-500/30"
      : toast.type === "error"
        ? "bg-red-500/15 border-red-500/30"
        : "bg-primary/15 border-primary/30";

  const textClass =
    toast.type === "success"
      ? "text-emerald-400"
      : toast.type === "error"
        ? "text-red-400"
        : "text-primary";

  const iconName =
    toast.type === "success"
      ? "check_circle"
      : toast.type === "error"
        ? "error"
        : "info";

  return (
    <div
      className={`flex items-start gap-2.5 px-4 py-3 rounded-sm border ${bgClass} shadow-lg shadow-black/30 backdrop-blur-sm animate-toast-in max-w-sm`}
    >
      <span className={`material-symbols-outlined text-[16px] ${textClass} shrink-0 mt-0.5`}>
        {iconName}
      </span>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-mono ${textClass} leading-relaxed`}>{toast.message}</p>
        {toast.link && (
          <a
            href={toast.link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-primary hover:underline mt-1 inline-block"
          >
            {toast.link.label} →
          </a>
        )}
      </div>
      <button
        onClick={() => removeToast(toast.id)}
        className="text-text-dim hover:text-text-muted shrink-0"
      >
        <span className="material-symbols-outlined text-[14px]">close</span>
      </button>
    </div>
  );
};

const ToastContainer: React.FC = () => {
  const toasts = useStore((s) => s.toasts);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-auto">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  );
};

export default ToastContainer;
