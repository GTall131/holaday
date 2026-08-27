// Pure content-resolution logic shared by the finalize-course Edge
// Function (supabase/content/functions/finalize-course — deployed as a
// manual copy of this file until CLI-based deploys let it import this
// package directly) and, eventually, the admin app's live preview.
// Ported from apps/traveler/src/store.js's resolveBlueprintGateLessons/
// resolveBlueprintSyllabus and data/tripTypes.js's syllabus(). No React
// or Supabase imports belong here — it has to run unchanged inside a
// Deno Edge Function.

// A bespoke Module/Lesson "applies to" a country either because it's
// pinned to that exact country, or because it's language-wide and the
// country's languageId matches — mirrors store.js's
// lessonMatchesGridCountry, operating on already-fetched rows (with
// snake_case columns, as returned by supabase-js) instead of `state`.
function lessonMatchesGridCountry(lesson, countryKey, countryLanguageId) {
  if (lesson.scope !== "country-specific") return false;
  if (lesson.language_wide) return !!countryLanguageId && lesson.language_id === countryLanguageId;
  return lesson.country_key === countryKey;
}

// Every published Lesson gated into this (moduleId, tier) cell for
// this country — a Tier can carry more than one Lesson, and a
// traveler's syllabus includes all of them, not just one.
export function resolveBlueprintGateLessons({ modules, lessons }, gate, countryKey, countryLanguageId) {
  const mod = modules.find(m => m.id === gate.moduleId);
  if (!mod) return [];
  return lessons.filter(l =>
    l.status === "published" &&
    l.module_id === mod.id &&
    l.tier === gate.tier &&
    (mod.kind === "generic" ? l.scope === "generic" : lessonMatchesGridCountry(l, countryKey, countryLanguageId))
  );
}

// Resolves a traveler's (countryKey, tripKey) against a published
// Blueprint, one syllabus entry per gated Lesson in Leg order. Skips
// empty Legs and any gate that fails to resolve for this specific
// country. Returns null if nothing resolves — the caller falls back to
// legacySyllabus() below, same as store.js's finalizeCourse does today.
export function resolveBlueprintSyllabus({ blueprint, modules, lessons }, countryKey, countryLanguageId) {
  if (!blueprint) return null;
  const legs = [];
  const weeks = [];
  blueprint.legs.forEach(leg => {
    if (!leg.moduleGates.length) return;
    const legIndex = legs.length;
    let legUsed = false;
    leg.moduleGates.forEach(gate => {
      const gateLessons = resolveBlueprintGateLessons({ modules, lessons }, gate, countryKey, countryLanguageId);
      if (!gateLessons.length) return;
      if (!legUsed) { legs.push({ name: leg.name, blurb: leg.blurb }); legUsed = true; }
      gateLessons.forEach(lesson => {
        weeks.push({ title: lesson.title, type: lesson.type, source: "authored", legIndex, lessonId: lesson.id });
      });
    });
  });
  if (!weeks.length) return null;
  return { legs, weeks };
}

// Generic syllabus shell for Trip Types with no published Blueprint
// yet — ported verbatim from data/tripTypes.js's syllabus(), just
// taking the fetched trip_types row instead of the hardcoded
// TRIP_TYPES constant.
export function legacySyllabus(tripType) {
  const all = [
    { title: "Airport & Arrival Essentials", type: "Phrase" },
    { title: tripType.lesson2, type: "Phrase" },
    { title: "Public Transport & Getting Around", type: "Culture" },
    { title: "Local Etiquette Deep-Dive", type: "Culture" },
    { title: "Numbers, Time & Directions", type: "Phrase" },
    { title: "Food, Drink & Dining Out", type: "Phrase" },
    { title: "Handling the Unexpected", type: "Phrase" },
    { title: "Review & Trip-Ready Checkpoint", type: "Culture" }
  ];
  return all.slice(0, tripType.weeks).map(w => ({ ...w, source: "legacy", legIndex: null, lessonId: null }));
}

// ----------------------------------------------------------------
// Shared by the admin app (live Lesson preview, destination-creation
// flag preview, CSV-field parsing) and the traveler app (rendering a
// real published Lesson's beats) — ported from store.js's shuffle/
// makeQuestion/adminQuestionToBeat, data/admin.js's buildFlagSvg, and
// store.js's parseCsv/slugify.
// ----------------------------------------------------------------
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function makeQuestion(promptText, correctText, distractorTexts) {
  const options = shuffle([correctText, ...distractorTexts]);
  return { q: promptText, options, correctIndex: options.indexOf(correctText) };
}

// Comma-separated fields (Question.distractors, Phrase.tags) are kept
// as the raw typed string in an authoring draft — not parsed to an
// array until something actually consumes them — so the text input
// stays a plain controlled field with no "we reformatted what you just
// typed" cursor jank.
export function parseCsv(str) {
  return (str || "").split(",").map(s => s.trim()).filter(Boolean);
}

export function slugify(name) {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "destination";
}

