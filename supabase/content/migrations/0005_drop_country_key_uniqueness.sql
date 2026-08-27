-- See supabase/admin/migrations/0004_drop_country_key_uniqueness.sql —
-- same fix, same reasoning, mirrored here.
alter table lessons drop constraint lessons_country_key_fkey;
alter table modules drop constraint modules_country_key_fkey;
alter table phrases drop constraint phrases_country_key_fkey;
alter table destinations drop constraint destinations_country_key_key;
