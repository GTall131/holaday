import { pop, state } from "../store";
import { TRIP_TYPES } from "../data/tripTypes";

function titleFor(top){
  const { name, payload } = top;
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
  if (top.name === "login" || top.name === "admin-home"){
    return (
      <header className="appbar appbar--home">
        <div>
          <div className="wordmark">Hola<span>day</span> <span style={{ color: "var(--slate)", fontWeight: 700 }}>Admin</span></div>
          <span className="tagline">Content authoring</span>
        </div>
      </header>
    );
  }

  return (
    <header className="appbar">
      <button className="appbar__back" aria-label="Back" onClick={pop}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="#14181F" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>
      <div className="appbar__title">{titleFor(top)}</div>
      <div className="appbar__badge">ADMIN</div>
    </header>
  );
}
