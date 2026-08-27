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
     first-class lesson type alongside phrases.
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
     Content authoring (Destinations/Modules/Lessons/Phrases/
     Blueprints/Personas) is a separate app, apps/admin — this app only
     ever reads published content (see store.js's loadDestinations/
     travelerCountry/courseLessonBeats), never authors it.

   MVP SCOPE: the "Explore"/"Profile" tabs (TabBar.jsx) and the
   phrasebook's "Download for offline use" button (store.js,
   downloadPhrasebook) are intentional disabled/stub entry points —
   they exist to signal planned-but-out-of-scope surface area, not to
   be wired up yet.
   ================================================================ */
import { useStoreVersion } from "./useStore";
import { top, travelerCountry } from "./store";
import AppBar from "./components/AppBar";
import TabBar from "./components/TabBar";
import Toast from "./components/Toast";

import Welcome from "./screens/Welcome";
import Login from "./screens/Login";
import Signup from "./screens/Signup";
import OnboardingCountries from "./screens/OnboardingCountries";
import OnboardingTripTypes from "./screens/OnboardingTripTypes";
import OnboardingTripBooked from "./screens/OnboardingTripBooked";
import Home from "./screens/Home";
import CountryPicker from "./screens/CountryPicker";
import TripDetails from "./screens/TripDetails";
import Generating from "./screens/Generating";
import Dashboard from "./screens/Dashboard";
import Lesson from "./screens/Lesson";
import Phrasebook from "./screens/Phrasebook";
import Feedback from "./screens/Feedback";

// Mirrors the original's SCREENS map + render() dispatch. Traveler
// screens that ride flag theming get a `key` derived from whatever
// identifies "a fresh instance of this screen" (course id + week +
// step for Lesson) so navigating to a different question — or back to
// a previous one — remounts the screen and its local answer state,
// the same "goes back, presents fresh" behavior the original got from
// always re-rendering from scratch.
function Screen({ top: t }){
  switch (t.name){
    case "welcome": return <Welcome />;
    case "login": return <Login />;
    case "signup": return <Signup />;
    case "onboarding-countries": return <OnboardingCountries />;
    case "onboarding-trip-types": return <OnboardingTripTypes />;
    case "onboarding-trip-booked": return <OnboardingTripBooked />;
    case "home": return <Home />;
    case "country": return <CountryPicker />;
    case "trip": return <TripDetails />;
    case "generating": return <Generating payload={t.payload} />;
    case "dashboard": return <Dashboard payload={t.payload} />;
    case "lesson": return <Lesson key={`${t.payload.course.id}-${t.payload.week}-${t.payload.stepIndex}`} payload={t.payload} />;
    case "phrasebook": return <Phrasebook payload={t.payload} />;
    case "feedback": return <Feedback payload={t.payload} />;
    default: return null;
  }
}

function flagStyle(t){
  if (t.name !== "dashboard" && t.name !== "lesson" && t.name !== "phrasebook") return undefined;
  const country = travelerCountry(t.payload.course.countryKey);
  if (!country) return undefined;
  return {
    "--flag-primary": country.colours.primary,
    "--flag-secondary": country.colours.secondary,
    "--flag-tertiary": country.colours.tertiary
  };
}

const PRE_AUTH_SCREENS = new Set([
  "welcome", "login", "signup",
  "onboarding-countries", "onboarding-trip-types", "onboarding-trip-booked"
]);

export default function App(){
  useStoreVersion();
  const t = top();
  const preAuth = PRE_AUTH_SCREENS.has(t.name);

  return (
    <div className={`app-shell${preAuth ? " no-tabbar" : ""}`}>
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

      {preAuth ? null : <TabBar activeTab="go-home" />}
      <Toast />
    </div>
  );
}
