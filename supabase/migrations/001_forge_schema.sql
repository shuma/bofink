-- Forge Schema Migration
-- Run this in your Supabase SQL editor

-- profiles table
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- projects table
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  description text,
  prompt text not null,
  plan jsonb,
  source text default 'generated',
  template text default 'tanstack-start-ts',
  daytona_sandbox_id text,
  preview_url text,
  preview_expires_at timestamptz,
  status text default 'planning',  -- planning|building|ready|error
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- generations table (build steps/logs)
create table if not exists generations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  prompt text not null,
  clarifying_questions jsonb,
  clarifying_answers jsonb,
  plan jsonb,
  build_output text,
  status text default 'pending',  -- pending|clarifying|planning|approved|building|ready|error
  created_at timestamptz default now()
);

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table projects enable row level security;
alter table generations enable row level security;

-- RLS policies for profiles
create policy "Users can view their own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- RLS policies for projects
create policy "Users can view their own projects"
  on projects for select
  using (auth.uid() = user_id);

create policy "Users can create their own projects"
  on projects for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own projects"
  on projects for update
  using (auth.uid() = user_id);

create policy "Users can delete their own projects"
  on projects for delete
  using (auth.uid() = user_id);

-- RLS policies for generations
create policy "Users can view their own generations"
  on generations for select
  using (
    exists (
      select 1 from projects
      where projects.id = generations.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create generations for their projects"
  on generations for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = generations.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update their own generations"
  on generations for update
  using (
    exists (
      select 1 from projects
      where projects.id = generations.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Enable Realtime for these tables
alter publication supabase_realtime add table projects;
alter publication supabase_realtime add table generations;

-- Create indexes for performance
create index if not exists idx_projects_user_id on projects(user_id);
create index if not exists idx_projects_status on projects(status);
create index if not exists idx_generations_project_id on generations(project_id);
create index if not exists idx_generations_status on generations(status);
