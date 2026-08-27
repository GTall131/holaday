import { createClient } from "@supabase/supabase-js";

// holaday-admin — see supabase/README.md. The anon key is safe to
// ship client-side; write access is enforced by Postgres RLS requiring
// the caller's auth.uid() to be present in admin_users, which has no
// self-serve signup (see store.js's login flow).
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
