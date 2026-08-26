/* ================================================================
   HOLADAY — TRIP-READY LANGUAGE & CULTURE COURSES

   PROBLEM: Mainstream language apps (Duolingo, Babbel, Rosetta Stone)
   teach general proficiency across months or years. Most people
   booking a holiday don't want general proficiency — they have a
   specific trip, a specific window of time (often 6-8 weeks out), and
   a narrow set of situations they'll actually face: airport and
   arrival, ordering food, asking directions, basic courtesy, local
   customs that prevent embarrassing mistakes. General courses don't
   prioritise for that, so people either quit a generic course before
   the trip or never start one at all.

   SOLUTION: Holaday generates a short, finite course (6-8 weeks)
   scoped to ONE upcoming trip: the destination country and the kind
   of trip (city break, food & wine, family trip, etc). The course
   ends when the trip is ready to happen — it is not an ongoing
   subscription-style curriculum. Content is prioritised by
   situational usefulness over grammatical completeness.

   TARGET USER: Someone who has already booked or is about to book
   international travel, wants to be a more respectful and capable
   visitor, and has weeks (not years) to prepare. Low tolerance for
   busywork; high tolerance for short, dense, trip-relevant lessons.

   KEY DIFFERENTIATOR:
   - Scoped by TRIP, not by LANGUAGE. Course = country + trip type +
     duration.
   - Finite and disposable by design: a course "completes" before
     departure and is archived, rather than continuing indefinitely.
   - Culture, not just vocabulary: etiquette/customs content is a
     first-class lesson type alongside phrases (see Lesson.jsx,
     week 3 "Public Transport & Getting Around").
   - Visual identity of each course is themed from the destination's
     national flag colours (see the --flag-* CSS vars applied in the
     `flagStyle()` helper below), so a user's course list is instantly
     scannable and each course feels bespoke to that trip.

   CORE USER JOURNEY (the `Screen` switch below is the literal map of
   this flow — each case is one stack entry pushed by store.js):
     Home (My Trips)                — screens/Home.jsx
       -> Step 1: Choose a country  — screens/CountryPicker.jsx
       -> Step 2: Describe the trip — screens/TripDetails.jsx
       -> Generating course         — screens/Generating.jsx
       -> Course dashboard          — screens/Dashboard.jsx
       -> Lesson (one question per page) — screens/Lesson.jsx
       -> Phrasebook / Feedback     — screens/Phrasebook.jsx, Feedback.jsx
     A parallel "Admin" tab (screens/admin/*) is a demo-phase content
     authoring surface — see store.js and ADMIN-CONTENT-PLAN.md.

   MVP SCOPE: the "Explore"/"Profile" tabs (TabBar.jsx) and the
   phrasebook's "Download for offline use" button (store.js,
   downloadPhrasebook) are intentional disabled/stub entry points —
   they exist to signal planned-but-out-of-scope surface area, not to
   be wired up in this prototype.
   ================================================================ */
import { useStoreVersion } from "./useStore";
import { state, top, travelerCountry } from "./store";
import AppBar from "./components/AppBar";
import TabBar from "./components/TabBar";
import Toast from "./components/Toast";

import Home from "./screens/Home";
import CountryPicker from "./screens/CountryPicker";
import TripDetails from "./screens/TripDetails";
import Generating from "./screens/Generating";
import Dashboard from "./screens/Dashboard";
import Lesson from "./screens/Lesson";
import Phrasebook from "./screens/Phrasebook";
import Feedback from "./screens/Feedback";

import AdminHome from "./screens/admin/AdminHome";
import AdminLanguages from "./screens/admin/AdminLanguages";
import AdminLanguageDetail from "./screens/admin/AdminLanguageDetail";
import AdminDestinations from "./screens/admin/AdminDestinations";
import AdminStaged from "./screens/admin/AdminStaged";
import AdminDestinationDetail from "./screens/admin/AdminDestinationDetail";
import AdminModuleDetail from "./screens/admin/AdminModuleDetail";
import AdminLessonDetail from "./screens/admin/AdminLessonDetail";
import AdminPhraseDetail from "./screens/admin/AdminPhraseDetail";
import AdminBlueprints from "./screens/admin/AdminBlueprints";
import AdminBlueprintDetail from "./screens/admin/AdminBlueprintDetail";
import AdminPersonas from "./screens/admin/AdminPersonas";
import AdminPersonaDetail from "./screens/admin/AdminPersonaDetail";
import AdminPersonaGenerating from "./screens/admin/AdminPersonaGenerating";
import AdminPersonaGenerateContent from "./screens/admin/AdminPersonaGenerateContent";
import AdminPersonaGeneratingContent from "./screens/admin/AdminPersonaGeneratingContent";

