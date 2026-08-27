-- holaday-admin: the internal content-authoring workspace.
-- Mirrors the entity shapes actually implemented in
-- apps/traveler/src/store.js (not the deleted ADMIN-CONTENT-PLAN.md,
-- which had drifted from the code) — status lifecycle is
-- draft -> staged -> published -> archived for everything except
-- `languages`/`personas`, which store.js treats as always-editable
-- reference data with no lifecycle of their own.

create extension if not exists "pgcrypto";

create table admin_users (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create function is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (select 1 from admin_users where id = auth.uid());
  $$;

create function set_updated_at() returns trigger
  language plpgsql as $$
  begin
    new.updated_at = now();
    return new;
  end;
  $$;

create table languages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Reference data ported from apps/traveler/src/data/tripTypes.js —
-- Blueprint authoring (see AdminBlueprintDetail.jsx) only ever picks
-- among these, it doesn't define new ones.
create table trip_types (
  id text primary key,
  label text not null,
  weeks int not null,
  lesson2 text not null
);

create table destinations (
  id uuid primary key default gen_random_uuid(),
  country_key text not null unique,
  status text not null default 'draft' check (status in ('draft','staged','published','archived')),
  version int not null default 1,
  supersedes_id uuid references destinations(id),
  legacy boolean not null default false,
  language_id uuid references languages(id),
  name text not null,
  capital text,
  colours jsonb not null default '{}'::jsonb,
  flag_pattern text,
  culture_tip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger destinations_set_updated_at before update on destinations
  for each row execute function set_updated_at();

create table modules (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft','staged','published','archived')),
  version int not null default 1,
  supersedes_id uuid references modules(id),
  name text not null,
  kind text not null check (kind in ('generic','bespoke')),
  tier_count int not null default 3,
  language_id uuid references languages(id),
  language_wide boolean not null default false,
  country_key text references destinations(country_key),
  generated_from_persona_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger modules_set_updated_at before update on modules
  for each row execute function set_updated_at();

-- Questions live inline on the lesson row (jsonb), matching today's
-- lesson.data.questions[] shape exactly — there is no separate
-- reusable Question entity in the code (a produce/comprehend question
-- can optionally link to a Phrase by id within this jsonb; symbol/
-- situational questions and any question an author doesn't
-- phrase-link author their content inline, same as today).
create table lessons (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft','staged','published','archived')),
  version int not null default 1,
  supersedes_id uuid references lessons(id),
  title text not null,
  type text not null check (type in ('Phrase','Culture')),
  module_id uuid references modules(id),
  tier int not null,
  scope text not null check (scope in ('generic','country-specific')),
  language_id uuid references languages(id),
  language_wide boolean not null default false,
  country_key text references destinations(country_key),
  questions jsonb not null default '[]'::jsonb,
  generated_from_persona_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger lessons_set_updated_at before update on lessons
  for each row execute function set_updated_at();

create table phrases (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft','staged','published','archived')),
  version int not null default 1,
  supersedes_id uuid references phrases(id),
  language_id uuid references languages(id) not null,
  language_wide boolean not null default false,
  country_key text references destinations(country_key),
  en text not null,
  local text not null,
  translit text,
  tags text[] not null default '{}',
  generated_from_persona_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint phrase_scope check (
    (language_wide and country_key is null) or (not language_wide and country_key is not null)
  )
);
create trigger phrases_set_updated_at before update on phrases
  for each row execute function set_updated_at();

create table blueprints (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'draft' check (status in ('draft','staged','published','archived')),
  version int not null default 1,
  supersedes_id uuid references blueprints(id),
  trip_key text not null references trip_types(id),
  legs jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger blueprints_set_updated_at before update on blueprints
  for each row execute function set_updated_at();

-- Persona is an authoring input, not published content — no
-- draft/staged/published lifecycle, always directly editable, matching
-- store.js's adminPersonas.
create table personas (
  id uuid primary key default gen_random_uuid(),
  outline text not null,
  generated boolean not null default false,
  name text,
  summary text,
  age_range text,
  travel_style text,
  motivations text,
  pain_points text,
  vocab_focus text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger personas_set_updated_at before update on personas
  for each row execute function set_updated_at();

alter table admin_users enable row level security;
alter table languages enable row level security;
alter table trip_types enable row level security;
alter table destinations enable row level security;
alter table modules enable row level security;
alter table lessons enable row level security;
alter table phrases enable row level security;
alter table blueprints enable row level security;
alter table personas enable row level security;

-- A signed-in user can see whether *they themselves* are an admin;
-- admin_users membership itself is managed out-of-band (service role/
-- dashboard), not through client writes.
create policy "self read" on admin_users for select using (id = auth.uid());

create policy "admin read" on languages for select using (is_admin());
create policy "admin write" on languages for all using (is_admin()) with check (is_admin());

create policy "admin read" on trip_types for select using (is_admin());

create policy "admin read" on destinations for select using (is_admin());
create policy "admin write" on destinations for all using (is_admin()) with check (is_admin());

create policy "admin read" on modules for select using (is_admin());
create policy "admin write" on modules for all using (is_admin()) with check (is_admin());

create policy "admin read" on lessons for select using (is_admin());
create policy "admin write" on lessons for all using (is_admin()) with check (is_admin());

create policy "admin read" on phrases for select using (is_admin());
create policy "admin write" on phrases for all using (is_admin()) with check (is_admin());

create policy "admin read" on blueprints for select using (is_admin());
create policy "admin write" on blueprints for all using (is_admin()) with check (is_admin());

create policy "admin read" on personas for select using (is_admin());
create policy "admin write" on personas for all using (is_admin()) with check (is_admin());

-- Reference data ported from apps/traveler/src/data/tripTypes.js.
insert into trip_types (id, label, weeks, lesson2) values
  ('city',      'City Break',          6, 'Getting Around Like a Local'),
  ('beach',     'Beach Escape',        6, 'Beach, Bargaining & Small Talk'),
  ('food',      'Food & Wine',         7, 'At the Table: Ordering & Toasting'),
  ('family',    'Family Trip',         7, 'Everyday Essentials for Everyone'),
  ('adventure', 'Adventure & Outdoors',8, 'On the Trail: Asking for Help'),
  ('business',  'Business Trip',       6, 'Politeness & Small Talk for Meetings');
