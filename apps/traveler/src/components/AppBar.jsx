import { pop, travelerCountry } from "../store";
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
  if (name === "dashboard"){
    const country = travelerCountry(payload.course.countryKey);
    return `${country ? country.name : payload.course.countryKey} — ${TRIP_TYPES[payload.course.tripKey].label}`;
  }
  if (name === "lesson") return `Week ${payload.week}`;
  if (name === "phrasebook") return "Phrasebook";
  if (name === "feedback") return "Trip feedback";
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
    </header>
  );
}
