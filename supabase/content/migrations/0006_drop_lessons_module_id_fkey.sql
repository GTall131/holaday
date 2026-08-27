-- Lessons publish (and sync to holaday-content) individually, often
-- well before their parent Module does — a Module only publishes once
-- every cell in its tier ladder already has a Published Lesson (see
-- moduleIsComplete). Since holaday-content only ever receives
-- published/archived rows, a Lesson can easily sync here before its
-- Module has. A hard FK on lessons.module_id -> modules(id) would
-- reject that ordering. Same reasoning as
-- 0005_drop_country_key_uniqueness.sql — module_id goes back to being
-- a plain tag column here, with `id` as the only real key.
alter table lessons drop constraint lessons_module_id_fkey;
