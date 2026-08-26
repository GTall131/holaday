// ================================================================
// STORE
// A single external mutable store (state + business logic), ported
// 1:1 from the original prototype's module-level `let` variables and
// pure functions. React components subscribe via useStore() (see
// useStore.js) and call the action functions exported below instead
// of dispatching data-action clicks through DOM delegation.
//
// Two things the original did with direct DOM manipulation are
// deliberately NOT ported here, because idiomatic React already
// solves the problem they existed for:
//   - "read form fields on submit, not on every keystroke" (to avoid
//     losing focus/cursor on a full innerHTML re-render) — controlled
//     inputs don't have that problem, so admin forms just bind
//     value+onChange straight to the draft.
//   - currentBeat/beatResult (per-question quiz state) — these are
//     now local state inside the Lesson/LessonPreview components,
//     which gives "going back re-presents the question fresh" for
//     free via a `key`-remount instead of a manual reset.
// ================================================================
import { COUNTRIES, COUNTRY_LANGUAGES } from "./data/countries";
import { TRIP_TYPES, syllabus } from "./data/tripTypes";
import { FLAGS } from "./data/flags";
import { ARRIVAL_BEAT_PLAN, EXPLORE_BEAT_PLAN } from "./data/beatPlans";
import { buildFlagSvg } from "./data/admin";

// ----------------------------------------------------------------
// Subscriber plumbing — a version counter is the "snapshot" handed
// to useSyncExternalStore; components read the real data straight
// off `state` during render, so any mutation just needs to bump the
// version and notify.
// ----------------------------------------------------------------
let version = 0;
const listeners = new Set();
export function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
export function getVersion(){ return version; }
function notify(){ version++; listeners.forEach(fn => fn()); }

// ----------------------------------------------------------------
// STATE
// `courses` starts empty — no seed/demo data — so Home.jsx always
// reflects only what the current session's user has actually
// generated. `stack` is a simple screen history so AppBar's back
// button works generically across every screen instead of being
// special-cased per screen (see push/pop/top below).
//
// TODO(admin): as a traveler, each course object here needs
// `currentLeg`/`totalLegs`/`legName` alongside the existing
// `currentWeek`/`weeks` (total weeks still matters for pacing against
// the travel date — see finalizeCourse below for where these get
// set). See ADMIN-CONTENT-PLAN.md §9, and the matching TODO in
// components/BoardRow.jsx.
// ----------------------------------------------------------------
export const state = {
  // traveler
  courses: [],
  draft: { countryKey: null, tripKey: null },
  stack: [{ name: "home" }],
  feedbackDraft: { score: null, cultureHelped: null },
  toastMsg: "",
  toastVisible: false,

  // admin — content bank (demo-phase, in-memory; see ADMIN-CONTENT-PLAN.md).
  // Every content type below (Destination/Module/Lesson/Phrase/
  // Blueprint) shares the same status lifecycle:
  //   draft -> staged -> published -> archived
  //   (staged can drop back to draft for further edits, no separate
  //   review/approval step — see ADMIN-CONTENT-PLAN.md §6)
  adminIdSeq: 1,
  adminLanguages: [],
  adminLanguageDraft: null,
  adminDestinations: [],
  adminDraft: null,
  adminDestinationsTab: "countries",
  adminDestinationsFilterCountry: "",
  adminLanguagesTab: "languages",
  adminLanguagesFilterLanguage: "",
  adminModules: [],
  adminModuleDraft: null,
  adminLessons: [],
  adminLessonDraft: null,
  adminLessonPreviewIndex: 0,
  adminPhrases: [],
  adminPhraseDraft: null,
  adminBlueprints: [],
  adminBlueprintDraft: null,
  adminBlueprintPreviewCountry: null,

  // Persona — an authoring input, not published content, so (like
  // Language) it has no draft/staged/published lifecycle of its own;
  // see the "ADMIN — Persona" section below.
  adminPersonas: [],
  adminPersonaDraft: null
};

function clone(x){ return JSON.parse(JSON.stringify(x)); }

// Comma-separated fields (Question.distractors, Phrase.tags) are kept
// as the raw typed string in the draft — not parsed to an array until
// something actually consumes them — so the text input stays a plain
// controlled field with no "we reformatted what you just typed"
// cursor jank.
export function parseCsv(str){
  return (str || "").split(",").map(s => s.trim()).filter(Boolean);
}

export function slugify(name){
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "destination";
}
function nextAdminId(prefix){ return prefix + "-" + (state.adminIdSeq++); }

// ----------------------------------------------------------------
// Language — a lightweight taxonomy dimension, not staged/published
// content. Every Country names one Language it uses; Modules/Lessons
// authored as "applies to all countries using this language" resolve
// against whichever Countries currently carry that languageId.
// ----------------------------------------------------------------
export function ensureLanguage(name){
  let lang = state.adminLanguages.find(l => l.name.toLowerCase() === name.toLowerCase());
  if (!lang){
    lang = { id: nextAdminId("lang"), name };
    state.adminLanguages.push(lang);
  }
  return lang;
}

// ----------------------------------------------------------------
// Seeded with the one remaining hardcoded COUNTRIES entry (Japan) as
// a read-only-by-default "published" legacy row — kept only so the
// traveler-facing flow has something to generate a course against out
// of the box; every other destination is meant to be authored through
// this flow from a genuinely empty bank, the exact motivating example
// from ADMIN-CONTENT-PLAN.md §1/§2a. A legacy row can still be revised
// via "Create new draft version" (newDestinationVersion below), which
// produces a normal (non-legacy) draft that, once published, archives
// the legacy row. See travelerCountry() below for how a newly
// published destination becomes selectable in the traveler app
// immediately, without needing a matching COUNTRIES entry.
// ----------------------------------------------------------------
Object.values(COUNTRY_LANGUAGES).forEach(ensureLanguage);
state.adminDestinations = Object.entries(COUNTRIES).map(([key, c]) => ({
  id: nextAdminId("dest"),
  countryKey: key,
  status: "published",
  version: 1,
  legacy: true,
  data: {
    name: c.name,
    capital: c.capital,
    colours: { ...c.colours },
    flagPattern: null,
    cultureTip: c.cultureTip,
    languageId: ensureLanguage(COUNTRY_LANGUAGES[key]).id
  }
}));

export function adminFlagMarkup(record){
  if (record.legacy) return FLAGS[record.countryKey];
  return buildFlagSvg(record.data.flagPattern || "vertical-tricolor", record.data.colours);
}

export function publishedDestinations(){
  return state.adminDestinations.filter(d => d.status === "published");
}

// Unified country lookup for every traveler-facing screen: prefers the
// published Admin Destination record so a country authored and
// published through the admin surface "pulls through" into the
// traveler app immediately.
export function travelerCountry(countryKey){
  const dest = state.adminDestinations.find(d => d.countryKey === countryKey && d.status === "published");
  const legacy = COUNTRIES[countryKey];
  if (!dest && !legacy) return null;
  return {
    name: dest ? dest.data.name : legacy.name,
    capital: dest ? dest.data.capital : legacy.capital,
    colours: dest ? dest.data.colours : legacy.colours,
    cultureTip: dest ? dest.data.cultureTip : legacy.cultureTip,
    flag: dest ? adminFlagMarkup(dest) : FLAGS[countryKey],
    phrases: legacy ? legacy.phrases : travelerPhraseBank(countryKey),
    transport: legacy ? legacy.transport : null
  };
}

export function travelerPhraseBank(countryKey){
  const matches = state.adminPhrases.filter(p => p.status === "published" && phraseAppliesToCountry(p, countryKey));
  if (!matches.length) return null;
  return matches.map(p => ({ en: p.data.en, local: p.data.local, translit: p.data.translit }));
}

