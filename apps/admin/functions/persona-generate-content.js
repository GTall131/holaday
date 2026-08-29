import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";

// Cloudflare Pages Function, co-located with the admin app — see
// persona-flesh.js's header for the same-origin / native-secret
// rationale this and that function share.
//
// Replaces store.js's generateContentFromPersona stub with a real
// generate-then-judge pipeline: each attempt generates a candidate
// Module/Lesson/Phrase bundle, then a second, independent model call
// scores it against four pass/fail criteria before anything is
// written. Only a passing candidate is written, as ordinary Draft rows
// tagged generated_from_persona_id — same review/stage/publish gate as
// hand-authored content. Up to 2 attempts total: a rejected first
// attempt is retried once, with the judge's specific feedback fed back
// into the regeneration prompt.
const TRIP_TYPE_LABELS = {
  city: "City Break", beach: "Beach Escape", food: "Food & Wine",
  family: "Family Trip", adventure: "Adventure & Outdoors", business: "Business Trip"
};

const AI_TELLS_GUIDANCE = `Avoid anything that reads like typical AI-generated copy: no stock transition phrases ("in today's fast-paced world", "whether you're... or...", "it's important to note", "let's dive in"), no reflexive rule-of-three adjective lists, no hedging or meta-commentary about what you're doing, no unnaturally uniform sentence rhythm. Write like a specific person with real, concrete observations — not boilerplate.`;

const GENERATE_SYSTEM = `You are a senior content strategist for Holaday, a trip-prep language & culture app. Given a fleshed-out traveler persona and a specific destination + trip type, generate a starter content bundle: one thematic Module name, one Lesson title, 5-8 real Phrases (English, the destination's local language, a transliteration, and comma-separated tags) directly relevant to this persona's stated motivations and pain points for this specific trip, and a matching set of Questions that reference those phrases by index and mix "produce" ("how do you say X?") and "comprehend" ("they said the local phrase — what does it mean?") kinds. Translations must be real, plausible local-language text — never placeholder text. ${AI_TELLS_GUIDANCE}`;

const JUDGE_SYSTEM = `You are a strict quality reviewer for Holaday's content pipeline. You'll be shown a traveler persona and a candidate content bundle generated for them. Score the bundle against four independent criteria, each pass/fail with a one-sentence reason. Be strict — only pass a criterion if it clearly earns it.
1. relevance — does the bundle directly serve this persona's stated motivations/pain points for this specific trip, rather than generic travel content that could apply to anyone?
2. tone — is the copy specific and human, matching a practical, encouraging trip-prep app voice, not generic corporate travel-blog tone?
3. plausibility — are the local-language phrases and transliterations real, specific, plausible translations, not placeholder text or obviously wrong?
4. aiTells — is the copy free of common AI-generated writing hallmarks: stock transition phrases, reflexive rule-of-three lists, hedging/meta-commentary, unnaturally uniform sentence structure? A single stylistic tic is fine; a pattern of these tells is not.`;

const GENERATE_TOOL = {
  name: "content_bundle",
  description: "A starter Module/Lesson/Phrase bundle for a persona's trip",
  input_schema: {
    type: "object",
    properties: {
      moduleName: { type: "string" },
      lessonTitle: { type: "string" },
      phrases: {
        type: "array", minItems: 5, maxItems: 8,
        items: {
          type: "object",
          properties: {
            en: { type: "string" },
            local: { type: "string" },
            translit: { type: "string" },
            tags: { type: "string" }
          },
          required: ["en", "local", "translit", "tags"],
          additionalProperties: false
        }
      },
      questions: {
        type: "array", minItems: 5,
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["produce", "comprehend"] },
            context: { type: "string", description: "Scenario framing, e.g. 'You sit down and a waiter hands you a menu.'" },
            phraseIndex: { type: "integer", description: "Index into the phrases array this question is built from" },
            question: { type: "string", description: "Only for comprehend kind — the prompt asked, e.g. 'What are they asking?'" }
          },
          required: ["kind", "context", "phraseIndex", "question"],
          additionalProperties: false
        }
      }
    },
    required: ["moduleName", "lessonTitle", "phrases", "questions"],
    additionalProperties: false
  },
  strict: true
};

const JUDGE_TOOL = {
  name: "judge_verdict",
  description: "A scored review of a candidate content bundle",
  input_schema: {
    type: "object",
    properties: {
      relevance: { type: "object", properties: { pass: { type: "boolean" }, note: { type: "string" } }, required: ["pass", "note"], additionalProperties: false },
      tone: { type: "object", properties: { pass: { type: "boolean" }, note: { type: "string" } }, required: ["pass", "note"], additionalProperties: false },
      plausibility: { type: "object", properties: { pass: { type: "boolean" }, note: { type: "string" } }, required: ["pass", "note"], additionalProperties: false },
      aiTells: { type: "object", properties: { pass: { type: "boolean" }, note: { type: "string" } }, required: ["pass", "note"], additionalProperties: false }
    },
    required: ["relevance", "tone", "plausibility", "aiTells"],
    additionalProperties: false
  },
  strict: true
};

