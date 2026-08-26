import { useState } from "react";
import { state, publishedDestinations, push } from "../../store";
import { TRIP_TYPES } from "../../data/tripTypes";

export default function AdminPersonaGenerateContent({ payload }){
  const persona = state.adminPersonas.find(p => p.id === payload.personaId);
  const [countryKey, setCountryKey] = useState("");
  const [tripKey, setTripKey] = useState("");
  const countries = publishedDestinations();
  if (!persona) return <div className="admin-empty">Persona not found.</div>;

  return (
    <>
      <div style={{ fontWeight: 800, fontSize: "19px", marginTop: "14px" }}>{persona.data.name || "Persona"}</div>
      <p style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "6px" }}>
        Generate a starter Module, Lesson, and Phrases for this persona's trip.
      </p>

      <label className="field-label" htmlFor="persona-gen-country">Country</label>
      <select className="admin-select" id="persona-gen-country" value={countryKey} onChange={e => setCountryKey(e.target.value)}>
        <option value="">— pick a country —</option>
        {countries.map(d => <option key={d.countryKey} value={d.countryKey}>{d.data.name}</option>)}
      </select>
      {!countries.length ? <p className="admin-hint">No published destinations yet — publish one first.</p> : null}

      <label className="field-label" htmlFor="persona-gen-trip">Trip type</label>
      <select className="admin-select" id="persona-gen-trip" value={tripKey} onChange={e => setTripKey(e.target.value)}>
        <option value="">— pick a trip type —</option>
        {Object.entries(TRIP_TYPES).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
      </select>

      <div className="sticky-cta admin-actions">
        <button
          className="btn-primary"
          disabled={!countryKey || !tripKey}
          onClick={() => push("admin-persona-generating-content", { personaId: persona.id, countryKey, tripKey })}
        >
          Generate
        </button>
      </div>
    </>
  );
}
