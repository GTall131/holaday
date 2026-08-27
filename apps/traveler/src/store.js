// ================================================================
// STORE
// A single external mutable store (state + business logic). React
// components subscribe via useStore() (see useStore.js) and call the
// action functions exported below instead of dispatching data-action
// clicks through DOM delegation. `state` holds navigation (`stack`),
// in-progress form drafts, toast state, and a cache of published
// content fetched from holaday-content (see supabase/README.md) —
// account/courses are backed by real Supabase Auth + Postgres, not
// in-memory-only `let` variables.
//
// The admin-authoring surface (Destination/Module/Lesson/Phrase/
// Blueprint/Persona CRUD) used to live here as in-memory scaffolding —
// it's been removed. The real admin app is apps/admin, a separate app
// against the separate holaday-admin project; this app only ever reads
// *published* content, never authors it.
//
// One thing the original did with direct DOM manipulation is
// deliberately NOT ported here, because idiomatic React already solves
// the problem it existed for: currentBeat/beatResult (per-question quiz
// state) is now local state inside the Lesson component, which gives
// "going back re-presents the question fresh" for free via a
// `key`-remount instead of a manual reset.
// ================================================================
import { buildFlagSvg, questionToBeat, shuffle } from "@holaday/content-engine";
import { supabase } from "./lib/supabaseClient";

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
// special-cased per screen (see push/pop/top below). `destinations` is
// a cache of holaday-content's published Destinations, populated by
// loadDestinations() (see main.jsx) — empty until something real has
// been authored and published through apps/admin.
// ----------------------------------------------------------------
export const state = {
  // auth / onboarding — account.milestone tracks the two milestones
  // named in the product brief ("Account Created" -> "Account
  // Onboarded"), a one-way progression.
  account: null,
  signupDraft: { firstName: "", email: "", password: "" },
  loginDraft: { email: "", password: "" },
  onboardingDraft: { countriesVisited: [], tripTypes: [] },

  // traveler
  courses: [],
  draft: { countryKey: null, tripKey: null },
  stack: [{ name: "welcome" }],
  feedbackDraft: { score: null, cultureHelped: null },
  toastMsg: "",
  toastVisible: false,

  // published content cache
  destinations: []
};

// ----------------------------------------------------------------
// NAVIGATION
// ----------------------------------------------------------------
export function top(){ return state.stack[state.stack.length - 1]; }
export function push(name, payload){ state.stack.push({ name, payload }); notify(); }
export function pop(){ if (state.stack.length > 1){ state.stack.pop(); notify(); } }
export function resetToHome(){ state.stack = [{ name: "home" }]; notify(); }
export function goHome(){ resetToHome(); }
export function stubTab(){ showToast("Not in this prototype — out of scope for v1"); }

let toastTimer = null;
export function showToast(msg){
  state.toastMsg = msg;
  state.toastVisible = true;
  notify();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toastVisible = false; notify(); }, 1600);
}

// ----------------------------------------------------------------
// PUBLISHED CONTENT (holaday-content)
// ----------------------------------------------------------------
function rowToDestination(row){
  return {
    countryKey: row.country_key,
    data: {
      name: row.name,
      capital: row.capital,
      colours: row.colours,
      cultureTip: row.culture_tip,
      flagPattern: row.flag_pattern,
      languageId: row.language_id
    }
  };
}
// Fetches every published Destination once (see main.jsx) — small,
// public, read-only reference data, safe to hold wholesale rather than
// re-fetching per screen.
export async function loadDestinations(){
  const { data, error } = await supabase.from("destinations").select("*").eq("status", "published");
  if (error){ showToast("Couldn't load destinations"); return; }
  state.destinations = data.map(rowToDestination);
  notify();
}
export function publishedDestinations(){
  return state.destinations;
}
export function flagMarkup(dest){
  return buildFlagSvg(dest.data.flagPattern || "vertical-tricolor", dest.data.colours);
}
// Unified country lookup for every traveler-facing screen. Returns
// null until a Destination has actually been authored and published
// through apps/admin — a fresh system starts with an empty content
// bank, no seeded example country.
export function travelerCountry(countryKey){
  const dest = state.destinations.find(d => d.countryKey === countryKey);
  if (!dest) return null;
  return { name: dest.data.name, capital: dest.data.capital, colours: dest.data.colours, cultureTip: dest.data.cultureTip, flag: flagMarkup(dest) };
}
// A Phrase applies to a country either because it's pinned to that
// exact country, or because it's language-wide and the country's
// language matches (mirrors the admin app's phraseAppliesToCountry,
// expressed as a Postgres OR since this queries holaday-content
// directly rather than filtering an in-memory array).
export async function fetchCountryPhrases(countryKey){
  const dest = state.destinations.find(d => d.countryKey === countryKey);
  if (!dest) return null;
  const filters = [`country_key.eq.${countryKey}`];
  if (dest.data.languageId) filters.push(`and(language_wide.eq.true,language_id.eq.${dest.data.languageId})`);
  const { data, error } = await supabase.from("phrases").select("*").eq("status", "published").or(filters.join(","));
  if (error || !data || !data.length) return null;
  return data.map(p => ({ en: p.en, local: p.local, translit: p.translit }));
}

