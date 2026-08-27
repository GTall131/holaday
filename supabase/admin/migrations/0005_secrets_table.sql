-- Holds server-only secrets (the Anthropic API key) for the
-- persona-flesh / persona-generate-content Edge Functions. RLS is
-- enabled with *zero* policies — not even an authenticated admin via
-- the anon key can read this through the API; only a Supabase client
-- built with the function's own auto-injected SUPABASE_SERVICE_ROLE_KEY
-- can, since service-role bypasses RLS entirely. This exists because
-- there's no tool available to configure a custom Edge Function secret
-- directly (see supabase/content/functions/publish-record's header
-- comment for the same constraint on the previous phase).
create table secrets (
  key text primary key,
  value text not null
);
alter table secrets enable row level security;
