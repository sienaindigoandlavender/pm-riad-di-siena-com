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

-- Added for repeating tasks and the Gantt view.
alter table public.pm_tasks add column if not exists start_date date;
alter table public.pm_tasks add column if not exists repeat text
  check (repeat in ('daily', 'weekdays', 'weekly', 'monthly', 'yearly'));

-- Who a task is for: null or 'jackie' is Jacqueline; 'zahra', 'mouad'.
alter table public.pm_tasks add column if not exists assignee text;

-- Appointments: things at a time on a day.
create table if not exists public.pm_appointments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  date date not null,
  start_time time,
  end_time time,
  location text not null default '',
  notes text not null default '',
  project_id uuid references public.pm_projects (id) on delete set null,
  assignee text,
  repeat text check (repeat in ('daily', 'weekdays', 'weekly', 'monthly', 'yearly')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists pm_appointments_date_idx on public.pm_appointments (date) where deleted_at is null;

-- Calendars she subscribes to (iCal / webcal links).
create table if not exists public.pm_feeds (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text not null,
  color text not null default '#5AA9E6',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

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
alter table public.pm_appointments enable row level security;
alter table public.pm_feeds enable row level security;
