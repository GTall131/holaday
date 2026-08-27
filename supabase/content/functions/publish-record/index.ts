import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { moduleIsComplete, blueprintIsPublishable } from "./content-engine.js";

// The publish pipeline: bridges holaday-admin (the authoring workspace)
// and holaday-content (production). Deployed *here*, in holaday-content,
// rather than in holaday-admin, so it can use this project's own
// auto-injected SUPABASE_SERVICE_ROLE_KEY for the privileged content
// write — no manually-configured cross-project secret needed. The
// holaday-admin side of every request instead runs as the caller's own
// session (holaday-admin's public anon key + the forwarded
// Authorization header), so holaday-admin's RLS is what actually
// authorizes the publish action ("is this really an admin"), not this
// function's own logic.
//
// verify_jwt is off: the incoming JWT is signed by holaday-admin's own
// auth, which this project's gateway can't verify against its own
// JWKS. Authorization instead happens explicitly below via
// adminClient.auth.getUser() + is_admin().
const ADMIN_URL = "https://ckombvjqrqayhtadwrkz.supabase.co";
const ADMIN_ANON_KEY = "sb_publishable_OviLLebWKubdNwIfmbBehQ_JRWUCx0y";

const TABLES: Record<string, string> = {
  destination: "destinations",
  module: "modules",
  lesson: "lessons",
  phrase: "phrases",
  blueprint: "blueprints"
};

function toContentRow(type: string, r: any) {
  switch (type) {
    case "destination":
      return {
        id: r.id, country_key: r.country_key, status: "published", version: r.version, legacy: r.legacy,
        language_id: r.language_id, name: r.name, capital: r.capital, colours: r.colours,
        flag_pattern: r.flag_pattern, culture_tip: r.culture_tip
      };
    case "module":
      return {
        id: r.id, status: "published", version: r.version, name: r.name, kind: r.kind,
        tier_count: r.tier_count, language_id: r.language_id, language_wide: r.language_wide,
        country_key: r.country_key
      };
    case "lesson":
      return {
        id: r.id, status: "published", version: r.version, title: r.title, type: r.type,
        module_id: r.module_id, tier: r.tier, scope: r.scope, language_id: r.language_id,
        language_wide: r.language_wide, country_key: r.country_key, questions: r.questions
      };
    case "phrase":
      return {
        id: r.id, status: "published", version: r.version, language_id: r.language_id,
        language_wide: r.language_wide, country_key: r.country_key, en: r.en, local: r.local,
        translit: r.translit, tags: r.tags
      };
    case "blueprint":
      return { id: r.id, status: "published", version: r.version, trip_key: r.trip_key, legs: r.legs };
    default:
      return null;
  }
}

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const adminClient = createClient(ADMIN_URL, ADMIN_ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data: { user }, error: userError } = await adminClient.auth.getUser();
  if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const { data: isAdmin } = await adminClient.rpc("is_admin");
  if (!isAdmin) return new Response(JSON.stringify({ error: "Not an admin user" }), { status: 403 });

  const { type, id } = await req.json();
  const table = TABLES[type];
  if (!table || !id) return new Response(JSON.stringify({ error: "Invalid type or id" }), { status: 400 });

  const { data: record, error: fetchError } = await adminClient.from(table).select("*").eq("id", id).single();
  if (fetchError || !record) return new Response(JSON.stringify({ error: "Record not found" }), { status: 404 });
  if (record.status !== "staged") {
    return new Response(JSON.stringify({ error: "Only a staged record can be published" }), { status: 400 });
  }

  // Re-validate the gating rule server-side, not just trusting the
  // client's own check (moduleIsComplete/blueprintIsPublishable —
  // packages/shared/content-engine).
  if (type === "module") {
    const [{ data: lessons }, { data: destinations }] = await Promise.all([
      adminClient.from("lessons").select("*").eq("module_id", id),
      adminClient.from("destinations").select("*").eq("status", "published")
    ]);
    if (!moduleIsComplete(record, lessons ?? [], destinations ?? [])) {
      return new Response(JSON.stringify({ error: "Tier ladder isn't fully published yet" }), { status: 400 });
    }
  } else if (type === "blueprint") {
    const moduleIds = [...new Set(record.legs.flatMap((leg: any) => leg.moduleGates.map((g: any) => g.moduleId)))];
    const { data: modules } = await adminClient.from("modules").select("*").in("id", moduleIds);
    if (!blueprintIsPublishable(record, modules ?? [])) {
      return new Response(JSON.stringify({ error: "Every gated module needs to be published first" }), { status: 400 });
    }
  }

  // --- holaday-admin side: flip status, archive whatever this supersedes ---
  const { error: publishError } = await adminClient.from(table).update({ status: "published" }).eq("id", id);
  if (publishError) return new Response(JSON.stringify({ error: publishError.message }), { status: 400 });

  let archivedIds: string[] = [];
  if (type === "destination") {
    const { data: siblings } = await adminClient.from("destinations")
      .select("id").eq("country_key", record.country_key).eq("status", "published").neq("id", id);
    archivedIds = (siblings ?? []).map((s: any) => s.id);
  } else if (record.supersedes_id) {
    archivedIds = [record.supersedes_id];
  }
  if (archivedIds.length){
    await adminClient.from(table).update({ status: "archived" }).in("id", archivedIds);
  }

  // --- holaday-content side: this project's own service role, no secret needed ---
  const contentClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  // Languages are reference data with no draft/staged lifecycle of
  // their own (see admin store.js's ensureLanguage) — sync the
  // referenced one on demand rather than requiring a separate publish
  // step for something that's always "live" the moment it exists.
  if (record.language_id) {
    const { data: lang } = await adminClient.from("languages").select("*").eq("id", record.language_id).single();
    if (lang) await contentClient.from("languages").upsert({ id: lang.id, name: lang.name });
  }

  const { error: upsertError } = await contentClient.from(table).upsert(toContentRow(type, record));
  if (upsertError) return new Response(JSON.stringify({ error: upsertError.message }), { status: 500 });
  if (archivedIds.length){
    await contentClient.from(table).update({ status: "archived" }).in("id", archivedIds);
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
});