function personaBrief(persona){
  return `Persona: ${persona.name}
Summary: ${persona.summary}
Age range: ${persona.age_range}
Travel style: ${persona.travel_style}
Motivations: ${persona.motivations}
Pain points: ${persona.pain_points}
Vocab focus: ${persona.vocab_focus}`;
}

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

  const { personaId, countryKey, tripKey } = await request.json();
  const [{ data: persona, error: personaError }, { data: destination, error: destError }] = await Promise.all([
    supabase.from("personas").select("*").eq("id", personaId).single(),
    supabase.from("destinations").select("*").eq("country_key", countryKey).eq("status", "published").single()
  ]);
  if (personaError || !persona) return json({ error: "Persona not found" }, 404);
  if (destError || !destination) return json({ error: "Destination not found" }, 404);
  const tripLabel = TRIP_TYPE_LABELS[tripKey];
  if (!tripLabel) return json({ error: "Unknown trip type" }, 400);

  if (!env.ANTHROPIC_API_KEY) return json({ error: "Anthropic API key not configured" }, 500);
  const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

  const brief = personaBrief(persona);
  const tripContext = `Destination: ${destination.name}. Trip type: ${tripLabel}.`;

  let candidate = null;
  let lastFeedback = "";
  const MAX_ATTEMPTS = 2;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++){
    const userTurn = attempt === 1
      ? `${brief}\n\n${tripContext}`
      : `${brief}\n\n${tripContext}\n\nYour previous attempt was rejected by review. Feedback: ${lastFeedback}\nRevise accordingly and try again.`;

    let genResponse, judgeResponse;
    try {
      genResponse = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 4000,
        system: GENERATE_SYSTEM,
        tools: [GENERATE_TOOL],
        tool_choice: { type: "tool", name: "content_bundle" },
        messages: [{ role: "user", content: userTurn }]
      });
    } catch (err) {
      console.error("persona-generate-content: generate call failed", err);
      return json({ error: `Anthropic generate call failed: ${err.message || err}` }, 502);
    }
    const genToolUse = genResponse.content.find(b => b.type === "tool_use");
    if (!genToolUse) return json({ error: "Model did not return a content bundle" }, 502);
    const bundle = genToolUse.input;

    try {
      judgeResponse = await anthropic.messages.create({
        model: "claude-sonnet-5",
        max_tokens: 1500,
        system: JUDGE_SYSTEM,
        tools: [JUDGE_TOOL],
        tool_choice: { type: "tool", name: "judge_verdict" },
        messages: [{ role: "user", content: `${brief}\n\n${tripContext}\n\nCandidate bundle:\n${JSON.stringify(bundle, null, 2)}` }]
      });
    } catch (err) {
      console.error("persona-generate-content: judge call failed", err);
      return json({ error: `Anthropic judge call failed: ${err.message || err}` }, 502);
    }
    const judgeToolUse = judgeResponse.content.find(b => b.type === "tool_use");
    if (!judgeToolUse) return json({ error: "Judge did not return a verdict" }, 502);
    const verdict = judgeToolUse.input;

    const approved = verdict.relevance.pass && verdict.tone.pass && verdict.plausibility.pass && verdict.aiTells.pass;
    if (approved){
      candidate = bundle;
      break;
    }
    lastFeedback = [verdict.relevance, verdict.tone, verdict.plausibility, verdict.aiTells]
      .filter(c => !c.pass).map(c => c.note).join(" ");
  }

  if (!candidate){
    return json({ error: `Generated content didn't pass quality review after ${MAX_ATTEMPTS} attempts: ${lastFeedback}` }, 422);
  }

  const { data: mod, error: modError } = await supabase.from("modules").insert({
    status: "draft", version: 1, name: candidate.moduleName, kind: "bespoke", tier_count: 1,
    language_id: destination.language_id, language_wide: false, country_key: countryKey,
    generated_from_persona_id: persona.id
  }).select().single();
  if (modError) return json({ error: modError.message }, 400);

  const { data: phraseRows, error: phraseError } = await supabase.from("phrases").insert(
    candidate.phrases.map(p => ({
      status: "draft", version: 1, en: p.en, local: p.local, translit: p.translit,
      tags: p.tags.split(",").map(t => t.trim()).filter(Boolean),
      language_id: destination.language_id, language_wide: false, country_key: countryKey,
      generated_from_persona_id: persona.id
    }))
  ).select();
  if (phraseError) return json({ error: phraseError.message }, 400);

  const { data: lesson, error: lessonError } = await supabase.from("lessons").insert({
    status: "draft", version: 1, title: candidate.lessonTitle, type: "Phrase",
    module_id: mod.id, tier: 1, scope: "country-specific",
    language_id: destination.language_id, language_wide: false, country_key: countryKey,
    questions: candidate.questions.map(q => ({
      kind: q.kind, context: q.context, question: q.question || "", correctAnswer: "", distractors: "",
      symbol: "", heard: "", source: "phrase", phraseId: phraseRows[q.phraseIndex]?.id ?? null
    })),
    generated_from_persona_id: persona.id
  }).select().single();
  if (lessonError) return json({ error: lessonError.message }, 400);

  return json({ ok: true, module: mod, lesson, phrases: phraseRows });
}
