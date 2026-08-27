import { pop, state, travelerCountry } from "../store";
import { TRIP_TYPES } from "../data/tripTypes";

function titleFor(top){
  const { name, payload } = top;
  if (name === "login") return "Log in";
  if (name === "signup") return "Create your account";
  if (name === "onboarding-countries") return "Where you've been";
  if (name === "onboarding-trip-types") return "What you're into";
  if (name === "onboarding-trip-booked") return "Almost there";
  if (name === "country") return "Choose a country";
  if (name === "trip") return "Describe the trip";
  if (name === "generating") return "";
  if (name === "dashboard") return `${travelerCountry(payload.course.countryKey).name} — ${TRIP_TYPES[payload.course.tripKey].label}`;
  if (name === "lesson") return `Week ${payload.week}`;
  if (name === "phrasebook") return "Phrasebook";
  if (name === "feedback") return "Trip feedback";
  if (name === "admin-languages") return "Languages";
  if (name === "admin-language"){
    const rec = payload && payload.id ? state.adminLanguages.find(l => l.id === payload.id) : null;
    return rec ? rec.name : "New language";
  }
  if (name === "admin-destinations") return "Destinations";
  if (name === "admin-staged") return "Staged";
  if (name === "admin-destination"){
    const rec = payload && payload.id ? state.adminDestinations.find(d => d.id === payload.id) : null;
    return rec ? rec.data.name : "New destination";
  }
  if (name === "admin-module"){
    const rec = payload && payload.id ? state.adminModules.find(m => m.id === payload.id) : null;
    return rec ? rec.data.name : "New module";
  }
  if (name === "admin-lesson"){
    const rec = payload && payload.id ? state.adminLessons.find(l => l.id === payload.id) : null;
    return rec ? rec.data.title : "New lesson";
  }
  if (name === "admin-phrase"){
    const rec = payload && payload.id ? state.adminPhrases.find(p => p.id === payload.id) : null;
    return rec ? rec.data.en : "New phrase";
  }
  if (name === "admin-blueprints") return "Trip Type Blueprints";
  if (name === "admin-blueprint"){
    const rec = payload && payload.id ? state.adminBlueprints.find(b => b.id === payload.id) : null;
    return rec ? TRIP_TYPES[rec.data.tripKey].label : "New blueprint";
  }
  if (name === "admin-personas") return "Personas";
  if (name === "admin-persona"){
    const rec = payload && payload.id ? state.adminPersonas.find(p => p.id === payload.id) : null;
    return rec ? (rec.data.name || "Untitled persona") : "New persona";
  }
  if (name === "admin-persona-generating") return "Generating persona…";
  if (name === "admin-persona-generate-content") return "Generate lesson content";
  if (name === "admin-persona-generating-content") return "Generating content…";
  if (name === "admin-persona-generated-content") return "Generated content";
  return "";
}

export default function AppBar({ top }){
  if (top.name === "welcome" || top.name === "home"){
    return (
      <header className="appbar appbar--home">
        <div>
          <div className="wordmark">Hola<span>day</span></div>
          <span className="tagline">Trip-ready in 6–8 weeks</span>
        </div>
      </header>
    );
  }
  if (top.name === "admin-home"){
    return (
      <header className="appbar appbar--home">
        <div>
          <div className="wordmark">Hola<span>day</span> <span style={{ color: "var(--slate)", fontWeight: 700 }}>Admin</span></div>
          <span className="tagline">Demo-phase content authoring</span>
        </div>
      </header>
    );
  }

  const title = titleFor(top);
  return (
    <header className="appbar">
      <button className="appbar__back" aria-label="Back" onClick={pop}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#14181F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <div className="appbar__title">{title}</div>
      {top.name === "dashboard" ? (
        <div className="appbar__badge">
          {top.payload.course.status === "completed" ? "LANDED" : `WEEK ${top.payload.course.currentWeek}/${top.payload.course.weeks}`}
        </div>
      ) : null}
      {top.name.startsWith("admin-") ? <div className="appbar__badge">ADMIN</div> : null}
    </header>
  );
}