export function countryByKey(countryKey){
  return state.adminDestinations.find(d => d.countryKey === countryKey) || null;
}
// Countries currently published under a Language — deliberately
// computed live rather than stored on the Language/Module/Lesson, so
// a Country added later in an already-authored Language picks up
// "applies to all countries using this language" content without that
// content needing to be re-saved.
export function countriesForLanguage(languageId){
  return publishedDestinations().filter(d => d.data.languageId === languageId);
}
// Every Country an author can target with new content against this
// Language, regardless of the Country's own status — a Module or
// Lesson shouldn't have to wait on a Country being Published before
// work on it can start. Only Published countries count toward a
// Module's completeness/publishability though (see
// countriesForLanguage/moduleGridRows below) — that's a stricter,
// separate question about what's actually live for travelers.
export function activeCountriesForLanguage(languageId){
  return state.adminDestinations.filter(d => d.status !== "archived" && d.data.languageId === languageId);
}
export function languageName(languageId){
  const lang = state.adminLanguages.find(l => l.id === languageId);
  return lang ? lang.name : "Unknown language";
}
export function moduleScopeLabel(mod){
  if (mod.data.kind === "generic") return "Generic — every country";
  if (mod.data.languageWide) return `All countries using ${languageName(mod.data.languageId)}`;
  const country = countryByKey(mod.data.countryKey);
  return country ? country.data.name : "No country set";
}
export function lessonScopeLabel(lesson){
  if (lesson.data.scope === "generic") return "Generic — every country";
  if (lesson.data.languageWide) return `All countries using ${languageName(lesson.data.languageId)}`;
  const country = countryByKey(lesson.data.countryKey);
  return country ? country.data.name : "No country set";
}
export function phraseScopeLabel(phrase){
  if (phrase.data.languageWide) return `All countries using ${languageName(phrase.data.languageId)}`;
  const country = countryByKey(phrase.data.countryKey);
  return country ? country.data.name : "No country set";
}
// A bespoke Module/Lesson "applies to" a country either because it's
// pinned to that exact country, or because it's language-wide and the
// country's languageId matches — this is the hook that makes browsing
// modules/lessons for a Country also surface content authored against
// that Country's Language.
export function moduleAppliesToCountry(mod, countryKey){
  if (mod.data.kind === "generic") return true;
  if (mod.data.languageWide){
    const country = countryByKey(countryKey);
    return !!country && !!mod.data.languageId && country.data.languageId === mod.data.languageId;
  }
  return mod.data.countryKey === countryKey;
}
export function lessonAppliesToCountry(lesson, countryKey){
  if (lesson.data.scope === "generic") return true;
  if (lesson.data.languageWide){
    const country = countryByKey(countryKey);
    return !!country && !!lesson.data.languageId && country.data.languageId === lesson.data.languageId;
  }
  return lesson.data.countryKey === countryKey;
}
// Stricter match used for the tier-ladder grid/blueprint resolution:
// only a Lesson actually scoped to a country (bespoke, not "generic")
// can fill a bespoke Module's per-country cell — see
// moduleLessonCandidates below.
export function lessonMatchesGridCountry(lesson, countryKey){
  if (lesson.data.scope !== "country-specific") return false;
  if (lesson.data.languageWide){
    const country = countryByKey(countryKey);
    return !!country && !!lesson.data.languageId && country.data.languageId === lesson.data.languageId;
  }
  return lesson.data.countryKey === countryKey;
}
// A Phrase has no "generic" scope (unlike Module/Lesson) — it's always
// text in one specific local language, so it's always either pinned
// to one Country or language-wide across every Country using that
// Language.
export function phraseAppliesToCountry(phrase, countryKey){
  if (phrase.data.languageWide){
    const country = countryByKey(countryKey);
    return !!country && !!phrase.data.languageId && country.data.languageId === phrase.data.languageId;
  }
  return phrase.data.countryKey === countryKey;
}

export function moduleLessonCandidates(mod, tier, countryKey){
  return state.adminLessons.filter(l =>
    l.data.moduleId === mod.id &&
    l.data.tier === tier &&
    (mod.data.kind === "generic" ? l.data.scope === "generic" : lessonMatchesGridCountry(l, countryKey))
  );
}
const ADMIN_STATUS_RANK = { missing:0, archived:0, draft:1, staged:2, published:3 };
export function moduleCellStatus(mod, tier, countryKey){
  const candidates = moduleLessonCandidates(mod, tier, countryKey);
  if (!candidates.length) return "missing";
  return candidates.reduce((best, l) => ADMIN_STATUS_RANK[l.status] > ADMIN_STATUS_RANK[best] ? l.status : best, "missing");
}
// A language-wide bespoke Module's grid rows are every published
// country currently using its Language (see countriesForLanguage)
// rather than a fixed list, so the completeness grid (see
// screens/admin/AdminModuleDetail.jsx) stays accurate as new
// countries join that language.
export function moduleGridRows(mod){
  if (mod.data.kind === "generic") return [null];
  if (mod.data.languageWide) return countriesForLanguage(mod.data.languageId).map(d => d.countryKey);
  return mod.data.countryKey ? [mod.data.countryKey] : [];
}
// Publishing a Module is blocked until every cell it claims is itself
// Published — the gating cascade: a Blueprint only needs to check
// that every Module it gates in is itself Published (see
// blueprintIsPublishable below); it doesn't need to re-walk
// tiers/countries itself, because that's already guaranteed here.
export function moduleIsComplete(mod){
  const rows = moduleGridRows(mod);
  if (!rows.length) return false;
  for (const countryKey of rows){
    for (let tier = 1; tier <= mod.data.tierCount; tier++){
      if (moduleCellStatus(mod, tier, countryKey) !== "published") return false;
    }
  }
  return true;
}

export function phrasesForLesson(lessonData){
  if (lessonData.scope !== "country-specific" || !lessonData.languageId) return [];
  if (lessonData.languageWide){
    return state.adminPhrases.filter(p => p.data.languageWide && p.data.languageId === lessonData.languageId);
  }
  return state.adminPhrases.filter(p => phraseAppliesToCountry(p, lessonData.countryKey));
}

