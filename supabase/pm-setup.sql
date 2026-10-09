-- PM: projects and tasks. Run once in the Supabase SQL editor. Safe to run again.
create table if not exists public.pm_projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#111111',
  position double precision not null default 0,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.pm_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.pm_projects (id) on delete set null,
  parent_id uuid references public.pm_tasks (id) on delete cascade,
  title text not null,
  notes text not null default '',
  done boolean not null default false,
  done_at timestamptz,
  priority smallint not null default 0 check (priority between 0 and 3),
  due_date date,
  planned_for date,
  position double precision not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists pm_tasks_planned_idx on public.pm_tasks (planned_for) where deleted_at is null;
create index if not exists pm_tasks_project_idx on public.pm_tasks (project_id) where deleted_at is null;
create index if not exists pm_tasks_parent_idx on public.pm_tasks (parent_id);

-- Every change, for history now and notifications later.
create table if not exists public.pm_events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  task_id uuid,
  type text not null,
  data jsonb not null default '{}'
);

alter table public.pm_projects enable row level security;
alter table public.pm_tasks enable row level security;
alter table public.pm_events enable row level security;