export function buildFlagSvg(pattern, colours) {
  const p = colours.primary, s = colours.secondary, t = colours.tertiary;
  switch (pattern) {
    case "horizontal-tricolor":
      return `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="${s}"/><rect width="30" height="6.67" fill="${p}"/><rect y="13.33" width="30" height="6.67" fill="${t}"/></svg>`;
    case "circle-on-field":
      return `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="${s}"/><circle cx="15" cy="10" r="6" fill="${p}"/><circle cx="15" cy="10" r="6" fill="none" stroke="${t}" stroke-width="1.2"/></svg>`;
    case "cross-on-field":
      return `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="${t}"/><rect x="12" width="6" height="20" fill="${s}"/><rect y="7" width="30" height="6" fill="${s}"/><rect x="13.2" width="3.6" height="20" fill="${p}"/><rect y="8.2" width="30" height="3.6" fill="${p}"/></svg>`;
    case "vertical-tricolor":
    default:
      return `<svg viewBox="0 0 30 20"><rect width="10" height="20" fill="${p}"/><rect x="10" width="10" height="20" fill="${s}"/><rect x="20" width="10" height="20" fill="${t}"/></svg>`;
  }
}

// ----------------------------------------------------------------
// Module/Blueprint publish-gating — operates on already-fetched rows
// (snake_case) rather than the admin app's in-memory state.adminModules
// /state.adminLessons cache. Used by the publish-record Edge Function
// to re-validate gating server-side before flipping status to
// published, not just trusting the client's own check (mirrors
// apps/admin/src/store.js's moduleIsComplete/blueprintIsPublishable).
// ----------------------------------------------------------------
function countryLanguageId(countryKey, destinations) {
  const d = destinations.find(x => x.country_key === countryKey);
  return d ? d.language_id : null;
}
function moduleGridRows(mod, destinations) {
  if (mod.kind === "generic") return [null];
  if (mod.language_wide) {
    return destinations.filter(d => d.status === "published" && d.language_id === mod.language_id).map(d => d.country_key);
  }
  return mod.country_key ? [mod.country_key] : [];
}
function moduleLessonCandidates(mod, tier, countryKey, lessons, destinations) {
  return lessons.filter(l =>
    l.module_id === mod.id &&
    l.tier === tier &&
    (mod.kind === "generic" ? l.scope === "generic" : lessonMatchesGridCountry(l, countryKey, countryLanguageId(countryKey, destinations)))
  );
}
const CELL_STATUS_RANK = { missing: 0, archived: 0, draft: 1, staged: 2, published: 3 };
function moduleCellStatus(mod, tier, countryKey, lessons, destinations) {
  const candidates = moduleLessonCandidates(mod, tier, countryKey, lessons, destinations);
  if (!candidates.length) return "missing";
  return candidates.reduce((best, l) => CELL_STATUS_RANK[l.status] > CELL_STATUS_RANK[best] ? l.status : best, "missing");
}
// Every cell a Module claims (every Tier, for every country it's
// gridded against) must itself be Published before the Module can be.
export function moduleIsComplete(mod, lessons, destinations) {
  const rows = moduleGridRows(mod, destinations);
  if (!rows.length) return false;
  for (const countryKey of rows) {
    for (let tier = 1; tier <= mod.tier_count; tier++) {
      if (moduleCellStatus(mod, tier, countryKey, lessons, destinations) !== "published") return false;
    }
  }
  return true;
}
// A Blueprint can publish once every Module it gates in is itself
// Published — it doesn't need to re-walk tiers/countries itself,
// because moduleIsComplete already guarantees that.
export function blueprintIsPublishable(bp, modules) {
  const allGates = bp.legs.flatMap(leg => leg.moduleGates);
  if (!allGates.length) return false;
  return allGates.every(gate => {
    const mod = modules.find(m => m.id === gate.moduleId);
    return mod && mod.status === "published";
  });
}

// Turns a Question (produce/comprehend/symbol/situational) into the
// exact beat shape the traveler lesson renderer expects — the same
// path both the admin Lesson editor's live preview and the traveler
// app's real lesson rendering use, so the traveler is provably looking
// at the same rendering the author checked before publishing. Callers
// resolve `phrase`/`distractorPhrases` themselves (each `{en, local}`)
// since where they come from differs: the admin app's in-memory
// adminPhrases cache vs. the traveler app's published-phrases fetch.
export function questionToBeat(q, { phrase, distractorPhrases } = {}) {
  if ((q.kind === "produce" || q.kind === "comprehend") && q.source === "phrase") {
    if (!phrase) return null;
    const pool = distractorPhrases || [];
    if (q.kind === "comprehend") {
      const mq = makeQuestion(q.question, phrase.en, pool.map(p => p.en));
      return { kind: "comprehend", context: q.context, heard: phrase.local, ...mq };
    }
    const mq = makeQuestion(`How do you say "${phrase.en}"?`, phrase.local, pool.map(p => p.local));
    return { kind: "produce", context: q.context, ...mq };
  }
  const mq = makeQuestion(q.question, q.correctAnswer, parseCsv(q.distractors));
  if (q.kind === "symbol") return { kind: "symbol", context: q.context, symbol: q.symbol, ...mq };
  if (q.kind === "comprehend") return { kind: "comprehend", context: q.context, heard: q.heard, ...mq };
  return { kind: q.kind, context: q.context, ...mq };
}
