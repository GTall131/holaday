import { createClient } from "@supabase/supabase-js";

// holaday-content — see supabase/README.md. The anon key is safe to
// ship client-side; access is enforced by Postgres RLS.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