export function shuffle(arr){
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function makeQuestion(promptText, correctText, distractorTexts){
  const options = shuffle([correctText, ...distractorTexts]);
  return { q: promptText, options, correctIndex: options.indexOf(correctText) };
}
function produceBeat(phraseBank, index, context, distractorCount){
  const p = phraseBank[index];
  const pool = phraseBank.filter((_, i) => i !== index);
  const distractors = shuffle(pool).slice(0, distractorCount).map(x => x.local);
  const mq = makeQuestion(`How do you say "${p.en}"?`, p.local, distractors);
  return { kind:"produce", context, ...mq };
}
function comprehendBeat(phraseBank, index, context, question, distractorCount){
  const p = phraseBank[index];
  const pool = phraseBank.filter((_, i) => i !== index);
  const distractors = shuffle(pool).slice(0, distractorCount).map(x => x.en);
  const mq = makeQuestion(question, p.en, distractors);
  return { kind:"comprehend", context, heard:p.local, ...mq };
}
function symbolBeat(context, symbol, question, correct, distractors){
  const mq = makeQuestion(question, correct, distractors);
  return { kind:"symbol", context, symbol, ...mq };
}
function situationalBeat(scenario, context){
  const distractors = scenario.options.filter((_, i) => i !== scenario.correctIndex);
  const mq = makeQuestion(scenario.q, scenario.options[scenario.correctIndex], distractors);
  return { kind:"situational", context, ...mq };
}
function buildBeat(entry, phraseBank, distractorCount, scenario){
  switch (entry.kind){
    case "produce": return produceBeat(phraseBank, entry.phraseIndex, entry.context, distractorCount);
    case "comprehend": return comprehendBeat(phraseBank, entry.phraseIndex, entry.context, entry.question, distractorCount);
    case "symbol": return symbolBeat(entry.context, entry.symbol, entry.question, entry.correct, entry.distractors);
    case "situational": return situationalBeat(scenario, entry.context);
    default: return null;
  }
}
export function buildLessonBeats(country, trip, week){
  if (week === 3){
    const t = country.transport;
    return t.beatPlan.map(entry => buildBeat(entry, t.phrases, 2, t.scenario));
  }
  const plan = week === 1 ? ARRIVAL_BEAT_PLAN : EXPLORE_BEAT_PLAN;
  return plan.map(entry => buildBeat(entry, country.phrases, 2));
}

// Turns an admin-authored Question row into the exact beat shape the
// traveler lesson renderer expects, via the same path the Lesson
// editor's live preview uses — the traveler is looking at literally
// the same rendering the author checked before publishing.
export function adminQuestionToBeat(q, lessonData){
  if ((q.kind === "produce" || q.kind === "comprehend") && q.source === "phrase"){
    const phrase = q.phraseId ? state.adminPhrases.find(p => p.id === q.phraseId) : null;
    if (!phrase || phrase.status !== "published") return null;
    const pool = phrasesForLesson(lessonData).filter(p => p.status === "published" && p.id !== phrase.id);
    const distractorPhrases = shuffle(pool).slice(0, 3);
    if (q.kind === "comprehend"){
      const mq = makeQuestion(q.question, phrase.data.en, distractorPhrases.map(p => p.data.en));
      return { kind:"comprehend", context:q.context, heard:phrase.data.local, ...mq };
    }
    const mq = makeQuestion(`How do you say "${phrase.data.en}"?`, phrase.data.local, distractorPhrases.map(p => p.data.local));
    return { kind:"produce", context:q.context, ...mq };
  }
  const mq = makeQuestion(q.question, q.correctAnswer, parseCsv(q.distractors));
  if (q.kind === "symbol") return { kind:"symbol", context:q.context, symbol:q.symbol, ...mq };
  if (q.kind === "comprehend") return { kind:"comprehend", context:q.context, heard:q.heard, ...mq };
  return { kind:q.kind, context:q.context, ...mq };
}
function adminLessonBeats(lessonId){
  const lesson = state.adminLessons.find(l => l.id === lessonId);
  return lesson ? lesson.data.questions.map(q => adminQuestionToBeat(q, lesson.data)).filter(Boolean) : [];
}
export function courseLessonBeats(course, week){
  const entry = course.syllabus[week - 1];
  if (entry && entry.source === "authored") return adminLessonBeats(entry.lessonId);
  const country = travelerCountry(course.countryKey);
  if (!country.phrases) return [];
  const trip = TRIP_TYPES[course.tripKey];
  return buildLessonBeats(country, trip, week);
}
export function lessonMeta(week, country, trip){
  if (week === 3) return { title:"Public Transport & Getting Around", type:"Culture lesson" };
  if (week === 1) return { title:"Airport & Arrival Essentials", type:"Phrase lesson" };
  return { title:trip.lesson2, type:"Phrase lesson" };
}

// ----------------------------------------------------------------
// ADMIN — Trip Type Blueprint (§5)
//
// Simplification: authored against the existing hardcoded TRIP_TYPES
// keys (data/tripTypes.js) rather than also supporting "define a new
// Trip Type" — adding a wholly new trip type is really its own small
// Destination-shaped flow (name a thing, theme it) and isn't needed to
// demonstrate the Blueprint/Leg/gating machinery itself.
//
// Leg gating is deliberately cheap to compute: a Module's own Publish
// action already requires moduleIsComplete() above — every Tier it
// claims, for every country it claims, has a Published Lesson — so a
// Blueprint only needs to check that every Module it gates in is
// itself Published; it doesn't need to re-walk tiers/countries itself.
// ----------------------------------------------------------------
// Returns every published Lesson gated into this (moduleId, tier)
// cell for this country — a Tier can carry more than one Lesson, and
// a traveler's syllabus includes all of them, not just one (§6).
export function resolveBlueprintGateLessons(gate, countryKey){
  const mod = state.adminModules.find(m => m.id === gate.moduleId);
  if (!mod) return [];
  return state.adminLessons.filter(l =>
    l.status === "published" &&
    l.data.moduleId === mod.id &&
    l.data.tier === gate.tier &&
    (mod.data.kind === "generic" ? l.data.scope === "generic" : lessonMatchesGridCountry(l, countryKey))
  );
}
export function blueprintIsPublishable(bp){
  const allGates = bp.data.legs.flatMap(leg => leg.moduleGates);
  if (!allGates.length) return false;
  return allGates.every(gate => {
    const mod = state.adminModules.find(m => m.id === gate.moduleId);
    return mod && mod.status === "published";
  });
}
// Resolves a traveler's (countryKey, tripKey) against a published
// Blueprint for that Trip Type (§8/§9), one "week" per gated Module in
// Leg order. Skips empty Legs and any gate that fails to resolve for
// this specific country (only possible for a bespoke Module gated to a
// different country than the traveler picked — a published Blueprint
// otherwise guarantees every gate resolves, since Module publish itself
// requires every tier/country cell to already be a published Lesson).
// Returns null if there's no published Blueprint for this Trip Type,
// or nothing resolves for this country — the caller (finalizeCourse
// below) falls back to the legacy hardcoded syllabus() so unauthored
// Trip Types keep working.
export function resolveBlueprintSyllabus(countryKey, tripKey){
  const bp = state.adminBlueprints.find(b => b.status === "published" && b.data.tripKey === tripKey);
  if (!bp) return null;
  const legs = [];
  const weeks = [];
  bp.data.legs.forEach(leg => {
    if (!leg.moduleGates.length) return;
    const legIndex = legs.length;
    let legUsed = false;
    leg.moduleGates.forEach(gate => {
      const lessons = resolveBlueprintGateLessons(gate, countryKey);
      if (!lessons.length) return;
      if (!legUsed){ legs.push({ name: leg.name, blurb: leg.blurb }); legUsed = true; }
      lessons.forEach(lesson => {
        weeks.push({ title: lesson.data.title, type: lesson.data.type, source: "authored", legIndex, lessonId: lesson.id });
      });
    });
  });
  if (!weeks.length) return null;
  return { legs, weeks };
}

// ----------------------------------------------------------------
// NAVIGATION
// ----------------------------------------------------------------
export function top(){ return state.stack[state.stack.length - 1]; }
export function push(name, payload){ state.stack.push({ name, payload }); notify(); }
export function pop(){ if (state.stack.length > 1){ state.stack.pop(); notify(); } }
export function resetToHome(){ state.stack = [{ name: "home" }]; notify(); }
export function goAdmin(){ state.adminDraft = null; state.stack = [{ name: "admin-home" }]; notify(); }
export function goHome(){ resetToHome(); }
export function stubTab(){ showToast("Not in this prototype — out of scope for v1"); }
export function adminStub(msg){ showToast(msg || "Not built yet in this prototype"); }

let toastTimer = null;
export function showToast(msg){
  state.toastMsg = msg;
  state.toastVisible = true;
  notify();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toastVisible = false; notify(); }, 1600);
}

