// ================================================================
// STORE
// Same external-mutable-store pattern as apps/traveler/src/store.js —
// see that file's header for the rationale. This store is the real
// admin content-authoring surface: CRUD for Language/Destination/
// Module/Lesson/Phrase/Blueprint/Persona against holaday-admin,
// preserving every validation rule from the original in-memory
// prototype verbatim — only the persistence boundary changed (each
// commit/publish/stage function now does a real Supabase read/write
// instead of an array push).
//
// The in-memory cache arrays below (state.adminDestinations etc.) are
// populated once via loadAll() after login (see initAuth/submitLogin)
// and kept in sync locally as CRUD actions succeed — the same
// "optimistic array mutation" shape the original had, just backed by
// a real write instead of only a local one.
// ================================================================
import { buildFlagSvg, parseCsv, questionToBeat, shuffle, slugify } from "@holaday/content-engine";
import { supabase } from "./lib/supabaseClient";
import { TRIP_TYPES } from "./data/tripTypes";

// ----------------------------------------------------------------
// PUBLISH PIPELINE — every Publish button calls this instead of
// flipping status directly, so the sync into holaday-content (see
// supabase/content/functions/publish-record) and the server-side
// re-validation of the gating rule happen atomically with the status
// flip, not just in this client. Lives in holaday-content (not here)
// so it can use that project's own service-role credentials for the
// cross-project write — see that function's header comment.
// ----------------------------------------------------------------
async function callPublishRecord(type, id){
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_CONTENT_FUNCTIONS_URL}/publish-record`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ type, id })
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Publish failed");
}

// persona-flesh and persona-generate-content (see
// supabase/admin/functions) live in this same project, unlike
// publish-record — so this just hits our own project's functions URL
// with the current session, no separate env var needed.
async function callAdminFunction(name, body){
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(body)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Request failed");
  return json;
}

// ----------------------------------------------------------------
// Subscriber plumbing
// ----------------------------------------------------------------
let version = 0;
const listeners = new Set();
export function subscribe(fn){ listeners.add(fn); return () => listeners.delete(fn); }
export function getVersion(){ return version; }
function notify(){ version++; listeners.forEach(fn => fn()); }

export const state = {
  account: null,
  loginDraft: { email: "", password: "" },
  stack: [{ name: "login" }],
  toastMsg: "",
  toastVisible: false,

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

  adminPersonas: [],
  adminPersonaDraft: null
};

function clone(x){ return JSON.parse(JSON.stringify(x)); }

// ----------------------------------------------------------------
// NAVIGATION + TOAST
// ----------------------------------------------------------------
export function top(){ return state.stack[state.stack.length - 1]; }
export function push(name, payload){ state.stack.push({ name, payload }); notify(); }
export function pop(){ if (state.stack.length > 1){ state.stack.pop(); notify(); } }

let toastTimer = null;
export function showToast(msg){
  state.toastMsg = msg;
  state.toastVisible = true;
  notify();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toastVisible = false; notify(); }, 1600);
}

// ----------------------------------------------------------------
// AUTH — no self-serve signup; a session's auth.uid() must already be
// in holaday-admin's admin_users allow-list (see supabase/README.md
// for how to add one). is_admin() is a Postgres function callable by
// any authenticated user, returning whether *they* are an admin.
// ----------------------------------------------------------------
export function patchLoginDraft(patch){ Object.assign(state.loginDraft, patch); notify(); }

async function checkIsAdmin(){
  const { data, error } = await supabase.rpc("is_admin");
  return !error && !!data;
}

export async function submitLogin(){
  const d = state.loginDraft;
  const email = d.email.trim();
  if (!email || !d.password){ showToast("Enter your email and password"); return; }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: d.password });
  if (error){ showToast(error.message); return; }
  if (!(await checkIsAdmin())){
    await supabase.auth.signOut();
    showToast("This account isn't an admin user");
    return;
  }
  state.account = { id: data.user.id, email: data.user.email };
  await loadAll();
  state.stack = [{ name: "admin-home" }];
  notify();
}
export async function logout(){
  await supabase.auth.signOut();
  state.account = null;
  state.stack = [{ name: "login" }];
  notify();
}
// Restores a signed-in admin session on app load (see main.jsx).
export async function initAuth(){
  const { data: { session } } = await supabase.auth.getSession();
  if (session && (await checkIsAdmin())){
    state.account = { id: session.user.id, email: session.user.email };
    await loadAll();
    state.stack = [{ name: "admin-home" }];
  } else if (session){
    await supabase.auth.signOut();
  }
  notify();
}

// ----------------------------------------------------------------
// LOAD — fetches every content-bank table once after login. Modest
// enough content-bank size for a single admin team to hold wholesale
// rather than paginating; each CRUD action below updates these arrays
// locally as it writes, so this only runs once per session.
// ----------------------------------------------------------------
function rowToLanguage(row){ return { id: row.id, name: row.name }; }
function rowToDestination(row){
  return {
    id: row.id, countryKey: row.country_key, status: row.status, version: row.version,
    supersedesId: row.supersedes_id, legacy: row.legacy,
    data: {
      name: row.name, capital: row.capital, languageId: row.language_id,
      colours: row.colours, flagPattern: row.flag_pattern, cultureTip: row.culture_tip
    }
  };
}
function rowToModule(row){
  return {
    id: row.id, status: row.status, version: row.version, supersedesId: row.supersedes_id,
    data: {
      name: row.name, kind: row.kind, tierCount: row.tier_count, languageId: row.language_id,
      languageWide: row.language_wide, countryKey: row.country_key,
      generatedFromPersonaId: row.generated_from_persona_id
    }
  };
}
function rowToLesson(row){
  return {
    id: row.id, status: row.status, version: row.version, supersedesId: row.supersedes_id,
    data: {
      title: row.title, type: row.type, moduleId: row.module_id, tier: row.tier, scope: row.scope,
      languageId: row.language_id, languageWide: row.language_wide, countryKey: row.country_key,
      questions: row.questions, generatedFromPersonaId: row.generated_from_persona_id
    }
  };
}
function rowToPhrase(row){
  return {
    id: row.id, status: row.status, version: row.version, supersedesId: row.supersedes_id,
    data: {
      en: row.en, local: row.local, translit: row.translit || "", tags: (row.tags || []).join(", "),
      languageId: row.language_id, languageWide: row.language_wide, countryKey: row.country_key,
      generatedFromPersonaId: row.generated_from_persona_id
    }
  };
}
function rowToBlueprint(row){
  return { id: row.id, status: row.status, version: row.version, supersedesId: row.supersedes_id, data: { tripKey: row.trip_key, legs: row.legs } };
}
function rowToPersona(row){
  return {
    id: row.id,
    data: {
      outline: row.outline, generated: row.generated,
      name: row.name || "", summary: row.summary || "", ageRange: row.age_range || "",
      travelStyle: row.travel_style || "", motivations: row.motivations || "",
      painPoints: row.pain_points || "", vocabFocus: row.vocab_focus || ""
    }
  };
}

async function loadAll(){
  const [languages, destinations, modules, lessons, phrases, blueprints, personas] = await Promise.all([
    supabase.from("languages").select("*"),
    supabase.from("destinations").select("*"),
    supabase.from("modules").select("*"),
    supabase.from("lessons").select("*"),
    supabase.from("phrases").select("*"),
    supabase.from("blueprints").select("*"),
    supabase.from("personas").select("*")
  ]);
  state.adminLanguages = (languages.data || []).map(rowToLanguage);
  state.adminDestinations = (destinations.data || []).map(rowToDestination);
  state.adminModules = (modules.data || []).map(rowToModule);
  state.adminLessons = (lessons.data || []).map(rowToLesson);
  state.adminPhrases = (phrases.data || []).map(rowToPhrase);
  state.adminBlueprints = (blueprints.data || []).map(rowToBlueprint);
  state.adminPersonas = (personas.data || []).map(rowToPersona);
}

// ----------------------------------------------------------------
// Language — a lightweight taxonomy dimension, not staged/published
// content. Every Country names one Language it uses; Modules/Lessons
// authored as "applies to all countries using this language" resolve
// against whichever Countries currently carry that languageId.
// ----------------------------------------------------------------
export async function ensureLanguage(name){
  let lang = state.adminLanguages.find(l => l.name.toLowerCase() === name.toLowerCase());
  if (!lang){
    const { data, error } = await supabase.from("languages").insert({ name }).select().single();
    if (error){ showToast("Couldn't create language"); throw error; }
    lang = rowToLanguage(data);
    state.adminLanguages.push(lang);
  }
  return lang;
}

export function flagMarkup(record){
  return buildFlagSvg(record.data.flagPattern || "vertical-tricolor", record.data.colours);
}
export function publishedDestinations(){
  return state.adminDestinations.filter(d => d.status === "published");
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
// Language, regardless of the Country's own status.
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
// can fill a bespoke Module's per-country cell.
export function lessonMatchesGridCountry(lesson, countryKey){
  if (lesson.data.scope !== "country-specific") return false;
  if (lesson.data.languageWide){
    const country = countryByKey(countryKey);
    return !!country && !!lesson.data.languageId && country.data.languageId === lesson.data.languageId;
  }
  return lesson.data.countryKey === countryKey;
}
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
// country currently using its Language rather than a fixed list, so
// the completeness grid stays accurate as new countries join.
export function moduleGridRows(mod){
  if (mod.data.kind === "generic") return [null];
  if (mod.data.languageWide) return countriesForLanguage(mod.data.languageId).map(d => d.countryKey);
  return mod.data.countryKey ? [mod.data.countryKey] : [];
}
// Publishing a Module is blocked until every cell it claims is itself
// Published — the gating cascade a Blueprint's own publish check
// relies on (see blueprintIsPublishable below).
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
// Turns an authored Question into the exact beat shape the traveler
// lesson renderer expects, via the same questionToBeat the traveler
// app's real lesson rendering uses (packages/shared/content-engine) —
// the author is checking literally the same rendering a traveler will
// see once this Lesson is published.
export function adminQuestionToBeat(q, lessonData){
  if ((q.kind === "produce" || q.kind === "comprehend") && q.source === "phrase"){
    const phraseRecord = q.phraseId ? state.adminPhrases.find(p => p.id === q.phraseId) : null;
    if (!phraseRecord || phraseRecord.status !== "published") return null;
    const pool = phrasesForLesson(lessonData).filter(p => p.status === "published" && p.id !== phraseRecord.id);
    const distractorPhrases = shuffle(pool).slice(0, 3).map(p => p.data);
    return questionToBeat(q, { phrase: phraseRecord.data, distractorPhrases });
  }
  return questionToBeat(q, {});
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
export function primeAdminDestinationDraft(id){
  const record = id ? state.adminDestinations.find(d => d.id === id) : null;
  const canEdit = !record || record.status === "draft";
  if (canEdit && (!state.adminDraft || state.adminDraft.id !== id)){
    state.adminDraft = record ? clone(record) : state.adminDraft;
  }
  return { record, canEdit, view: canEdit ? state.adminDraft : record };
}
export function patchAdminDraft(patch){ Object.assign(state.adminDraft.data, patch); notify(); }

function destinationPayload(d){
  return {
    language_id: d.languageId, name: d.name, capital: d.capital,
    colours: d.colours, flag_pattern: d.flagPattern, culture_tip: d.cultureTip
  };
}
export async function commitAdminDraft(status){
  const d = state.adminDraft.data;
  if (!d.name){ showToast("Destination name is required"); return false; }
  if (d.languageId === "__new__"){
    const newName = (d.newLanguageName || "").trim();
    if (!newName){ showToast("Type a name for the new language"); return false; }
    d.languageId = (await ensureLanguage(newName)).id;
    d.newLanguageName = "";
  }
  if (!d.languageId){ showToast("Pick a language for this destination"); return false; }
  try {
    if (!state.adminDraft.id){
      const countryKey = slugify(d.name);
      const { data, error } = await supabase.from("destinations")
        .insert({ country_key: countryKey, status, version: 1, legacy: false, ...destinationPayload(d) })
        .select().single();
      if (error) throw error;
      state.adminDraft = rowToDestination(data);
      state.adminDestinations.push(state.adminDraft);
    } else {
      const { data, error } = await supabase.from("destinations")
        .update({ status, ...destinationPayload(d) })
        .eq("id", state.adminDraft.id).select().single();
      if (error) throw error;
      state.adminDraft = rowToDestination(data);
      const idx = state.adminDestinations.findIndex(x => x.id === state.adminDraft.id);
      if (idx >= 0) state.adminDestinations[idx] = state.adminDraft;
    }
  } catch {
    showToast("Couldn't save destination");
    return false;
  }
  return true;
}
export async function saveDraftDestination(){
  if (await commitAdminDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminDraft.id }; notify(); }
}
export async function stageDestination(){
  if (await commitAdminDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminDraft.id }; notify(); }
}
export async function unstageDestination(id){
  const { error } = await supabase.from("destinations").update({ status: "draft" }).eq("id", id);
  if (error){ showToast("Couldn't update destination"); return; }
  state.adminDestinations.find(d => d.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export async function publishDestination(id){
  const rec = state.adminDestinations.find(d => d.id === id);
  const siblings = state.adminDestinations.filter(d => d.countryKey === rec.countryKey && d.status === "published" && d.id !== rec.id);
  try {
    await callPublishRecord("destination", id);
  } catch (e){
    showToast(e.message || "Couldn't publish destination");
    return;
  }
  siblings.forEach(d => { d.status = "archived"; });
  rec.status = "published";
  showToast(`${rec.data.name} is now live`);
  notify();
}
export async function newDestinationVersion(id){
  const rec = state.adminDestinations.find(d => d.id === id);
  const { data, error } = await supabase.from("destinations")
    .insert({
      country_key: rec.countryKey, status: "draft", version: rec.version + 1, legacy: false,
      ...destinationPayload({ ...rec.data, flagPattern: rec.data.flagPattern || "vertical-tricolor" })
    })
    .select().single();
  if (error){ showToast("Couldn't create new version"); return; }
  const copy = rowToDestination(data);
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
export async function saveAdminLanguage(){
  const name = (state.adminLanguageDraft.name || "").trim();
  if (!name){ showToast("Language name is required"); return; }
  try {
    if (!state.adminLanguageDraft.id){
      const { data, error } = await supabase.from("languages").insert({ name }).select().single();
      if (error) throw error;
      state.adminLanguageDraft = rowToLanguage(data);
      state.adminLanguages.push(state.adminLanguageDraft);
    } else {
      const { data, error } = await supabase.from("languages").update({ name }).eq("id", state.adminLanguageDraft.id).select().single();
      if (error) throw error;
      state.adminLanguageDraft = rowToLanguage(data);
      const idx = state.adminLanguages.findIndex(l => l.id === state.adminLanguageDraft.id);
      if (idx >= 0) state.adminLanguages[idx] = state.adminLanguageDraft;
    }
  } catch {
    showToast("Couldn't save language");
    return;
  }
  showToast("Language saved");
  top().payload = { id: state.adminLanguageDraft.id };
  notify();
}

// ----------------------------------------------------------------
// ADMIN — Module + Lesson
//
// A Lesson always names the Module + Tier it belongs to; a Module's
// "tier ladder completeness" grid is derived by scanning Lessons for
// that (moduleId, tier[, countryKey]) rather than stored redundantly,
// so the two can never drift out of sync. Publishing a Module is
// blocked until every cell it claims is itself Published
// (moduleIsComplete above).
//
// Question authoring: a produce/comprehend Question can attach to a
// Phrase by reference instead of hand-typing prompt/answer/
// distractors — but symbol/situational Questions, and any produce/
// comprehend Question an author chooses not to phrase-link, still
// author their content inline on the Lesson, not against a shared
// library (there is no separate reusable Question table).
// ----------------------------------------------------------------
export function newAdminModule(){
  state.adminModuleDraft = {
    id: null, status: "draft", version: 1,
    data: { name: "", kind: "generic", tierCount: 3, languageId: null, languageWide: false, countryKey: null }
  };
  push("admin-module", { id: null });
}
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

function modulePayload(d){
  return {
    name: d.name, kind: d.kind, tier_count: d.tierCount, language_id: d.languageId,
    language_wide: d.languageWide, country_key: d.countryKey, generated_from_persona_id: d.generatedFromPersonaId || null
  };
}
export async function commitAdminModuleDraft(status){
  const d = state.adminModuleDraft.data;
  if (!d.name){ showToast("Module name is required"); return false; }
  if (d.kind === "bespoke"){
    if (!d.languageId){ showToast("Pick a language for a bespoke module"); return false; }
    if (!d.languageWide && !d.countryKey){ showToast("Pick a country, or tick 'applies to all countries using this language'"); return false; }
  }
  try {
    if (!state.adminModuleDraft.id){
      const { data, error } = await supabase.from("modules").insert({ status, version: 1, ...modulePayload(d) }).select().single();
      if (error) throw error;
      state.adminModuleDraft = rowToModule(data);
      state.adminModules.push(state.adminModuleDraft);
    } else {
      const { data, error } = await supabase.from("modules").update({ status, ...modulePayload(d) }).eq("id", state.adminModuleDraft.id).select().single();
      if (error) throw error;
      state.adminModuleDraft = rowToModule(data);
      const idx = state.adminModules.findIndex(m => m.id === state.adminModuleDraft.id);
      if (idx >= 0) state.adminModules[idx] = state.adminModuleDraft;
    }
  } catch {
    showToast("Couldn't save module");
    return false;
  }
  return true;
}
export async function saveDraftModule(){
  if (await commitAdminModuleDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminModuleDraft.id }; notify(); }
}
export async function stageModule(){
  if (await commitAdminModuleDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminModuleDraft.id }; notify(); }
}
export async function unstageModule(id){
  const { error } = await supabase.from("modules").update({ status: "draft" }).eq("id", id);
  if (error){ showToast("Couldn't update module"); return; }
  state.adminModules.find(m => m.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export async function publishModule(id){
  const rec = state.adminModules.find(m => m.id === id);
  if (!moduleIsComplete(rec)){ showToast("Tier ladder isn't fully published yet"); return; }
  try {
    await callPublishRecord("module", id);
  } catch (e){
    showToast(e.message || "Couldn't publish module");
    return;
  }
  rec.status = "published";
  if (rec.supersedesId){
    const prev = state.adminModules.find(m => m.id === rec.supersedesId);
    if (prev) prev.status = "archived";
  }
  showToast(`${rec.data.name} is now live`);
  notify();
}
export async function newModuleVersion(id){
  const rec = state.adminModules.find(m => m.id === id);
  const { data, error } = await supabase.from("modules")
    .insert({ status: "draft", version: rec.version + 1, supersedes_id: rec.id, ...modulePayload(rec.data) })
    .select().single();
  if (error){ showToast("Couldn't create new version"); return; }
  const copy = rowToModule(data);
  state.adminModules.push(copy);
  showToast("New draft version created");
  state.adminModuleDraft = null;
  push("admin-module", { id: copy.id });
}

// ----------------------------------------------------------------
// ADMIN — Lesson
// ----------------------------------------------------------------
export function blankAdminQuestion(symbolKeys){
  return {
    kind:"produce", context:"", question:"", correctAnswer:"", distractors:"",
    symbol:symbolKeys[0], heard:"", source:"custom", phraseId:null
  };
}
// Lessons are only created from inside a Module's tier grid — the grid
// cell's click already pins moduleId/tier/countryKey.
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

function lessonPayload(d){
  return {
    title: d.title, type: d.type, module_id: d.moduleId, tier: d.tier, scope: d.scope,
    language_id: d.languageId, language_wide: d.languageWide, country_key: d.countryKey,
    questions: d.questions, generated_from_persona_id: d.generatedFromPersonaId || null
  };
}
export async function commitAdminLessonDraft(status){
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
  try {
    if (!state.adminLessonDraft.id){
      const { data, error } = await supabase.from("lessons").insert({ status, version: 1, ...lessonPayload(d) }).select().single();
      if (error) throw error;
      state.adminLessonDraft = rowToLesson(data);
      state.adminLessons.push(state.adminLessonDraft);
    } else {
      const { data, error } = await supabase.from("lessons").update({ status, ...lessonPayload(d) }).eq("id", state.adminLessonDraft.id).select().single();
      if (error) throw error;
      state.adminLessonDraft = rowToLesson(data);
      const idx = state.adminLessons.findIndex(l => l.id === state.adminLessonDraft.id);
      if (idx >= 0) state.adminLessons[idx] = state.adminLessonDraft;
    }
  } catch {
    showToast("Couldn't save lesson");
    return false;
  }
  return true;
}
export async function saveDraftLesson(){
  if (await commitAdminLessonDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminLessonDraft.id }; notify(); }
}
export async function stageLesson(){
  if (await commitAdminLessonDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminLessonDraft.id }; notify(); }
}
export async function unstageLesson(id){
  const { error } = await supabase.from("lessons").update({ status: "draft" }).eq("id", id);
  if (error){ showToast("Couldn't update lesson"); return; }
  state.adminLessons.find(l => l.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export async function publishLesson(id){
  const rec = state.adminLessons.find(l => l.id === id);
  try {
    await callPublishRecord("lesson", id);
  } catch (e){
    showToast(e.message || "Couldn't publish lesson");
    return;
  }
  rec.status = "published";
  if (rec.supersedesId){
    const prev = state.adminLessons.find(l => l.id === rec.supersedesId);
    if (prev) prev.status = "archived";
  }
  showToast(`${rec.data.title} is now live`);
  notify();
}
export async function newLessonVersion(id){
  const rec = state.adminLessons.find(l => l.id === id);
  const { data, error } = await supabase.from("lessons")
    .insert({ status: "draft", version: rec.version + 1, supersedes_id: rec.id, ...lessonPayload(rec.data) })
    .select().single();
  if (error){ showToast("Couldn't create new version"); return; }
  const copy = rowToLesson(data);
  state.adminLessons.push(copy);
  showToast("New draft version created");
  state.adminLessonDraft = null;
  state.adminLessonPreviewIndex = 0;
  push("admin-lesson", { id: copy.id });
}

// ----------------------------------------------------------------
// ADMIN — Phrase
//
// The reusable content-library entity: a Phrase carries the same
// draft/staged/published/archived lifecycle as everything else, and a
// Lesson's produce/comprehend Questions can attach to one by reference
// instead of hand-typing prompt/answer/distractors. Unlike Module/
// Lesson, a Phrase has no "generic" scope — it's always text in one
// specific local language, so it's always either pinned to one
// Country or language-wide.
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

function phrasePayload(d){
  return {
    en: d.en, local: d.local, translit: d.translit || null, tags: parseCsv(d.tags),
    language_id: d.languageId, language_wide: d.languageWide, country_key: d.countryKey,
    generated_from_persona_id: d.generatedFromPersonaId || null
  };
}
export async function commitAdminPhraseDraft(status){
  const d = state.adminPhraseDraft.data;
  if (!d.en){ showToast("English text is required"); return false; }
  if (!d.local){ showToast("Local-language text is required"); return false; }
  if (!d.languageId){ showToast("Pick a language for this phrase"); return false; }
  if (!d.languageWide && !d.countryKey){ showToast("Pick a country, or tick 'applies to all countries using this language'"); return false; }
  if (status === "staged" && !d.translit){ showToast("Transliteration is required before this phrase can be staged"); return false; }
  try {
    if (!state.adminPhraseDraft.id){
      const { data, error } = await supabase.from("phrases").insert({ status, version: 1, ...phrasePayload(d) }).select().single();
      if (error) throw error;
      state.adminPhraseDraft = rowToPhrase(data);
      state.adminPhrases.push(state.adminPhraseDraft);
    } else {
      const { data, error } = await supabase.from("phrases").update({ status, ...phrasePayload(d) }).eq("id", state.adminPhraseDraft.id).select().single();
      if (error) throw error;
      state.adminPhraseDraft = rowToPhrase(data);
      const idx = state.adminPhrases.findIndex(p => p.id === state.adminPhraseDraft.id);
      if (idx >= 0) state.adminPhrases[idx] = state.adminPhraseDraft;
    }
  } catch {
    showToast("Couldn't save phrase");
    return false;
  }
  return true;
}
export async function saveDraftPhrase(){
  if (await commitAdminPhraseDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminPhraseDraft.id }; notify(); }
}
export async function stagePhrase(){
  if (await commitAdminPhraseDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminPhraseDraft.id }; notify(); }
}
export async function unstagePhrase(id){
  const { error } = await supabase.from("phrases").update({ status: "draft" }).eq("id", id);
  if (error){ showToast("Couldn't update phrase"); return; }
  state.adminPhrases.find(p => p.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export async function publishPhrase(id){
  const rec = state.adminPhrases.find(p => p.id === id);
  try {
    await callPublishRecord("phrase", id);
  } catch (e){
    showToast(e.message || "Couldn't publish phrase");
    return;
  }
  rec.status = "published";
  if (rec.supersedesId){
    const prev = state.adminPhrases.find(p => p.id === rec.supersedesId);
    if (prev) prev.status = "archived";
  }
  showToast(`"${rec.data.en}" is now live`);
  notify();
}
export async function newPhraseVersion(id){
  const rec = state.adminPhrases.find(p => p.id === id);
  const { data, error } = await supabase.from("phrases")
    .insert({ status: "draft", version: rec.version + 1, supersedes_id: rec.id, ...phrasePayload(rec.data) })
    .select().single();
  if (error){ showToast("Couldn't create new version"); return; }
  const copy = rowToPhrase(data);
  state.adminPhrases.push(copy);
  showToast("New draft version created");
  state.adminPhraseDraft = null;
  push("admin-phrase", { id: copy.id });
}

// ----------------------------------------------------------------
// ADMIN — Trip Type Blueprint
//
// Authored against the existing hardcoded TRIP_TYPES keys
// (data/tripTypes.js) rather than also supporting "define a new Trip
// Type" — adding a wholly new trip type is really its own small
// Destination-shaped flow (name a thing, theme it).
//
// Leg gating is deliberately cheap to compute: a Module's own Publish
// action already requires moduleIsComplete() above — every Tier it
// claims, for every country it claims, has a Published Lesson — so a
// Blueprint only needs to check that every Module it gates in is
// itself Published; it doesn't need to re-walk tiers/countries itself.
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
// stopped being published).
export function ensureBlueprintPreviewCountry(){
  const dests = publishedDestinations();
  if (!state.adminBlueprintPreviewCountry || !dests.some(d => d.countryKey === state.adminBlueprintPreviewCountry)){
    state.adminBlueprintPreviewCountry = dests.length ? dests[0].countryKey : null;
  }
  return dests;
}
// Every published Lesson gated into this (moduleId, tier) cell for
// this country — a Tier can carry more than one Lesson, and a
// traveler's syllabus includes all of them, not just one.
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

function blueprintPayload(d){
  return { trip_key: d.tripKey, legs: d.legs };
}
export async function commitAdminBlueprintDraft(status){
  const d = state.adminBlueprintDraft.data;
  if (!d.legs.length){ showToast("Add at least one leg"); return false; }
  if (d.legs.some(leg => !leg.name)){ showToast("Every leg needs a name"); return false; }
  if (status === "staged" && !d.legs.some(leg => leg.moduleGates.length)){
    showToast("Gate at least one module into a leg before staging");
    return false;
  }
  try {
    if (!state.adminBlueprintDraft.id){
      const { data, error } = await supabase.from("blueprints").insert({ status, version: 1, ...blueprintPayload(d) }).select().single();
      if (error) throw error;
      state.adminBlueprintDraft = rowToBlueprint(data);
      state.adminBlueprints.push(state.adminBlueprintDraft);
    } else {
      const { data, error } = await supabase.from("blueprints").update({ status, ...blueprintPayload(d) }).eq("id", state.adminBlueprintDraft.id).select().single();
      if (error) throw error;
      state.adminBlueprintDraft = rowToBlueprint(data);
      const idx = state.adminBlueprints.findIndex(b => b.id === state.adminBlueprintDraft.id);
      if (idx >= 0) state.adminBlueprints[idx] = state.adminBlueprintDraft;
    }
  } catch {
    showToast("Couldn't save blueprint");
    return false;
  }
  return true;
}
export async function saveDraftBlueprint(){
  if (await commitAdminBlueprintDraft("draft")){ showToast("Draft saved"); top().payload = { id: state.adminBlueprintDraft.id }; notify(); }
}
export async function stageBlueprint(){
  if (await commitAdminBlueprintDraft("staged")){ showToast("Staged"); top().payload = { id: state.adminBlueprintDraft.id }; notify(); }
}
export async function unstageBlueprint(id){
  const { error } = await supabase.from("blueprints").update({ status: "draft" }).eq("id", id);
  if (error){ showToast("Couldn't update blueprint"); return; }
  state.adminBlueprints.find(b => b.id === id).status = "draft";
  showToast("Back to draft");
  notify();
}
export async function publishBlueprint(id){
  const rec = state.adminBlueprints.find(b => b.id === id);
  if (!blueprintIsPublishable(rec)){ showToast("Every gated module needs to be published first"); return; }
  try {
    await callPublishRecord("blueprint", id);
  } catch (e){
    showToast(e.message || "Couldn't publish blueprint");
    return;
  }
  rec.status = "published";
  if (rec.supersedesId){
    const prev = state.adminBlueprints.find(b => b.id === rec.supersedesId);
    if (prev) prev.status = "archived";
  }
  showToast(`${TRIP_TYPES[rec.data.tripKey].label} blueprint is now live`);
  notify();
}
export async function newBlueprintVersion(id){
  const rec = state.adminBlueprints.find(b => b.id === id);
  const { data, error } = await supabase.from("blueprints")
    .insert({ status: "draft", version: rec.version + 1, supersedes_id: rec.id, ...blueprintPayload(rec.data) })
    .select().single();
  if (error){ showToast("Couldn't create new version"); return; }
  const copy = rowToBlueprint(data);
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
// Both persist for real now (a real personas row, real Module/Lesson/
// Phrase Draft rows) — the LLM call itself stays a deterministic stub
// pending real Anthropic API integration (a later phase). Persona
// itself is an authoring input, not traveler-facing content, so — like
// Language — it has no draft/staged/published lifecycle: it's always
// directly editable, saved with a single "Save" action. The content it
// generates lands as ordinary Drafts in the real Module/Lesson/Phrase
// tables, so it goes through the exact same review/staging/publish
// gate as anything hand-authored.
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
export function primeAdminPersonaDraft(id){
  const record = id ? state.adminPersonas.find(p => p.id === id) : null;
  if (!state.adminPersonaDraft || state.adminPersonaDraft.id !== id){
    state.adminPersonaDraft = record ? clone(record) : state.adminPersonaDraft;
  }
  return { record, view: state.adminPersonaDraft };
}
export function patchAdminPersonaDraft(patch){ Object.assign(state.adminPersonaDraft.data, patch); notify(); }

function personaPayload(d){
  return {
    outline: d.outline, generated: d.generated, name: d.name || null, summary: d.summary || null,
    age_range: d.ageRange || null, travel_style: d.travelStyle || null, motivations: d.motivations || null,
    pain_points: d.painPoints || null, vocab_focus: d.vocabFocus || null
  };
}
export async function saveAdminPersona(){
  const d = state.adminPersonaDraft.data;
  if (!d.outline.trim()){ showToast("Give the persona a rough outline first"); return; }
  try {
    if (!state.adminPersonaDraft.id){
      const { data, error } = await supabase.from("personas").insert(personaPayload(d)).select().single();
      if (error) throw error;
      state.adminPersonaDraft = rowToPersona(data);
      state.adminPersonas.push(state.adminPersonaDraft);
    } else {
      const { data, error } = await supabase.from("personas").update(personaPayload(d)).eq("id", state.adminPersonaDraft.id).select().single();
      if (error) throw error;
      state.adminPersonaDraft = rowToPersona(data);
      const idx = state.adminPersonas.findIndex(p => p.id === state.adminPersonaDraft.id);
      if (idx >= 0) state.adminPersonas[idx] = state.adminPersonaDraft;
    }
  } catch {
    showToast("Couldn't save persona");
    return;
  }
  showToast("Persona saved");
  top().payload = { id: state.adminPersonaDraft.id };
  notify();
}

export function startPersonaGeneration(id){
  push("admin-persona-generating", { id });
}
// Calls the real persona-flesh Edge Function (supabase/admin/functions
// — Claude generates a structured profile via a forced tool call, with
// an explicit instruction against AI-generated writing tells, same as
// persona-generate-content below). On failure, pops back to the
// persona detail screen with a toast rather than leaving the author
// stuck on the generating animation.
export async function finalizePersonaGeneration(id){
  const persona = state.adminPersonas.find(p => p.id === id);
  if (!persona){ pop(); return; }
  let result;
  try {
    result = await callAdminFunction("persona-flesh", { personaId: id });
  } catch (e){
    pop();
    showToast(e.message || "Couldn't generate persona details");
    return;
  }
  Object.assign(persona.data, rowToPersona(result.persona).data);
  if (state.adminPersonaDraft && state.adminPersonaDraft.id === id) state.adminPersonaDraft = clone(persona);
  pop();
  showToast("Persona details generated — review before use");
  notify();
}

// Calls the real persona-generate-content Edge Function: a
// generate-then-judge pipeline (a second, independent model call
// scores the candidate against relevance/tone/plausibility/no-AI-tells
// before anything is written — see that function's header comment for
// the full rationale) rather than a single generate-and-accept pass.
// Creates one bespoke Module, one Lesson, and 5-8 Phrases, all tagged
// generated_from_persona_id and landing as ordinary Drafts — same
// review/staging/publish gate as hand-authored content.
export async function generateContentFromPersona({ personaId, countryKey, tripKey }){
  let result;
  try {
    result = await callAdminFunction("persona-generate-content", { personaId, countryKey, tripKey });
  } catch (e){
    showToast(e.message || "Couldn't generate content");
    return null;
  }
  const mod = rowToModule(result.module);
  const phrases = result.phrases.map(rowToPhrase);
  const lesson = rowToLesson(result.lesson);
  state.adminModules.push(mod);
  phrases.forEach(p => state.adminPhrases.push(p));
  state.adminLessons.push(lesson);
  showToast(`Generated 1 module, 1 lesson, ${phrases.length} phrases as Drafts`);
  return { moduleId: mod.id, lessonId: lesson.id, phraseIds: phrases.map(p => p.id) };
}
export async function finalizeContentGeneration(payload){
  const result = await generateContentFromPersona(payload);
  pop();
  pop();
  if (result) push("admin-persona-generated-content", { personaId: payload.personaId });
  else push("admin-persona", { id: payload.personaId });
}