async function fetchLessonPhrasePool(lesson){
  if (lesson.scope !== "country-specific" || !lesson.language_id) return [];
  let query = supabase.from("phrases").select("*").eq("status", "published");
  query = lesson.language_wide
    ? query.eq("language_wide", true).eq("language_id", lesson.language_id)
    : query.eq("country_key", lesson.country_key);
  const { data } = await query;
  return data || [];
}
// A syllabus entry only has real question content once it's resolved
// from a published Blueprint against a published, authored Lesson
// (`source === "authored"`) — an unauthored trip type's generic
// syllabus shell has none yet, and Dashboard.jsx's `built` check
// already keeps those weeks locked/unopenable rather than sending a
// traveler here for them. Uses the same questionToBeat the admin app's
// live preview uses (packages/shared/content-engine), so a traveler is
// provably looking at the same rendering the author checked.
export async function courseLessonBeats(course, week){
  const entry = course.syllabus[week - 1];
  if (!entry || entry.source !== "authored") return [];
  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", entry.lessonId).eq("status", "published").maybeSingle();
  if (!lesson) return [];
  const pool = await fetchLessonPhrasePool(lesson);
  return lesson.questions.map(q => {
    if ((q.kind === "produce" || q.kind === "comprehend") && q.source === "phrase"){
      const phrase = q.phraseId ? pool.find(p => p.id === q.phraseId) : null;
      const distractorPhrases = shuffle(pool.filter(p => p.id !== q.phraseId)).slice(0, 3);
      return questionToBeat(q, { phrase, distractorPhrases });
    }
    return questionToBeat(q, {});
  }).filter(Boolean);
}

// ----------------------------------------------------------------
// AUTH + ONBOARDING
//
// Two milestones: 'Account Created' (submitSignup, below) then
// 'Account Onboarded' (finishOnboarding), persisted on the
// holaday-content `profiles` row (see supabase/content/migrations),
// not just in memory for the session. Onboarding always runs
// country -> trip types -> "got a trip booked?" in that order; the
// last answer branches into the existing trip-creation flow
// (startCourse) or straight to Home, per the product brief.
//
// Supabase Auth requires email confirmation by default, so a fresh
// signUp() may come back with no session yet ("check your email") —
// submitSignup routes to Login in that case instead of straight into
// onboarding.
// ----------------------------------------------------------------
export function goWelcome(){ state.stack = [{ name: "welcome" }]; notify(); }
export function goLogin(){ state.loginDraft = { email: "", password: "" }; push("login"); }
export function goSignup(){ state.signupDraft = { firstName: "", email: "", password: "" }; push("signup"); }
export function patchSignupDraft(patch){ Object.assign(state.signupDraft, patch); notify(); }
export function patchLoginDraft(patch){ Object.assign(state.loginDraft, patch); notify(); }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function rowToAccount(profile, authUser){
  return {
    id: authUser.id,
    firstName: profile.first_name || "",
    email: authUser.email,
    milestone: profile.onboarded ? "onboarded" : "created",
    countriesVisited: profile.countries_visited || [],
    tripTypes: profile.trip_types || [],
    hasBookedTrip: profile.has_booked_trip
  };
}
async function loadAccount(authUser){
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", authUser.id).single();
  if (error){ showToast("Couldn't load your account"); return null; }
  state.account = rowToAccount(profile, authUser);
  return state.account;
}

function rowToCourse(row){
  return {
    id: row.id,
    countryKey: row.country_key,
    tripKey: row.trip_key,
    weeks: row.weeks,
    syllabus: row.syllabus,
    legs: row.legs,
    currentWeek: row.current_week,
    status: row.status,
    notes: row.notes || "",
    travelStart: row.travel_start,
    travelEnd: row.travel_end,
    feedbackSubmitted: row.feedback_submitted,
    feedback: row.feedback
  };
}
async function loadCourses(){
  const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
  if (error){ showToast("Couldn't load your trips"); return; }
  state.courses = data.map(rowToCourse);
}

// Restores a signed-in session on app load (see main.jsx) so refreshing
// the page doesn't drop the account, replacing the prototype's old
// "account only exists for the current session" constraint.
export async function initAuth(){
  const { data: { session } } = await supabase.auth.getSession();
  if (session){
    await loadAccount(session.user);
    if (state.account.milestone === "onboarded"){
      await loadCourses();
      state.stack = [{ name: "home" }];
    } else {
      state.onboardingDraft = { countriesVisited: state.account.countriesVisited, tripTypes: state.account.tripTypes };
      state.stack = [{ name: "onboarding-countries" }];
    }
  }
  notify();
}

export async function submitSignup(){
  const d = state.signupDraft;
  const firstName = d.firstName.trim();
  const email = d.email.trim();
  if (!firstName){ showToast("Enter your first name"); return; }
  if (!EMAIL_RE.test(email)){ showToast("Enter a valid email address"); return; }
  if (d.password.length < 6){ showToast("Password needs at least 6 characters"); return; }
  const { data, error } = await supabase.auth.signUp({
    email, password: d.password, options: { data: { first_name: firstName } }
  });
  if (error){ showToast(error.message); return; }
  if (!data.session){
    showToast("Check your email to confirm your account, then log in");
    goLogin();
    return;
  }
  await loadAccount(data.user);
  state.onboardingDraft = { countriesVisited: [], tripTypes: [] };
  push("onboarding-countries");
}

