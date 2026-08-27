import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import Anthropic from "npm:@anthropic-ai/sdk";

// Replaces store.js's fakeGeneratePersonaDetails with a real model
// call. Deployed in holaday-admin (not holaday-content) — no
// cross-project write here, so the incoming JWT verifies normally
// against this project's own auth and `is_admin()` gates it like
// every other write. The Anthropic API key lives in the `secrets`
// table (service-role-only read — see 0005_secrets_table.sql) since
// there's no tool available to set a custom Edge Function secret.
const AI_TELLS_GUIDANCE = `Avoid anything that reads like typical AI-generated copy: no stock transition phrases ("in today's fast-paced world", "whether you're... or...", "it's important to note", "let's dive in"), no reflexive rule-of-three adjective lists, no hedging or meta-commentary about what you're doing, no unnaturally uniform sentence rhythm. Write like a specific person with real, concrete observations — not boilerplate.`;

const SYSTEM = `You are a senior content strategist for Holaday, a trip-prep language & culture app. Given a short, rough persona outline written by a content author, flesh it out into a specific, grounded traveler persona used to guide what phrases and lessons get created for people like them. Be concrete: cite specific situations and motivations, not abstractions. ${AI_TELLS_GUIDANCE}`;

const TOOL: Anthropic.Tool = {
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
  // @ts-ignore strict tool use — no beta header required
  strict: true
};

Deno.serve(async (req: Request) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) return new Response(JSON.stringify({ error: "Not an admin user" }), { status: 403 });

  const { personaId } = await req.json();
  const { data: persona, error: fetchError } = await supabase.from("personas").select("*").eq("id", personaId).single();
  if (fetchError || !persona) return new Response(JSON.stringify({ error: "Persona not found" }), { status: 404 });
  if (!persona.outline?.trim()) return new Response(JSON.stringify({ error: "Persona has no outline" }), { status: 400 });

  const serviceClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: secret, error: secretError } = await serviceClient.from("secrets").select("value").eq("key", "anthropic_api_key").single();
  if (secretError || !secret) return new Response(JSON.stringify({ error: "Anthropic API key not configured" }), { status: 500 });

  const anthropic = new Anthropic({ apiKey: secret.value });
  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    system: SYSTEM,
    tools: [TOOL],
    tool_choice: { type: "tool", name: "persona_profile" },
    messages: [{ role: "user", content: `Outline: ${persona.outline}` }]
  });

  const toolUse = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!toolUse) return new Response(JSON.stringify({ error: "Model did not return a profile" }), { status: 502 });
  const profile = toolUse.input as Record<string, string>;

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
  if (updateError) return new Response(JSON.stringify({ error: updateError.message }), { status: 400 });

  return new Response(JSON.stringify({ ok: true, persona: updated }), { status: 200, headers: { "Content-Type": "application/json" } });
});
