-- Migration 3: Add label column to suggestions
ALTER TABLE public.suggestions 
ADD COLUMN IF NOT EXISTS label text 
  CHECK (label IN ('idea', 'sugerencia', 'no_se')) 
  NOT NULL DEFAULT 'sugerencia';
