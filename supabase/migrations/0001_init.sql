-- Event platform schema
-- Access model: all reads/writes go through Next.js server code using the
-- Supabase secret key (bypasses RLS). RLS is enabled on every table with no
-- public policies, so the Data API exposes nothing to anon/authenticated.

create type event_status as enum ('draft', 'published', 'completed', 'cancelled');
create type event_role_kind as enum ('judge', 'volunteer', 'speaker');
create type cert_type as enum ('participation', 'winner', 'runner_up', 'volunteer', 'speaker', 'judge');
create type registration_status as enum ('registered', 'waitlisted', 'cancelled');
create type join_request_status as enum ('pending', 'accepted', 'declined');

create table profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_id text not null unique,
  email text not null default '',
  full_name text not null default '',
  headline text not null default '',
  avatar_url text,
  skills text[] not null default '{}',
  is_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_clerk on profiles (clerk_id);

create table events (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null default '',
  venue text not null default '',
  starts_at timestamptz,
  ends_at timestamptz,
  capacity integer check (capacity is null or capacity > 0),
  status event_status not null default 'draft',
  organizer_id uuid not null references profiles (id),
  created_at timestamptz not null default now()
);
create index idx_events_status on events (status, starts_at);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_announcements_event on announcements (event_id, created_at desc);

create table registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  status registration_status not null default 'registered',
  ticket_code uuid not null default gen_random_uuid() unique,
  form_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);
create index idx_registrations_event on registrations (event_id, status, created_at);

create table checkins (
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  checked_in_at timestamptz not null default now(),
  checked_in_by uuid references profiles (id),
  primary key (event_id, user_id)
);

create table teams (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  name text not null,
  description text not null default '',
  looking_for text[] not null default '{}',
  created_by uuid not null references profiles (id),
  created_at timestamptz not null default now()
);
create index idx_teams_event on teams (event_id);

create table team_members (
  team_id uuid not null references teams (id) on delete cascade,
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role_in_team text not null default '',
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id),
  unique (event_id, user_id)
);

create table join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references teams (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  message text not null default '',
  status join_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (team_id, user_id)
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  team_id uuid not null references teams (id) on delete cascade,
  name text not null,
  description text not null default '',
  repo_url text,
  demo_url text,
  video_url text,
  image_url text,
  technologies text[] not null default '{}',
  submitted_by uuid not null references profiles (id),
  submitted_at timestamptz not null default now(),
  unique (event_id, team_id)
);
create index idx_projects_event on projects (event_id);

create table event_roles (
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role event_role_kind not null,
  primary key (event_id, user_id, role)
);

create table scores (
  judge_id uuid not null references profiles (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  innovation smallint not null check (innovation between 0 and 10),
  ux smallint not null check (ux between 0 and 10),
  technical smallint not null check (technical between 0 and 10),
  impact smallint not null check (impact between 0 and 10),
  updated_at timestamptz not null default now(),
  primary key (judge_id, project_id)
);

create table votes (
  event_id uuid not null references events (id) on delete cascade,
  project_id uuid not null references projects (id) on delete cascade,
  voter_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, voter_id)
);
create index idx_votes_project on votes (project_id);

create table certificates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  type cert_type not null,
  cert_code text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  issued_at timestamptz not null default now(),
  unique (event_id, user_id, type)
);

alter table profiles enable row level security;
alter table events enable row level security;
alter table announcements enable row level security;
alter table registrations enable row level security;
alter table checkins enable row level security;
alter table teams enable row level security;
alter table team_members enable row level security;
alter table join_requests enable row level security;
alter table projects enable row level security;
alter table event_roles enable row level security;
alter table scores enable row level security;
alter table votes enable row level security;
alter table certificates enable row level security;
