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