// Mirrors the original's SCREENS map + render() dispatch. Traveler
// screens that ride flag theming get a `key` derived from whatever
// identifies "a fresh instance of this screen" (course id + week +
// step for Lesson) so navigating to a different question — or back to
// a previous one — remounts the screen and its local answer state,
// the same "goes back, presents fresh" behavior the original got from
// always re-rendering from scratch.
function Screen({ top: t }){
  switch (t.name){
    case "home": return <Home />;
    case "country": return <CountryPicker />;
    case "trip": return <TripDetails />;
    case "generating": return <Generating payload={t.payload} />;
    case "dashboard": return <Dashboard payload={t.payload} />;
    case "lesson": return <Lesson key={`${t.payload.course.id}-${t.payload.week}-${t.payload.stepIndex}`} payload={t.payload} />;
    case "phrasebook": return <Phrasebook payload={t.payload} />;
    case "feedback": return <Feedback payload={t.payload} />;
    case "admin-home": return <AdminHome />;
    case "admin-languages": return <AdminLanguages />;
    case "admin-language": return <AdminLanguageDetail payload={t.payload} />;
    case "admin-destinations": return <AdminDestinations />;
    case "admin-staged": return <AdminStaged />;
    case "admin-destination": return <AdminDestinationDetail payload={t.payload} />;
    case "admin-module": return <AdminModuleDetail payload={t.payload} />;
    case "admin-lesson": return <AdminLessonDetail payload={t.payload} />;
    case "admin-phrase": return <AdminPhraseDetail payload={t.payload} />;
    case "admin-blueprints": return <AdminBlueprints />;
    case "admin-blueprint": return <AdminBlueprintDetail payload={t.payload} />;
    case "admin-personas": return <AdminPersonas />;
    case "admin-persona": return <AdminPersonaDetail payload={t.payload} />;
    case "admin-persona-generating": return <AdminPersonaGenerating payload={t.payload} />;
    case "admin-persona-generate-content": return <AdminPersonaGenerateContent payload={t.payload} />;
    case "admin-persona-generating-content": return <AdminPersonaGeneratingContent payload={t.payload} />;
    default: return null;
  }
}

function flagStyle(t){
  let colours = null;
  if (t.name === "dashboard" || t.name === "lesson" || t.name === "phrasebook"){
    colours = travelerCountry(t.payload.course.countryKey).colours;
  } else if (t.name === "admin-blueprint" && state.adminBlueprintPreviewCountry){
    const previewDest = state.adminDestinations.find(d => d.countryKey === state.adminBlueprintPreviewCountry);
    if (previewDest) colours = previewDest.data.colours;
  }
  if (!colours) return undefined;
  return {
    "--flag-primary": colours.primary,
    "--flag-secondary": colours.secondary,
    "--flag-tertiary": colours.tertiary
  };
}

export default function App(){
  useStoreVersion();
  const t = top();
  const activeTab = t.name.startsWith("admin") ? "go-admin" : "go-home";

  return (
    <div className={`app-shell${t.name.startsWith("admin") ? " is-admin" : ""}`}>
      <div className="statusbar">
        <span>9:41</span>
        <span className="statusbar__icons">
          <span className="statusbar__bars"><span></span><span></span><span></span><span></span></span>
          <span className="statusbar__batt"></span>
        </span>
      </div>

      <AppBar top={t} />

      <main id="app" style={flagStyle(t)}>
        <Screen top={t} />
      </main>

      <TabBar activeTab={activeTab} />
      <Toast />
    </div>
  );
}
