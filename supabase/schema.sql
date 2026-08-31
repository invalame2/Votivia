-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Table: profiles (maps UUID to username/color)
create table public.profiles (
  uuid text primary key,
  username text not null,
  tag text not null,
  color text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (username, tag)
);

-- Table: suggestions
create table public.suggestions (
  id uuid default uuid_generate_v4() primary key,
  uuid_author text references public.profiles(uuid) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: suggestion_votes
create table public.suggestion_votes (
  id uuid default uuid_generate_v4() primary key,
  suggestion_id uuid references public.suggestions(id) on delete cascade not null,
  uuid_voter text references public.profiles(uuid) not null,
  vote integer not null check (vote in (-1, 0, 1)),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (suggestion_id, uuid_voter)
);

-- Table: suggestion_comments
create table public.suggestion_comments (
  id uuid default uuid_generate_v4() primary key,
  suggestion_id uuid references public.suggestions(id) on delete cascade not null,
  parent_id uuid references public.suggestion_comments(id) on delete cascade,
  uuid_author text references public.profiles(uuid) not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Table: reports
create table public.reports (
  id uuid default uuid_generate_v4() primary key,
  comment_id uuid references public.suggestion_comments(id) on delete cascade not null,
  uuid_reporter text references public.profiles(uuid) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (comment_id, uuid_reporter)
);

-- Table: poll_questions
create table public.poll_questions (
  id uuid default uuid_generate_v4() primary key,
  question text not null,
  option_a_text text not null,
  option_a_image text,
  option_b_text text not null,
  option_b_image text,
  category text,
  "order" integer default 0,
  active boolean default true not null
);

-- Table: poll_votes
create table public.poll_votes (
  id uuid default uuid_generate_v4() primary key,
  question_id uuid references public.poll_questions(id) on delete cascade not null,
  uuid_voter text references public.profiles(uuid) not null,
  selected_option text not null check (selected_option in ('a', 'b')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (question_id, uuid_voter)
);

-- RLS setup
alter table public.profiles enable row level security;
alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;
alter table public.suggestion_comments enable row level security;
alter table public.reports enable row level security;
alter table public.poll_questions enable row level security;
alter table public.poll_votes enable row level security;

-- Policies
create policy "Allow public select on profiles" on public.profiles for select using (true);
create policy "Allow public insert on profiles" on public.profiles for insert with check (true);

create policy "Allow public select on suggestions" on public.suggestions for select using (true);
create policy "Allow public insert on suggestions" on public.suggestions for insert with check (true);
create policy "Allow author delete on suggestions" on public.suggestions for delete using (true); -- we check author in API

create policy "Allow public select on suggestion_votes" on public.suggestion_votes for select using (true);
create policy "Allow public insert on suggestion_votes" on public.suggestion_votes for insert with check (true);
create policy "Allow public update on suggestion_votes" on public.suggestion_votes for update using (true);
create policy "Allow public delete on suggestion_votes" on public.suggestion_votes for delete using (true);

create policy "Allow public select on suggestion_comments" on public.suggestion_comments for select using (true);
create policy "Allow public insert on suggestion_comments" on public.suggestion_comments for insert with check (true);
create policy "Allow author delete on suggestion_comments" on public.suggestion_comments for delete using (true); -- check via API

create policy "Allow public select on reports" on public.reports for select using (true);
create policy "Allow public insert on reports" on public.reports for insert with check (true);
create policy "Allow admin delete on reports" on public.reports for delete using (true);

create policy "Allow public select on poll_questions" on public.poll_questions for select using (true);

create policy "Allow public select on poll_votes" on public.poll_votes for select using (true);
create policy "Allow public insert on poll_votes" on public.poll_votes for insert with check (true);
