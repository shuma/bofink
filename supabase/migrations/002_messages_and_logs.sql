-- Messages and Build Logs Migration
-- Adds persistence for chat conversations and build logs

-- Messages table (stores AI SDK UIMessage objects)
-- Uses JSONB for parts to handle the polymorphic structure without schema changes
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  message_id text not null,  -- AI SDK's message id for deduplication
  role text not null check (role in ('system', 'user', 'assistant')),
  parts jsonb not null default '[]',
  metadata jsonb,
  sequence_num integer not null,
  created_at timestamptz default now(),
  unique (project_id, message_id)
);

-- Build logs table (extracted from messages for fast querying)
create table if not exists build_logs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade not null,
  message_id uuid references messages(id) on delete cascade,
  type text not null check (type in ('info', 'command', 'output', 'error', 'success')),
  message text not null,
  step text,
  created_at timestamptz default now()
);

-- Enable RLS on new tables
alter table messages enable row level security;
alter table build_logs enable row level security;

-- RLS policies for messages (users can only access their project's messages)
create policy "Users can view their own project messages"
  on messages for select
  using (
    exists (
      select 1 from projects
      where projects.id = messages.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create messages for their projects"
  on messages for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = messages.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can update their own project messages"
  on messages for update
  using (
    exists (
      select 1 from projects
      where projects.id = messages.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete their own project messages"
  on messages for delete
  using (
    exists (
      select 1 from projects
      where projects.id = messages.project_id
      and projects.user_id = auth.uid()
    )
  );

-- RLS policies for build_logs
create policy "Users can view their own project build logs"
  on build_logs for select
  using (
    exists (
      select 1 from projects
      where projects.id = build_logs.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can create build logs for their projects"
  on build_logs for insert
  with check (
    exists (
      select 1 from projects
      where projects.id = build_logs.project_id
      and projects.user_id = auth.uid()
    )
  );

create policy "Users can delete their own project build logs"
  on build_logs for delete
  using (
    exists (
      select 1 from projects
      where projects.id = build_logs.project_id
      and projects.user_id = auth.uid()
    )
  );

-- Enable Realtime for chat updates
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table build_logs;

-- Indexes for performance
create index if not exists idx_messages_project_id on messages(project_id);
create index if not exists idx_messages_project_sequence on messages(project_id, sequence_num);
create index if not exists idx_messages_created_at on messages(created_at);
create index if not exists idx_build_logs_project_id on build_logs(project_id);
create index if not exists idx_build_logs_created_at on build_logs(created_at);
create index if not exists idx_build_logs_message_id on build_logs(message_id);
