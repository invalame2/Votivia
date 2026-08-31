-- Modificar la tabla reports para soportar sugerencias
alter table public.reports drop constraint if exists reports_comment_id_fkey;

-- Hacer comment_id opcional
alter table public.reports alter column comment_id drop not null;

-- Agregar columna suggestion_id
alter table public.reports add column if not exists suggestion_id uuid references public.suggestions(id) on delete cascade;

-- Volver a añadir las restricciones de fkey si las borramos
alter table public.reports add constraint reports_comment_id_fkey foreign key (comment_id) references public.suggestion_comments(id) on delete cascade;

-- Notificar a Supabase que recargue la caché de las APIs
NOTIFY pgrst, 'reload schema';
