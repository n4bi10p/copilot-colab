import React from "react";

// ── Reusable loading / empty / error state components ────────────────────────

export const LoadingState: React.FC<{ label?: string }> = ({ label = "Loading…" }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-text-dim gap-3">
    <span className="size-5 border-2 border-white/10 border-t-primary rounded-full animate-spin" />
    <span className="text-xs font-mono">{label}</span>
  </div>
);

export const EmptyState: React.FC<{
  icon?: string;
  title?: string;
  description?: string;
}> = ({
  icon = "inbox",
  title = "Nothing here yet",
  description,
}) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-text-dim gap-2 px-4">
    <span className="material-symbols-outlined text-[36px] opacity-40">{icon}</span>
    <p className="text-sm font-mono text-text-muted">{title}</p>
    {description && <p className="text-xs font-mono text-text-dim text-center max-w-[200px]">{description}</p>}
  </div>
);

export const ErrorState: React.FC<{
  message?: string;
  onRetry?: () => void;
}> = ({ message = "Something went wrong", onRetry }) => (
  <div className="flex flex-col items-center justify-center h-full min-h-[120px] text-text-dim gap-3 px-4">
    <span className="material-symbols-outlined text-[36px] text-red-400/60">error</span>
    <p className="text-sm font-mono text-red-400/80">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="px-3 py-1.5 text-xs font-mono border border-white/10 rounded-sm text-text-muted hover:text-white hover:border-white/20 transition-colors"
      >
        Retry
      </button>
    )}
  </div>
);