// ----------------------------------------------------------------
// TRAVELER FLOW
// ----------------------------------------------------------------
export function startCourse(){
  state.draft = { countryKey: null, tripKey: null };
  push("country");
}
export function selectCountry(countryKey){
  state.draft.countryKey = countryKey;
  push("trip");
}
export function selectTrip(tripKey){
  state.draft.tripKey = tripKey;
  notify();
}
export function confirmTrip({ notes, startDate, endDate }){
  push("generating", { countryKey: state.draft.countryKey, tripKey: state.draft.tripKey, notes, startDate, endDate });
}
// Departure/return dates are captured on TripDetails.jsx and stored
// here so tripEnded/needsFeedback (below) can check-on-render whether
// the trip has actually happened yet — see Feedback.jsx. `weeks`/
// pacing still comes from the trip-type default, not from the date
// range — see the OPEN QUESTION note in TripDetails.jsx.
//
// Resolves the traveler's Trip Type against a *published* Blueprint
// (ADMIN-CONTENT-PLAN.md §8/§9) rather than the flat TRIP_TYPES.weeks
// constant, when one exists for this Trip Type. `course.syllabus` is
// snapshotted here (each entry's `lessonId`, not a live Blueprint/
// Module lookup) so a Blueprint published later doesn't retroactively
// change the syllabus of a trip already in progress — the same effect
// the plan's "pin a templateVersion" note calls for, achieved by
// pinning the resolved Lesson ids instead of re-resolving from the
// Blueprint at render time. Trip Types with no published Blueprint
// yet fall back to the legacy hardcoded syllabus() (data/tripTypes.js)
// so the rest of the prototype's trip types keep working unauthored.
export function finalizeCourse(payload){
  const resolved = resolveBlueprintSyllabus(payload.countryKey, payload.tripKey);
  const syllabusWeeks = resolved
    ? resolved.weeks
    : syllabus(payload.tripKey).map(w => ({ title: w.title, type: w.type, source: "legacy", legIndex: null, lessonId: null }));
  const course = {
    id: "c" + Date.now(),
    countryKey: payload.countryKey,
    tripKey: payload.tripKey,
    weeks: syllabusWeeks.length,
    syllabus: syllabusWeeks,
    legs: resolved ? resolved.legs : null,
    currentWeek: 1,
    status: "active",
    notes: payload.notes || "",
    travelStart: payload.startDate,
    travelEnd: payload.endDate,
    feedbackSubmitted: false,
    feedback: null
  };
  state.courses.unshift(course);
  state.stack.pop();
  push("dashboard", { course });
}
// Check-on-render rather than a scheduled push notification (this
// prototype has no background/server component to run a scheduled job
// from) — called wherever a course is displayed (BoardRow.jsx,
// Dashboard.jsx), so the moment a user opens the app after their
// return date, the prompt is already there. `needsFeedback` is true
// once `travelEnd` is in the past and `feedbackSubmitted` is still
// false, regardless of whether the course's lessons were ever
// finished — a badly-prepared trip is exactly the case we most want
// feedback on, not just the well-completed ones. See Feedback.jsx for
// the rest of the rationale (why post-trip, why this survey shape).
export function tripEnded(course){
  return !!course.travelEnd && new Date(course.travelEnd) < new Date();
}
export function needsFeedback(course){
  return tripEnded(course) && !course.feedbackSubmitted;
}
export function openCourse(courseId){
  const course = state.courses.find(c => c.id === courseId);
  push("dashboard", { course });
}
export function openPhrasebook(){
  push("phrasebook", { course: top().payload.course });
}
// Intentional stub — see the "Download for offline use" rationale at
// the top of screens/Phrasebook.jsx.
export function downloadPhrasebook(){
  showToast("Download isn't wired up in this prototype");
}
export function openFeedback(){
  push("feedback", { course: top().payload.course });
}
export function feedbackScore(n){
  state.feedbackDraft.score = n;
  notify();
}
export function feedbackCulture(v){
  state.feedbackDraft.cultureHelped = v;
  notify();
}
export function resetFeedbackDraft(){
  state.feedbackDraft = { score: null, cultureHelped: null };
}
export function submitFeedback(notesText){
  const course = top().payload.course;
  course.feedbackSubmitted = true;
  course.feedback = {
    score: state.feedbackDraft.score,
    cultureHelped: state.feedbackDraft.cultureHelped,
    notes: notesText
  };
  showToast("Thanks for sharing your trip feedback");
  pop();
}
export function openLesson(week){
  push("lesson", { course: top().payload.course, week, stepIndex: 0 });
}
export function lessonStepContinue({ course, week, stepIndex, total }){
  if (stepIndex + 1 < total){
    push("lesson", { course, week, stepIndex: stepIndex + 1 });
    return;
  }
  const courseJustCompleted = course.currentWeek === week && course.currentWeek === course.weeks;
  if (course.currentWeek === week && course.currentWeek < course.weeks){
    course.currentWeek += 1;
  } else if (courseJustCompleted){
    course.status = "completed";
  }
  let toastMsg = "Lesson complete";
  if (course.legs){
    const finishedEntry = course.syllabus[week - 1];
    const nextEntry = course.syllabus[week];
    if (courseJustCompleted){
      toastMsg = "Trip-ready — every Leg complete!";
    } else if (finishedEntry && (!nextEntry || nextEntry.legIndex !== finishedEntry.legIndex)){
      const leg = course.legs[finishedEntry.legIndex];
      toastMsg = `${leg.name} complete — ${leg.blurb}`;
    }
  }
  showToast(toastMsg);
  while (state.stack.length && state.stack[state.stack.length - 1].name === "lesson") state.stack.pop();
  notify();
}

// ----------------------------------------------------------------
// ADMIN — Destination
// ----------------------------------------------------------------
export function openAdminDestinations(){
  state.adminDestinationsTab = "countries";
  state.adminDestinationsFilterCountry = "";
  push("admin-destinations");
}
export function setAdminDestinationsTab(tab){ state.adminDestinationsTab = tab; notify(); }
export function setAdminDestinationsFilterCountry(key){ state.adminDestinationsFilterCountry = key; notify(); }

export function newAdminDestination(){
  state.adminDraft = {
    id: null, countryKey: null, status: "draft", version: 1, legacy: false,
    data: {
      name: "", capital: "", languageId: null, newLanguageName: "",
      colours: { primary: "#BC002D", secondary: "#FFFFFF", tertiary: "#14181F" },
      flagPattern: "vertical-tricolor", cultureTip: ""
    }
  };
  push("admin-destination", { id: null });
}
export function openAdminDestination(id){
  state.adminDraft = null;
  push("admin-destination", { id });
}
// Re-primes the working copy the same way the original screen render
// did inline: only re-clone from the record when there isn't already
// a matching draft in progress.
export function primeAdminDestinationDraft(id){
  const record = id ? state.adminDestinations.find(d => d.id === id) : null;
  const canEdit = !record || record.status === "draft";
  if (canEdit && (!state.adminDraft || state.adminDraft.id !== id)){
    state.adminDraft = record ? clone(record) : state.adminDraft;
  }
  return { record, canEdit, view: canEdit ? state.adminDraft : record };
}
export function patchAdminDraft(patch){ Object.assign(state.adminDraft.data, patch); notify(); }

