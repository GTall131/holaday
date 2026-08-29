import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// Cloudflare Pages Function, co-located with the admin app — same
// origin, so store.js's callAdminPagesFunction hits it with a bare
// relative path. Replaces the earlier Supabase-hosted version:
// ANTHROPIC_API_KEY is a native Cloudflare Pages secret (project
// Settings > Environment variables) instead of the Postgres
// `secrets` table workaround, which only existed because Supabase
// Edge Functions had no tool available to set a custom secret.
const AI_TELLS_GUIDANCE = `Avoid anything that reads like typical AI-generated copy: no stock transition phrases ("in today's fast-paced world", "whether you're... or...", "it's important to note", "let's dive in"), no reflexive rule-of-three adjective lists, no hedging or meta-commentary about what you're doing, no unnaturally uniform sentence rhythm. Write like a specific person with real, concrete observations — not boilerplate.`;

const SYSTEM = `You are a senior content strategist for Holaday, a trip-prep language & culture app. Given a short, rough persona outline written by a content author, flesh it out into a specific, grounded traveler persona used to guide what phrases and lessons get created for people like them. Be concrete: cite specific situations and motivations, not abstractions. ${AI_TELLS_GUIDANCE}`;

const TOOL = {
  name: "persona_profile",
  description: "A fleshed-out traveler persona profile",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "A short, specific name for this persona, e.g. 'The Cautious Foodie'" },
      summary: { type: "string", description: "2-3 sentences" },
      ageRange: { type: "string" },
      travelStyle: { type: "string" },
      motivations: { type: "string" },
      painPoints: { type: "string" },
      vocabFocus: { type: "string", description: "comma-separated vocab focus tags, e.g. 'ordering food, allergies, small talk'" }
    },
    required: ["name", "summary", "ageRange", "travelStyle", "motivations", "painPoints", "vocabFocus"],
    additionalProperties: false
  },
  strict: true
};

function json(body, status = 200){
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

export async function onRequestPost({ request, env }){
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return json({ error: "Unauthorized" }, 401);
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return json({ error: "Not an admin user" }, 403);

  const { personaId } = await request.json();
  const { data: persona, error: fetchError } = await supabase.from("personas").select("*").eq("id", personaId).single();
  if (fetchError || !persona) return json({ error: "Persona not found" }, 404);
  if (!persona.outline?.trim()) return json({ error: "Persona has no outline" }, 400);

  if (!env.ANTHROPIC_API_KEY) return json({ error: "Anthropic API key not configured" }, 500);
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  let response;
  try {
    response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 2000,
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "persona_profile" },
      messages: [{ role: "user", content: `Outline: ${persona.outline}` }]
    });
  } catch (err) {
    console.error("persona-flesh: Anthropic call failed", err);
    return json({ error: `Anthropic call failed: ${err.message || err}` }, 502);
  }

  const toolUse = response.content.find(b => b.type === "tool_use");
  if (!toolUse) return json({ error: "Model did not return a profile" }, 502);
  const profile = toolUse.input;

  const { data: updated, error: updateError } = await supabase.from("personas").update({
    generated: true,
    name: profile.name,
    summary: profile.summary,
    age_range: profile.ageRange,
    travel_style: profile.travelStyle,
    motivations: profile.motivations,
    pain_points: profile.painPoints,
    vocab_focus: profile.vocabFocus
  }).eq("id", personaId).select().single();
  if (updateError) return json({ error: updateError.message }, 400);

  return json({ ok: true, persona: updated });
}
