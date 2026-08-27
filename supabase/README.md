# Supabase projects

Two separate projects, both in the `GTall131's Org` organization,
`eu-west-1`:

| Project | Ref | Purpose |
|---|---|---|
| `holaday-content` | `ozbilvkvnixeazzdxueb` | Production: traveler auth/accounts, `courses`, and the read-only published-content mirror. |
| `holaday-admin` | `ckombvjqrqayhtadwrkz` | Internal: content authoring (draft→staged→published→archived), `admin_users` allow-list, personas. |

Migrations for each live under `content/migrations/` and
`admin/migrations/` respectively and are applied with the Supabase
MCP/CLI (`apply_migration`), not run by hand against the dashboard.

To add an admin user: sign up through `apps/admin` once auth is wired
up, then insert their `auth.users.id` into `holaday-admin`'s
`admin_users` table (service role — there's no self-serve path, by
design).