export function commitAdminDraft(status){
  const d = state.adminDraft.data;
  if (!d.name){ showToast("Destination name is required"); return false; }
  if (d.languageId === "__new__"){
    const newName = (d.newLanguageName || "").trim();
    if (!newName){ showToast("Type a name for the new language"); return false; }
    d.languageId = ensureLanguage(newName).id;
    d.newLanguageName = "";
  }
  if (!d.languageId){ showToast("Pick a language for this destination"); return false; }
  if (!state.adminDraft.id){
    state.adminDraft.id = nextAdminId("dest");
    state.adminDraft.countryKey = slugify(d.name);
    state.adminDraft.version = 1;
    state.adminDraft.legacy = false;
    state.adminDestinations.push(state.adminDraft);
  } else {
    const idx = state.adminDestinations.findIndex(x => x.id === state.adminDraft.id);
    if (idx >= 0) state.adminDestinations[idx] = state.adminDraft;
  }
  state.adminDraft.status = status;
  return true;
}
export function saveDraftDestination(){
  if (commitAdminDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminDraft.id }; notify(); }
}
export function stageDestination(){
  if (commitAdminDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminDraft.id }; notify(); }
}
export function unstageDestination(id){
  state.adminDestinations.find(d => d.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export function publishDestination(id){
  const rec = state.adminDestinations.find(d => d.id === id);
  state.adminDestinations
    .filter(d => d.countryKey === rec.countryKey && d.status === "published" && d.id !== rec.id)
    .forEach(d => { d.status = "archived"; });
  rec.status = "published";
  showToast(`${rec.data.name} is now live`);
  notify();
}
export function newDestinationVersion(id){
  const rec = state.adminDestinations.find(d => d.id === id);
  const copy = clone(rec);
  copy.id = nextAdminId("dest");
  copy.version = rec.version + 1;
  copy.status = "draft";
  copy.legacy = false;
  copy.data.flagPattern = copy.data.flagPattern || "vertical-tricolor";
  state.adminDestinations.push(copy);
  showToast("New draft version created");
  state.adminDraft = null;
  push("admin-destination", { id: copy.id });
}

// ----------------------------------------------------------------
// ADMIN — Language
// ----------------------------------------------------------------
export function openAdminLanguages(){
  state.adminLanguagesTab = "languages";
  state.adminLanguagesFilterLanguage = "";
  push("admin-languages");
}
export function setAdminLanguagesTab(tab){ state.adminLanguagesTab = tab; notify(); }
export function setAdminLanguagesFilterLanguage(id){ state.adminLanguagesFilterLanguage = id; notify(); }
export function newAdminLanguage(){
  state.adminLanguageDraft = { id: null, name: "" };
  push("admin-language", { id: null });
}
export function openAdminLanguage(id){
  state.adminLanguageDraft = null;
  push("admin-language", { id });
}
export function primeAdminLanguageDraft(id){
  const record = id ? state.adminLanguages.find(l => l.id === id) : null;
  const canEdit = true;
  if (canEdit && (!state.adminLanguageDraft || state.adminLanguageDraft.id !== id)){
    state.adminLanguageDraft = record ? clone(record) : state.adminLanguageDraft;
  }
  return { record, canEdit, view: canEdit ? state.adminLanguageDraft : record };
}
export function patchAdminLanguageDraft(patch){ Object.assign(state.adminLanguageDraft, patch); notify(); }
export function saveAdminLanguage(){
  const name = (state.adminLanguageDraft.name || "").trim();
  if (!name){ showToast("Language name is required"); return; }
  state.adminLanguageDraft.name = name;
  if (!state.adminLanguageDraft.id){
    state.adminLanguageDraft.id = nextAdminId("lang");
    state.adminLanguages.push(state.adminLanguageDraft);
  } else {
    const idx = state.adminLanguages.findIndex(l => l.id === state.adminLanguageDraft.id);
    if (idx >= 0) state.adminLanguages[idx] = state.adminLanguageDraft;
  }
  showToast("Language saved");
  top().payload = { id: state.adminLanguageDraft.id };
  notify();
}

// ----------------------------------------------------------------
// ADMIN — Module (§4) + Lesson (§3)
//
// A Lesson always names the Module + Tier it belongs to; a Module's
// "tier ladder completeness" grid (§4 step 3, see
// screens/admin/AdminModuleDetail.jsx) is derived by scanning Lessons
// for that (moduleId, tier[, countryKey]) rather than stored
// redundantly, so the two can never drift out of sync (see
// moduleLessonCandidates/moduleGridRows above). Publishing a Module is
// blocked until every cell it claims is itself Published
// (moduleIsComplete above) — the gating cascade from §6.
//
// Question authoring is a partial simplification of §3 step 2: the
// plan calls for a searchable, reusable Phrase/Question library
// ("attach by reference, only create new if nothing fits" — see §7).
// A produce/comprehend Question can now attach to a Phrase by
// reference (§7, Phrase section below) instead of hand-typing
// prompt/answer/distractors — but symbol/situational Questions, and
// any produce/comprehend Question an author chooses not to
// phrase-link, still author their content inline on the Lesson, not
// against a shared library.
// ----------------------------------------------------------------
export function newAdminModule(){
  state.adminModuleDraft = {
    id: null, status: "draft", version: 1,
    data: { name: "", kind: "generic", tierCount: 3, languageId: null, languageWide: false, countryKey: null }
  };
  push("admin-module", { id: null });
}
// Pressing "+ New module" from a Country screen (AdminDestinationDetail.jsx)
// inherits that Country's Language, defaulting to country-only
// (unticked) — pressing it from a Language screen (AdminLanguageDetail.jsx)
// instead defaults to language-wide (ticked). Two entry points, two
// defaults.
export function newAdminModuleForCountry(countryKey){
  const country = countryByKey(countryKey);
  state.adminModuleDraft = {
    id: null, status: "draft", version: 1,
    data: { name: "", kind: "bespoke", tierCount: 3, languageId: country ? country.data.languageId : null, languageWide: false, countryKey }
  };
  push("admin-module", { id: null });
}
export function newAdminModuleForLanguage(languageId){
  state.adminModuleDraft = {
    id: null, status: "draft", version: 1,
    data: { name: "", kind: "bespoke", tierCount: 3, languageId, languageWide: true, countryKey: null }
  };
  push("admin-module", { id: null });
}
export function openAdminModule(id){
  state.adminModuleDraft = null;
  push("admin-module", { id });
}
export function primeAdminModuleDraft(id){
  const record = id ? state.adminModules.find(m => m.id === id) : null;
  const canEdit = !record || record.status === "draft";
  if (canEdit && (!state.adminModuleDraft || state.adminModuleDraft.id !== id)){
    state.adminModuleDraft = record ? clone(record) : state.adminModuleDraft;
  }
  return { record, canEdit, view: canEdit ? state.adminModuleDraft : record };
}
export function patchAdminModuleDraft(patch){ Object.assign(state.adminModuleDraft.data, patch); notify(); }
export function commitAdminModuleDraft(status){
  const d = state.adminModuleDraft.data;
  if (!d.name){ showToast("Module name is required"); return false; }
  if (d.kind === "bespoke"){
    if (!d.languageId){ showToast("Pick a language for a bespoke module"); return false; }
    if (!d.languageWide && !d.countryKey){ showToast("Pick a country, or tick 'applies to all countries using this language'"); return false; }
  }
  if (!state.adminModuleDraft.id){
    state.adminModuleDraft.id = nextAdminId("mod");
    state.adminModuleDraft.version = 1;
    state.adminModules.push(state.adminModuleDraft);
  } else {
    const idx = state.adminModules.findIndex(m => m.id === state.adminModuleDraft.id);
    if (idx >= 0) state.adminModules[idx] = state.adminModuleDraft;
  }
  state.adminModuleDraft.status = status;
  return true;
}
export function saveDraftModule(){
  if (commitAdminModuleDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminModuleDraft.id }; notify(); }
}
export function stageModule(){
  if (commitAdminModuleDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminModuleDraft.id }; notify(); }
}
export function unstageModule(id){
  state.adminModules.find(m => m.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export function publishModule(id){
  const rec = state.adminModules.find(m => m.id === id);
  if (!moduleIsComplete(rec)){ showToast("Tier ladder isn't fully published yet"); return; }
  rec.status = "published";
  if (rec.supersedesId){
    const prev = state.adminModules.find(m => m.id === rec.supersedesId);
    if (prev) prev.status = "archived";
  }
  showToast(`${rec.data.name} is now live`);
  notify();
}
export function newModuleVersion(id){
  const rec = state.adminModules.find(m => m.id === id);
  const copy = clone(rec);
  copy.id = nextAdminId("mod");
  copy.version = rec.version + 1;
  copy.status = "draft";
  copy.supersedesId = rec.id;
  state.adminModules.push(copy);
  showToast("New draft version created");
  state.adminModuleDraft = null;
  push("admin-module", { id: copy.id });
}

// ----------------------------------------------------------------
// ADMIN — Lesson (§3)
// ----------------------------------------------------------------
export function blankAdminQuestion(symbolKeys){
  return {
    kind:"produce", context:"", question:"", correctAnswer:"", distractors:"",
    symbol:symbolKeys[0], heard:"", source:"custom", phraseId:null
  };
}
// Lessons are only created from inside a Module's tier grid
// (screens/admin/AdminModuleDetail.jsx) — the grid cell's click
// already pins moduleId/tier/countryKey, so there's no free-standing
// "pick a module from a dropdown after the fact" flow to keep in sync
// with the grid it feeds.
export function newAdminLessonForModule({ moduleId, tier, countryKey }){
  const country = countryKey ? countryByKey(countryKey) : null;
  state.adminLessonDraft = {
    id: null, status: "draft", version: 1,
    data: {
      title: "", type: "Phrase", moduleId, tier,
      scope: countryKey ? "country-specific" : "generic",
      languageId: country ? country.data.languageId : null, languageWide: false,
      countryKey: countryKey || null, questions: []
    }
  };
  state.adminLessonPreviewIndex = 0;
  push("admin-lesson", { id: null });
}
export function openAdminLesson(id){
  state.adminLessonDraft = null;
  push("admin-lesson", { id });
}
export function primeAdminLessonDraft(id){
  const record = id ? state.adminLessons.find(l => l.id === id) : null;
  const canEdit = !record || record.status === "draft";
  if (canEdit && (!state.adminLessonDraft || state.adminLessonDraft.id !== id)){
    state.adminLessonDraft = record ? clone(record) : state.adminLessonDraft;
    state.adminLessonPreviewIndex = 0;
  }
  const view = canEdit ? state.adminLessonDraft : record;
  if (canEdit && view) state.adminLessonPreviewIndex = Math.min(state.adminLessonPreviewIndex, Math.max(0, view.data.questions.length - 1));
  return { record, canEdit, view };
}
export function patchAdminLessonDraft(patch){ Object.assign(state.adminLessonDraft.data, patch); notify(); }
export function patchLessonQuestion(i, patch){ Object.assign(state.adminLessonDraft.data.questions[i], patch); notify(); }
export function addLessonQuestion(symbolKeys){
  state.adminLessonDraft.data.questions.push(blankAdminQuestion(symbolKeys));
  state.adminLessonPreviewIndex = state.adminLessonDraft.data.questions.length - 1;
  notify();
}
export function removeLessonQuestion(i){
  state.adminLessonDraft.data.questions.splice(i, 1);
  state.adminLessonPreviewIndex = Math.max(0, Math.min(state.adminLessonPreviewIndex, state.adminLessonDraft.data.questions.length - 1));
  notify();
}
export function stepLessonPreview(dir){
  state.adminLessonPreviewIndex = Math.max(0, Math.min(
    state.adminLessonPreviewIndex + dir,
    state.adminLessonDraft.data.questions.length - 1
  ));
  notify();
}
export function commitAdminLessonDraft(status){
  const d = state.adminLessonDraft.data;
  if (!d.title){ showToast("Lesson title is required"); return false; }
  if (!d.moduleId){ showToast("Pick a module for this lesson"); return false; }
  const mod = state.adminModules.find(m => m.id === d.moduleId);
  if (mod && d.tier > mod.data.tierCount){ showToast(`${mod.data.name} only goes up to Tier ${mod.data.tierCount}`); return false; }
  if (d.scope === "country-specific"){
    if (!d.languageId){ showToast("Pick a language for this lesson"); return false; }
    if (!d.languageWide && !d.countryKey){ showToast("Pick a country, or tick 'applies to all countries using this language'"); return false; }
  }
  if (status === "staged"){
    if (d.questions.length < 5){ showToast("Needs at least 5 questions before it can be staged"); return false; }
    if (new Set(d.questions.map(q => q.kind)).size < 2){ showToast("Mix at least 2 question kinds before staging — no single-style drills"); return false; }
    for (const q of d.questions){
      if (q.source === "phrase"){
        const phrase = q.phraseId ? state.adminPhrases.find(p => p.id === q.phraseId) : null;
        if (!phrase || phrase.status !== "published"){
          showToast("Every phrase-bank question needs a published Phrase before this lesson can be staged");
          return false;
        }
        if (q.kind === "comprehend" && !q.question.trim()){
          showToast("Every comprehend question needs a prompt, even when it's phrase-sourced");
          return false;
        }
      } else if (!q.question.trim() || !q.correctAnswer.trim() || parseCsv(q.distractors).length < 1){
        showToast("Every question needs prompt text, a correct answer, and at least one distractor");
        return false;
      }
    }
  }
  if (!state.adminLessonDraft.id){
    state.adminLessonDraft.id = nextAdminId("lsn");
    state.adminLessonDraft.version = 1;
    state.adminLessons.push(state.adminLessonDraft);
  } else {
    const idx = state.adminLessons.findIndex(l => l.id === state.adminLessonDraft.id);
    if (idx >= 0) state.adminLessons[idx] = state.adminLessonDraft;
  }
  state.adminLessonDraft.status = status;
  return true;
}
export function saveDraftLesson(){
  if (commitAdminLessonDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminLessonDraft.id }; notify(); }
}
export function stageLesson(){
  if (commitAdminLessonDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminLessonDraft.id }; notify(); }
}
export function unstageLesson(id){
  state.adminLessons.find(l => l.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export function publishLesson(id){
  const rec = state.adminLessons.find(l => l.id === id);
  rec.status = "published";
  if (rec.supersedesId){
    const prev = state.adminLessons.find(l => l.id === rec.supersedesId);
    if (prev) prev.status = "archived";
  }
  showToast(`${rec.data.title} is now live`);
  notify();
}
export function newLessonVersion(id){
  const rec = state.adminLessons.find(l => l.id === id);
  const copy = clone(rec);
  copy.id = nextAdminId("lsn");
  copy.version = rec.version + 1;
  copy.status = "draft";
  copy.supersedesId = rec.id;
  state.adminLessons.push(copy);
  showToast("New draft version created");
  state.adminLessonDraft = null;
  state.adminLessonPreviewIndex = 0;
  push("admin-lesson", { id: copy.id });
}

// ----------------------------------------------------------------
// ADMIN — Phrase (§2/§7)
//
// The reusable content-library entity ADMIN-CONTENT-PLAN.md §7
// describes: a Phrase carries the same draft/staged/published/archived
// lifecycle as everything else (§6), and a Lesson's produce/comprehend
// Questions can attach to one by reference instead of hand-typing
// prompt/answer/distractors (see phrasesForLesson / adminQuestionToBeat
// in the Lesson section above). Unlike Module/Lesson, a Phrase has no
// "generic" scope — it's always text in one specific local language,
// so it's always either pinned to one Country or language-wide.
// ----------------------------------------------------------------
export function blankAdminPhrase(){
  return { en: "", local: "", translit: "", tags: "", languageId: null, languageWide: false, countryKey: null };
}
export function newAdminPhrase(){
  state.adminPhraseDraft = { id: null, status: "draft", version: 1, supersedesId: null, data: blankAdminPhrase() };
  push("admin-phrase", { id: null });
}
export function newAdminPhraseForCountry(countryKey){
  const country = countryByKey(countryKey);
  state.adminPhraseDraft = {
    id: null, status: "draft", version: 1, supersedesId: null,
    data: { ...blankAdminPhrase(), languageId: country ? country.data.languageId : null, countryKey }
  };
  push("admin-phrase", { id: null });
}
export function newAdminPhraseForLanguage(languageId){
  state.adminPhraseDraft = {
    id: null, status: "draft", version: 1, supersedesId: null,
    data: { ...blankAdminPhrase(), languageId, languageWide: true }
  };
  push("admin-phrase", { id: null });
}
export function openAdminPhrase(id){
  state.adminPhraseDraft = null;
  push("admin-phrase", { id });
}
export function primeAdminPhraseDraft(id){
  const record = id ? state.adminPhrases.find(p => p.id === id) : null;
  const canEdit = !record || record.status === "draft";
  if (canEdit && (!state.adminPhraseDraft || state.adminPhraseDraft.id !== id)){
    state.adminPhraseDraft = record ? clone(record) : state.adminPhraseDraft;
  }
  return { record, canEdit, view: canEdit ? state.adminPhraseDraft : record };
}
export function patchAdminPhraseDraft(patch){ Object.assign(state.adminPhraseDraft.data, patch); notify(); }
export function commitAdminPhraseDraft(status){
  const d = state.adminPhraseDraft.data;
  if (!d.en){ showToast("English text is required"); return false; }
  if (!d.local){ showToast("Local-language text is required"); return false; }
  if (!d.languageId){ showToast("Pick a language for this phrase"); return false; }
  if (!d.languageWide && !d.countryKey){ showToast("Pick a country, or tick 'applies to all countries using this language'"); return false; }
  if (status === "staged" && !d.translit){ showToast("Transliteration is required before this phrase can be staged"); return false; }
  if (!state.adminPhraseDraft.id){
    state.adminPhraseDraft.id = nextAdminId("phr");
    state.adminPhraseDraft.version = 1;
    state.adminPhrases.push(state.adminPhraseDraft);
  } else {
    const idx = state.adminPhrases.findIndex(p => p.id === state.adminPhraseDraft.id);
    if (idx >= 0) state.adminPhrases[idx] = state.adminPhraseDraft;
  }
  state.adminPhraseDraft.status = status;
  return true;
}
export function saveDraftPhrase(){
  if (commitAdminPhraseDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminPhraseDraft.id }; notify(); }
}
export function stagePhrase(){
  if (commitAdminPhraseDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminPhraseDraft.id }; notify(); }
}
export function unstagePhrase(id){
  state.adminPhrases.find(p => p.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export function publishPhrase(id){
  const rec = state.adminPhrases.find(p => p.id === id);
  rec.status = "published";
  if (rec.supersedesId){
    const prev = state.adminPhrases.find(p => p.id === rec.supersedesId);
    if (prev) prev.status = "archived";
  }
  showToast(`"${rec.data.en}" is now live`);
  notify();
}
export function newPhraseVersion(id){
  const rec = state.adminPhrases.find(p => p.id === id);
  const copy = clone(rec);
  copy.id = nextAdminId("phr");
  copy.version = rec.version + 1;
  copy.status = "draft";
  copy.supersedesId = rec.id;
  state.adminPhrases.push(copy);
  showToast("New draft version created");
  state.adminPhraseDraft = null;
  push("admin-phrase", { id: copy.id });
}

// ----------------------------------------------------------------
// ADMIN — Trip Type Blueprint (§5)
// ----------------------------------------------------------------
export function blankLeg(name){
  return { name: name || "", blurb: "", moduleGates: [] };
}
export function openAdminBlueprints(){ push("admin-blueprints"); }
export function newAdminBlueprint(defaultTripKey, firstLegName){
  state.adminBlueprintDraft = {
    id: null, status: "draft", version: 1,
    data: { tripKey: defaultTripKey, legs: [blankLeg(firstLegName)] }
  };
  push("admin-blueprint", { id: null });
}
export function openAdminBlueprint(id){
  state.adminBlueprintDraft = null;
  push("admin-blueprint", { id });
}
export function primeAdminBlueprintDraft(id){
  const record = id ? state.adminBlueprints.find(b => b.id === id) : null;
  const canEdit = !record || record.status === "draft";
  if (canEdit && (!state.adminBlueprintDraft || state.adminBlueprintDraft.id !== id)){
    state.adminBlueprintDraft = record ? clone(record) : state.adminBlueprintDraft;
  }
  return { record, canEdit, view: canEdit ? state.adminBlueprintDraft : record };
}
export function patchAdminBlueprintDraft(patch){ Object.assign(state.adminBlueprintDraft.data, patch); notify(); }
export function addBlueprintLeg(nextLegName){
  const legs = state.adminBlueprintDraft.data.legs;
  if (legs.length < 4) legs.push(blankLeg(nextLegName));
  notify();
}
export function removeBlueprintLeg(i){
  state.adminBlueprintDraft.data.legs.splice(i, 1);
  notify();
}
export function patchBlueprintLeg(li, patch){
  Object.assign(state.adminBlueprintDraft.data.legs[li], patch);
  notify();
}
export function toggleBlueprintGate(li, moduleId, defaultTier){
  const leg = state.adminBlueprintDraft.data.legs[li];
  const idx = leg.moduleGates.findIndex(g => g.moduleId === moduleId);
  if (idx >= 0) leg.moduleGates.splice(idx, 1);
  else leg.moduleGates.push({ moduleId, tier: defaultTier || 1 });
  notify();
}
export function setBlueprintGateTier(li, moduleId, tier){
  const leg = state.adminBlueprintDraft.data.legs[li];
  const gate = leg.moduleGates.find(g => g.moduleId === moduleId);
  if (gate) gate.tier = tier;
  notify();
}
export function setBlueprintPreviewCountry(countryKey){
  state.adminBlueprintPreviewCountry = countryKey;
  notify();
}
// Defaults the dry-run preview to the first published destination the
// first time a Blueprint is opened (or if the previously-picked one
// stopped being published) — mirrors the original's inline check at
// the top of screenAdminBlueprint(), just moved into the store so it's
// not a raw module-scope mutation inside a component body.
export function ensureBlueprintPreviewCountry(){
  const dests = publishedDestinations();
  if (!state.adminBlueprintPreviewCountry || !dests.some(d => d.countryKey === state.adminBlueprintPreviewCountry)){
    state.adminBlueprintPreviewCountry = dests.length ? dests[0].countryKey : null;
  }
  return dests;
}
export function commitAdminBlueprintDraft(status){
  const d = state.adminBlueprintDraft.data;
  if (!d.legs.length){ showToast("Add at least one leg"); return false; }
  if (d.legs.some(leg => !leg.name)){ showToast("Every leg needs a name"); return false; }
  if (status === "staged" && !d.legs.some(leg => leg.moduleGates.length)){
    showToast("Gate at least one module into a leg before staging");
    return false;
  }
  if (!state.adminBlueprintDraft.id){
    state.adminBlueprintDraft.id = nextAdminId("bp");
    state.adminBlueprintDraft.version = 1;
    state.adminBlueprints.push(state.adminBlueprintDraft);
  } else {
    const idx = state.adminBlueprints.findIndex(b => b.id === state.adminBlueprintDraft.id);
    if (idx >= 0) state.adminBlueprints[idx] = state.adminBlueprintDraft;
  }
  state.adminBlueprintDraft.status = status;
  return true;
}
export function saveDraftBlueprint(){
  if (commitAdminBlueprintDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminBlueprintDraft.id }; notify(); }
}
export function stageBlueprint(){
  if (commitAdminBlueprintDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminBlueprintDraft.id }; notify(); }
}
export function unstageBlueprint(id){
  state.adminBlueprints.find(b => b.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export function publishBlueprint(id){
  const rec = state.adminBlueprints.find(b => b.id === id);
  if (!blueprintIsPublishable(rec)){ showToast("Every gated module needs to be published first"); return; }
  rec.status = "published";
  if (rec.supersedesId){
    const prev = state.adminBlueprints.find(b => b.id === rec.supersedesId);
    if (prev) prev.status = "archived";
  }
  showToast(`${TRIP_TYPES[rec.data.tripKey].label} blueprint is now live`);
  notify();
}
export function newBlueprintVersion(id){
  const rec = state.adminBlueprints.find(b => b.id === id);
  const copy = clone(rec);
  copy.id = nextAdminId("bp");
  copy.version = rec.version + 1;
  copy.status = "draft";
  copy.supersedesId = rec.id;
  state.adminBlueprints.push(copy);
  showToast("New draft version created");
  state.adminBlueprintDraft = null;
  push("admin-blueprint", { id: copy.id });
}

// ----------------------------------------------------------------
// ADMIN — cross-type aggregation (Staged screen)
// ----------------------------------------------------------------
export function allRecordsByStatus(status){
  return [
    ...state.adminDestinations.filter(d => d.status === status).map(d => ({ type: "destination", record: d })),
    ...state.adminModules.filter(m => m.status === status).map(m => ({ type: "module", record: m })),
    ...state.adminLessons.filter(l => l.status === status).map(l => ({ type: "lesson", record: l })),
    ...state.adminBlueprints.filter(b => b.status === status).map(b => ({ type: "blueprint", record: b })),
    ...state.adminPhrases.filter(p => p.status === status).map(p => ({ type: "phrase", record: p }))
  ];
}
export function openRecord(type, id){
  switch (type){
    case "destination": return openAdminDestination(id);
    case "module": return openAdminModule(id);
    case "lesson": return openAdminLesson(id);
    case "blueprint": return openAdminBlueprint(id);
    case "phrase": return openAdminPhrase(id);
    default: return undefined;
  }
}

// ----------------------------------------------------------------
// ADMIN — Persona (stub)
//
// Two stubbed features live here:
//   1. Author writes a rough outline -> a (fake, stubbed) LLM call
//      fleshes it out into a full profile -> author reviews/edits it.
//   2. From a fleshed-out Persona, author picks a Country + Trip Type
//      and generates starter content-bank rows (Module/Lesson/Phrases)
//      for that combination.
//
// Persona itself is an authoring input, not traveler-facing content,
// so — like Language — it has no draft/staged/published lifecycle:
// it's always directly editable, saved with a single "Save" action.
// The content it generates, though, lands as ordinary Drafts in the
// real Module/Lesson/Phrase tables, so it goes through the exact same
// review/staging/publish gate as anything hand-authored (see
// ADMIN-CONTENT-PLAN.md §6) rather than skipping review because a
// machine produced it.
// ----------------------------------------------------------------
function blankAdminPersonaData(){
  return {
    outline: "", generated: false,
    name: "", summary: "", ageRange: "", travelStyle: "", motivations: "", painPoints: "", vocabFocus: ""
  };
}
export function openAdminPersonas(){ push("admin-personas"); }
export function newAdminPersona(){
  state.adminPersonaDraft = { id: null, data: blankAdminPersonaData() };
  push("admin-persona", { id: null });
}
export function openAdminPersona(id){
  state.adminPersonaDraft = null;
  push("admin-persona", { id });
}
// Persona has no draft/staged split (see header note above) — always
// editable, so priming just re-clones from the record whenever the
// working copy doesn't already match, the same "don't stomp in-
// progress edits" guard the other primeX functions use.
export function primeAdminPersonaDraft(id){
  const record = id ? state.adminPersonas.find(p => p.id === id) : null;
  if (!state.adminPersonaDraft || state.adminPersonaDraft.id !== id){
    state.adminPersonaDraft = record ? clone(record) : state.adminPersonaDraft;
  }
  return { record, view: state.adminPersonaDraft };
}
export function patchAdminPersonaDraft(patch){ Object.assign(state.adminPersonaDraft.data, patch); notify(); }
export function saveAdminPersona(){
  const d = state.adminPersonaDraft.data;
  if (!d.outline.trim()){ showToast("Give the persona a rough outline first"); return; }
  if (!state.adminPersonaDraft.id){
    state.adminPersonaDraft.id = nextAdminId("per");
    state.adminPersonas.push(state.adminPersonaDraft);
  } else {
    const idx = state.adminPersonas.findIndex(p => p.id === state.adminPersonaDraft.id);
    if (idx >= 0) state.adminPersonas[idx] = state.adminPersonaDraft;
  }
  showToast("Persona saved");
  top().payload = { id: state.adminPersonaDraft.id };
  notify();
}

// --- STUB -------------------------------------------------------
// Stands in for a real "call an LLM to flesh out this persona"
// request. Deterministic and outline-driven only so the review step
// (AdminPersonaDetail) has something plausible to look at and edit —
// swap this out for a real model call later; everything downstream
// only depends on the returned field shape, not on how it's produced.
// ------------------------------------------------------------------
function fakeGeneratePersonaDetails(outline){
  const words = (outline || "").trim().split(/\s+/).filter(Boolean);
  const seed = words.find(w => w.replace(/[^a-zA-Z]/g, "").length > 3) || "Traveler";
  const label = seed.replace(/[^a-zA-Z]/g, "");
  const name = `The ${label.charAt(0).toUpperCase()}${label.slice(1).toLowerCase()}`;
  return {
    name,
    summary: `Generated from the outline: "${outline.trim()}". This is stub output — replace with a real model call, and treat every field here as a first draft to edit, not a final persona.`,
    ageRange: "25–40",
    travelStyle: "Independent, moderate budget, prefers authentic local experiences over tourist traps",
    motivations: "Wants to travel respectfully, avoid embarrassing mistakes, connect with locals",
    painPoints: "Limited time to prepare, anxious about language barriers, easily overwhelmed by grammar-heavy apps",
    vocabFocus: "greetings, directions, food ordering, politeness"
  };
}
// Called by the button on AdminPersonaDetail — just navigates to the
// generating animation; the actual (stub) generation happens in
// finalizePersonaGeneration below once that screen's fake steps finish,
// mirroring how Generating.jsx/finalizeCourse split "show motion" from
// "do the work".
export function startPersonaGeneration(id){
  push("admin-persona-generating", { id });
}
export function finalizePersonaGeneration(id){
  const persona = state.adminPersonas.find(p => p.id === id);
  if (!persona){ pop(); return; }
  Object.assign(persona.data, fakeGeneratePersonaDetails(persona.data.outline), { generated: true });
  if (state.adminPersonaDraft && state.adminPersonaDraft.id === id) state.adminPersonaDraft = clone(persona);
  pop();
  showToast("Persona details generated — review before use");
  notify();
}

// --- STUB -------------------------------------------------------
// Stands in for a real "generate lesson content for this persona +
// country + trip type" pipeline (LLM + phrase-bank retrieval). Creates
// one bespoke Module, one Lesson under its first Tier, and a handful
// of Phrases, all tagged with generatedFromPersonaId for traceability
// and all landing as ordinary Drafts — same review/staging/publish
// gate as hand-authored content (ADMIN-CONTENT-PLAN.md §6), which is
// also why the lesson only gets 3 questions here: staging still
// requires 5+ of mixed kinds (see commitAdminLessonDraft), so a human
// has to open and finish it before it can go live.
// ------------------------------------------------------------------
export function generateContentFromPersona({ personaId, countryKey, tripKey }){
  const persona = state.adminPersonas.find(p => p.id === personaId);
  const country = countryByKey(countryKey);
  const trip = TRIP_TYPES[tripKey];
  if (!persona || !country || !trip) return null;

  const personaLabel = persona.data.name || "this persona";
  const mod = {
    id: nextAdminId("mod"), status: "draft", version: 1,
    data: {
      name: `${persona.data.name || "Persona"} — ${trip.label}`,
      kind: "bespoke", tierCount: 1, languageId: country.data.languageId, languageWide: false, countryKey,
      generatedFromPersonaId: persona.id
    }
  };
  state.adminModules.push(mod);

  const phrases = [1, 2, 3].map(n => {
    const phrase = {
      id: nextAdminId("phr"), status: "draft", version: 1, supersedesId: null,
      data: {
        en: `[Generated] Phrase ${n} for ${personaLabel}`,
        local: "[translation pending]", translit: "",
        tags: "generated", languageId: country.data.languageId, languageWide: false, countryKey,
        generatedFromPersonaId: persona.id
      }
    };
    state.adminPhrases.push(phrase);
    return phrase;
  });

  const lesson = {
    id: nextAdminId("lsn"), status: "draft", version: 1,
    data: {
      title: `${trip.label}: ${personaLabel} essentials`,
      type: "Phrase", moduleId: mod.id, tier: 1,
      scope: "country-specific", languageId: country.data.languageId, languageWide: false, countryKey,
      questions: phrases.map(phrase => ({
        kind: "produce", context: `Generated for ${personaLabel}'s ${trip.label.toLowerCase()}.`,
        question: "", correctAnswer: "", distractors: "", symbol: "", heard: "",
        source: "phrase", phraseId: phrase.id
      })),
      generatedFromPersonaId: persona.id
    }
  };
  state.adminLessons.push(lesson);

  showToast(`Generated 1 module, 1 lesson, ${phrases.length} phrases as Drafts`);
  return { moduleId: mod.id, lessonId: lesson.id, phraseIds: phrases.map(p => p.id) };
}
// Called by the generating-animation screen once its fake steps
// finish — pops both the animation screen and the country/trip-type
// form underneath it, landing back on the Persona detail screen where
// the newly generated rows now show up (see AdminPersonaDetail.jsx).
export function finalizeContentGeneration(payload){
  generateContentFromPersona(payload);
  pop();
  pop();
}
