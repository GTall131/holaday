-- holaday-content: production/user-facing project. Traveler accounts +
-- courses, plus a read-only mirror of the content bank that only ever
-- receives `published`/`archived` rows from holaday-admin's
-- publish-record Edge Function (drafts/staged rows never leave the
-- admin project) — enforced here with a CHECK, not just by convention.

create extension if not exists "pgcrypto";

create function set_updated_at() returns trigger
  language plpgsql as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  created_at timestamptz not null default now()
);

create function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
  begin
    insert into profiles (id, first_name) values (new.id, new.raw_user_meta_data ->> 'first_name');
    return new;
  end;
  $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

create table languages (
  id uuid primary key,
  name text not null unique
);

create table trip_types (
  id text primary key,
  label text not null,
  weeks int not null,
  lesson2 text not null
);

create table destinations (
  id uuid primary key,
  country_key text not null unique,
  status text not null check (status in ('published','archived')),
  version int not null,
  legacy boolean not null default false,
  language_id uuid references languages(id),
  name text not null,
  capital text,
  colours jsonb not null default '{}'::jsonb,
  flag_pattern text,
  culture_tip text,
  updated_at timestamptz not null default now()
);

create table modules (
  id uuid primary key,
  status text not null check (status in ('published','archived')),
  version int not null,
  name text not null,
  kind text not null check (kind in ('generic','bespoke')),
  tier_count int not null default 3,
  language_id uuid references languages(id),
  language_wide boolean not null default false,
  country_key text references destinations(country_key),
  updated_at timestamptz not null default now()
);

create table lessons (
  id uuid primary key,
  status text not null check (status in ('published','archived')),
  version int not null,
  title text not null,
  type text not null check (type in ('Phrase','Culture')),
  module_id uuid references modules(id),
  tier int not null,
  scope text not null check (scope in ('generic','country-specific')),
  language_id uuid references languages(id),
  language_wide boolean not null default false,
  country_key text references destinations(country_key),
  questions jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table phrases (
  id uuid primary key,
  status text not null check (status in ('published','archived')),
  version int not null,
  language_id uuid references languages(id) not null,
  language_wide boolean not null default false,
  country_key text references destinations(country_key),
  en text not null,
  local text not null,
  translit text,
  tags text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create table blueprints (
  id uuid primary key,
  status text not null check (status in ('published','archived')),
  version int not null,
  trip_key text not null references trip_types(id),
  legs jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

-- Traveler-owned runtime data — never touched by the publish pipeline.
create table courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  country_key text not null,
  trip_key text not null,
  weeks int not null,
  syllabus jsonb not null default '[]'::jsonb,
  legs jsonb,
  current_week int not null default 1,
  status text not null default 'active' check (status in ('active','completed')),
  notes text,
  travel_start date,
  travel_end date,
  feedback_submitted boolean not null default false,
  feedback jsonb,
  created_at timestamptz not null default now()
);
create index courses_user_id_idx on courses(user_id);

alter table profiles enable row level security;
alter table languages enable row level security;
alter table trip_types enable row level security;
alter table destinations enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table phrases enable row level security;
alter table blueprints enable row level security;
alter table courses enable row level security;

create policy "self read" on profiles for select using (id = auth.uid());
create policy "self update" on profiles for update using (id = auth.uid());

-- Content bank: public read of what's live; no client writes at all —
-- only the publish-record Edge Function (service role) writes here.
create policy "public read" on languages for select using (true);
create policy "public read" on trip_types for select using (true);
create policy "public read" on destinations for select using (true);
create policy "public read" on modules for select using (true);
create policy "public read" on lessons for select using (true);
create policy "public read" on phrases for select using (true);
create policy "public read" on blueprints for select using (true);

create policy "own courses read" on courses for select using (user_id = auth.uid());
create policy "own courses insert" on courses for insert with check (user_id = auth.uid());
create policy "own courses update" on courses for update using (user_id = auth.uid());

insert into trip_types (id, label, weeks, lesson2) values
  ('city',      'City Break',          6, 'Getting Around Like a Local'),
  ('beach',     'Beach Escape',        6, 'Beach, Bargaining & Small Talk'),
  ('food',      'Food & Wine',         7, 'At the Table: Ordering & Toasting'),
  ('family',    'Family Trip',         7, 'Everyday Essentials for Everyone'),
  ('adventure', 'Adventure & Outdoors',8, 'On the Trail: Asking for Help'),
  ('business',  'Business Trip',       6, 'Politeness & Small Talk for Meetings');
