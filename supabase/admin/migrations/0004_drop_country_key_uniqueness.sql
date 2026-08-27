-- 0001 wrongly made destinations.country_key UNIQUE (with FKs from
-- phrases/modules/lessons pointing at it) — but "create new draft
-- version" needs multiple rows (draft/staged/published/archived) to
-- share the same country_key over time, which a UNIQUE constraint
-- forbids. The original in-memory prototype never enforced country_key
-- uniqueness or referential integrity here either — "at most one
-- published row per country_key" was always an application-level
-- invariant (see store.js's publishDestination, which archives
-- siblings), not a DB constraint. country_key goes back to being a
-- plain tag column everywhere, with `id` as the only real key.
alter table lessons drop constraint lessons_country_key_fkey;
alter table modules drop constraint modules_country_key_fkey;
alter table phrases drop constraint phrases_country_key_fkey;
alter table destinations drop constraint destinations_country_key_key;
