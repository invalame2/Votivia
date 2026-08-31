-- 1. Create profiles table
create table if not exists public.profiles (
  uuid text primary key,
  username text not null,
  tag text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (username, tag)
);

-- 2. Create profiles for existing data so we can safely add foreign keys
insert into public.profiles (uuid, username, tag, color)
select distinct uuid_author, 'Anónimo', substring(uuid_author from 1 for 4), '#1e293b'
from public.suggestions
where uuid_author not in (select uuid from public.profiles);

insert into public.profiles (uuid, username, tag, color)
select distinct uuid_author, 'Anónimo', substring(uuid_author from 1 for 4), '#1e293b'
from public.suggestion_comments
where uuid_author not in (select uuid from public.profiles);

insert into public.profiles (uuid, username, tag, color)
select distinct uuid_voter, 'Anónimo', substring(uuid_voter from 1 for 4), '#1e293b'
from public.suggestion_votes
where uuid_voter not in (select uuid from public.profiles);

-- 3. Add foreign key to suggestions
alter table public.suggestions drop constraint if exists suggestions_uuid_author_fkey;
alter table public.suggestions add constraint suggestions_uuid_author_fkey foreign key (uuid_author) references public.profiles(uuid);

-- 4. Add parent_id to comments (for threads)
alter table public.suggestion_comments add column if not exists parent_id uuid references public.suggestion_comments(id) on delete cascade;

-- 5. Add foreign key to suggestion_comments
alter table public.suggestion_comments drop constraint if exists suggestion_comments_uuid_author_fkey;
alter table public.suggestion_comments add constraint suggestion_comments_uuid_author_fkey foreign key (uuid_author) references public.profiles(uuid);

-- 6. Add foreign key to suggestion_votes
alter table public.suggestion_votes drop constraint if exists suggestion_votes_uuid_voter_fkey;
alter table public.suggestion_votes add constraint suggestion_votes_uuid_voter_fkey foreign key (uuid_voter) references public.profiles(uuid);

-- 7. Create reports table
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  comment_id uuid references public.suggestion_comments(id) on delete cascade not null,
  uuid_reporter text references public.profiles(uuid) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (comment_id, uuid_reporter)
);

-- 8. Enable RLS and setup policies
alter table public.profiles enable row level security;
alter table public.reports enable row level security;

create policy "Allow public select on profiles" on public.profiles for select using (true);
create policy "Allow public insert on profiles" on public.profiles for insert with check (true);
create policy "Allow public select on reports" on public.reports for select using (true);
create policy "Allow public insert on reports" on public.reports for insert with check (true);
create policy "Allow admin delete on reports" on public.reports for delete using (true);

-- 9. Force Supabase cache reload
NOTIFY pgrst, 'reload schema';
