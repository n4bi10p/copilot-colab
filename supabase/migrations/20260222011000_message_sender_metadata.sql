-- Add sender metadata for assistant/bot messages while preserving existing RLS author ownership checks.
ALTER TABLE public.messages
ADD COLUMN IF NOT EXISTS sender_kind TEXT NOT NULL DEFAULT 'user'
CHECK (sender_kind IN ('user', 'assistant')),
ADD COLUMN IF NOT EXISTS sender_label TEXT;

CREATE INDEX IF NOT EXISTS idx_messages_project_id_sender_kind
ON public.messages(project_id, sender_kind);
