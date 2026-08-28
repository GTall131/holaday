-- The Anthropic API key now lives as a Cloudflare Pages secret
-- (apps/admin/functions/persona-flesh.js, persona-generate-content.js)
-- instead of this table, which existed only as a workaround for
-- Supabase Edge Functions having no tool to set a custom secret.
drop table if exists secrets;
