import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { resolveBlueprintSyllabus, legacySyllabus } from "./content-engine.js";

// Ports store.js's finalizeCourse/resolveBlueprintSyllabus server-side
// so course creation reads real published Blueprint/Module/Lesson rows
// instead of an in-memory array, and the insert happens under the
// caller's own JWT (no service role needed — RLS's "own courses
// insert" policy already scopes this to auth.uid()).
//
// apps/traveler (Cloudflare Pages) calls this cross-origin via
// supabase.functions.invoke, so the browser sends a CORS preflight
// before the real POST — see supabase/content/functions/publish-record
// for the same fix, applied here for the same reason.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS_HEADERS });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });

  const { countryKey, tripKey, notes, startDate, endDate } = await req.json();
  if (!countryKey || !tripKey) {
    return new Response(JSON.stringify({ error: "countryKey and tripKey are required" }), { status: 400, headers: CORS_HEADERS });
  }

  const [{ data: destination }, { data: blueprint }, { data: tripType }] = await Promise.all([
    supabase.from("destinations").select("language_id").eq("country_key", countryKey).eq("status", "published").maybeSingle(),
    supabase.from("blueprints").select("*").eq("trip_key", tripKey).eq("status", "published").maybeSingle(),
    supabase.from("trip_types").select("*").eq("id", tripKey).maybeSingle()
  ]);

  let resolved = null;
  if (blueprint) {
    const moduleIds = [...new Set(blueprint.legs.flatMap((leg: any) => leg.moduleGates.map((g: any) => g.moduleId)))];
    const [{ data: modules }, { data: lessons }] = await Promise.all([
      supabase.from("modules").select("*").in("id", moduleIds),
      supabase.from("lessons").select("*").eq("status", "published").in("module_id", moduleIds)
    ]);
    resolved = resolveBlueprintSyllabus(
      { blueprint, modules: modules ?? [], lessons: lessons ?? [] },
      countryKey,
      destination?.language_id ?? null
    );
  }

  if (!resolved && !tripType) {
    return new Response(JSON.stringify({ error: `Unknown trip type "${tripKey}"` }), { status: 400, headers: CORS_HEADERS });
  }
  const syllabusWeeks = resolved ? resolved.weeks : legacySyllabus(tripType);

  const { data: course, error: insertError } = await supabase
    .from("courses")
    .insert({
      user_id: user.id,
      country_key: countryKey,
      trip_key: tripKey,
      weeks: syllabusWeeks.length,
      syllabus: syllabusWeeks,
      legs: resolved ? resolved.legs : null,
      current_week: 1,
      status: "active",
      notes: notes || "",
      travel_start: startDate || null,
      travel_end: endDate || null,
      feedback_submitted: false,
      feedback: null
    })
    .select()
    .single();

  if (insertError) return new Response(JSON.stringify({ error: insertError.message }), { status: 400, headers: CORS_HEADERS });
  return new Response(JSON.stringify(course), { status: 200, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
});
