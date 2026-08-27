-- Pin search_path on set_updated_at (flagged by the Supabase security
-- advisor as mutable otherwise), and stop anon/authenticated from
-- being able to invoke the auth.users trigger function directly via
-- PostgREST RPC — it only ever needs to run as the AFTER INSERT
-- trigger, which doesn't require callers to hold EXECUTE.
alter function set_updated_at() set search_path = public;
revoke execute on function handle_new_user() from anon, authenticated;
