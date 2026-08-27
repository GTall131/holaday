-- Pin search_path on set_updated_at (flagged by the Supabase security
-- advisor as mutable otherwise). is_admin() already set this in 0001.
alter function set_updated_at() set search_path = public;