export async function submitLogin(){
  const d = state.loginDraft;
  const email = d.email.trim();
  if (!email || !d.password){ showToast("Enter your email and password"); return; }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: d.password });
  if (error){ showToast(error.message); return; }
  await loadAccount(data.user);
  if (state.account.milestone !== "onboarded"){
    state.onboardingDraft = { countriesVisited: state.account.countriesVisited, tripTypes: state.account.tripTypes };
    push("onboarding-countries");
    return;
  }
  await loadCourses();
  resetToHome();
}

export function toggleOnboardingCountry(countryKey){
  const list = state.onboardingDraft.countriesVisited;
  const idx = list.indexOf(countryKey);
  if (idx >= 0) list.splice(idx, 1); else list.push(countryKey);
  notify();
}
export function continueOnboardingCountries(){ push("onboarding-trip-types"); }

export function toggleOnboardingTripType(tripKey){
  const list = state.onboardingDraft.tripTypes;
  const idx = list.indexOf(tripKey);
  if (idx >= 0) list.splice(idx, 1); else list.push(tripKey);
  notify();
}
export function continueOnboardingTripTypes(){ push("onboarding-trip-booked"); }

// The graduation moment: collapses the whole auth/onboarding stack
// down to Home (same "fresh root" move resetToHome uses for every
// other mode transition), then — only for a traveler with a trip
// already booked — immediately starts the existing trip-creation flow
// on top of it, so back-navigation from the country picker lands on
// Home rather than back into onboarding.
export async function finishOnboarding(hasBookedTrip){
  const account = state.account;
  account.countriesVisited = state.onboardingDraft.countriesVisited;
  account.tripTypes = state.onboardingDraft.tripTypes;
  account.hasBookedTrip = hasBookedTrip;
  account.milestone = "onboarded";
  const { error } = await supabase.from("profiles").update({
    onboarded: true,
    countries_visited: account.countriesVisited,
    trip_types: account.tripTypes,
    has_booked_trip: hasBookedTrip
  }).eq("id", account.id);
  if (error){ showToast("Couldn't save your onboarding answers"); }
  state.stack = [{ name: "home" }];
  if (hasBookedTrip) startCourse();
  else notify();
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
// Same two-push stack (country, then trip) startCourse+selectCountry
// would produce — used by the Home screen's destination teaser row so
// tapping a specific country jumps straight to trip details, while
// back-navigation still lands on the country picker as normal.
export function quickStartCourse(countryKey){
  state.draft = { countryKey, tripKey: null };
  push("country");
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
// Resolution happens server-side, in the finalize-course Edge Function
// (supabase/content/functions/finalize-course): it resolves the
// traveler's Trip Type against a *published* Blueprint when one
// exists, pinning the resolved Lesson ids into `course.syllabus` so a
// Blueprint published later doesn't retroactively change the syllabus
// of a trip already in progress, and falls back to a generic syllabus
// shell (packages/shared/content-engine's legacySyllabus) for Trip
// Types with no published Blueprint yet.
export async function finalizeCourse(payload){
  const { data, error } = await supabase.functions.invoke("finalize-course", {
    body: {
      countryKey: payload.countryKey,
      tripKey: payload.tripKey,
      notes: payload.notes,
      startDate: payload.startDate,
      endDate: payload.endDate
    }
  });
  if (error){
    showToast("Couldn't generate your course — try again");
    pop();
    return;
  }
  const course = rowToCourse(data);
  state.courses.unshift(course);
  state.stack.pop();
  push("dashboard", { course });
}
// Check-on-render rather than a scheduled push notification (this app
// has no background/server component to run a scheduled job from) —
// called wherever a course is displayed (BoardRow.jsx, Dashboard.jsx),
// so the moment a user opens the app after their return date, the
// prompt is already there. `needsFeedback` is true once `travelEnd` is
// in the past and `feedbackSubmitted` is still false, regardless of
// whether the course's lessons were ever finished — a badly-prepared
// trip is exactly the case we most want feedback on, not just the
// well-completed ones. See Feedback.jsx for the rest of the rationale
// (why post-trip, why this survey shape).
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
  // Fire-and-forget: the UI already reflects the change (`course` is
  // the same object referenced from state.courses), this just
  // persists it — matches lessonStepContinue's sync below.
  supabase.from("courses")
    .update({ feedback_submitted: true, feedback: course.feedback })
    .eq("id", course.id)
    .then(({ error }) => { if (error) showToast("Feedback saved, but couldn't sync — try again later"); });
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
  supabase.from("courses")
    .update({ current_week: course.currentWeek, status: course.status })
    .eq("id", course.id)
    .then(({ error }) => { if (error) showToast("Progress saved, but couldn't sync — try again later"); });
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
