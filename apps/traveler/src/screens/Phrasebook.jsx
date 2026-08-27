import FlagIcon from "../components/FlagIcon";
import VocabCard from "../components/VocabCard";
import { travelerCountry, downloadPhrasebook } from "../store";
import { TRIP_TYPES } from "../data/tripTypes";

/* ================================================================
   SCREEN: PHRASEBOOK

   Deliberately gated to COMPLETED courses only (see the `ticket__cta`
   button in Dashboard.jsx, only rendered when `course.status ===
   "completed"`) — not available mid-course. Rationale: the phrasebook
   is framed as the take-away artefact from a finished course — "you
   did the prep, here's the condensed reference for the trip itself"
   — rather than a shortcut that lets someone skip the lessons and
   just grab the phrase list on day one. A real v1 might reconsider
   this (e.g. unlock per-lesson as content is completed, so a
   partially-finished course still has a partial phrasebook), but
   "completed only" is the simplest version that proves the feature.

   Content is compiled, not separately authored: it's the same country
   phrasebank + transport phrasebank + cultureTip + transport
   etiquette already used across the lessons (see store.js
   travelerCountry), reassembled into one reference page — there is no
   new content model here, just a new view over existing data.

   The "Download for offline use" button is an intentional stub (see
   store.js downloadPhrasebook) — it shows a toast instead of
   producing a file, exactly like the disabled Explore/Profile tabs.
   In a real build this would generate a PDF or add-to-device-storage
   flow; this prototype only needs to prove that the entry point and
   framing exist.

   ASSUMPTION: framing the phrasebook as a "you finished, here's your
   reward" artefact (completed-only) drives more course completion
   than treating it as a progressively-unlocked utility would — i.e.,
   withholding it is a completion incentive, not just a
   scope-simplification.

   HYPOTHESIS: we believe gating the phrasebook to completed courses
   increases the likelihood users finish all weeks, vs. a partial
   phrasebook available mid-course (which might let people feel "done
   enough" after grabbing the phrases they want). We'll know this is
   wrong if testers report they wanted the phrasebook mid-course and it
   becomes an abandonment trigger rather than a completion driver.

   VALIDATION METRIC: in-course intent signal — track how often (and
   at what week) users try to reach a phrasebook/reference view before
   it's unlocked; compare completion rate qualitatively via exit
   surveys for users who drop off before finishing.
   ================================================================ */
export default function Phrasebook({ payload }){
  const c = payload.course;
  const country = travelerCountry(c.countryKey);
  const trip = TRIP_TYPES[c.tripKey];

  return (
    <>
      <div className="ticket">
        <div className="ticket__stripe">
          <span style={{ background: country.colours.primary }}></span>
          <span style={{ background: country.colours.secondary }}></span>
          <span style={{ background: country.colours.tertiary }}></span>
        </div>
        <div className="ticket__eyebrow">Offline phrasebook · {country.capital}</div>
        <div className="ticket__title"><FlagIcon markup={country.flag} className="ticket__flag" />{country.name}</div>
        <button className="ticket__cta" onClick={downloadPhrasebook}>Download for offline use</button>
      </div>

      <p className="lesson-intro">Every phrase and etiquette tip from your {trip.label.toLowerCase()} course, in one place — no signal needed once it's downloaded.</p>

      {country.phrases ? (
        <>
          <div className="section-label">Essentials</div>
          <div className="vocab-grid">
            {country.phrases.map((p, i) => <VocabCard key={i} phrase={p} />)}
          </div>

          {country.transport ? (
            <>
              <div className="section-label" style={{ marginTop: "20px" }}>Getting around</div>
              <div className="vocab-grid">
                {country.transport.phrases.map((p, i) => <VocabCard key={i} phrase={p} />)}
              </div>
            </>
          ) : null}

          <div className="culture-card" style={{ marginTop: "20px" }}>
            <div className="culture-card__label">Good to know</div>
            <div className="culture-card__body">{country.cultureTip}</div>
            {country.transport ? (
              <ul className="etiquette-list" style={{ marginTop: "10px" }}>
                {country.transport.etiquette.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="culture-card" style={{ marginTop: "20px" }}>
            <div className="culture-card__label">Good to know</div>
            <div className="culture-card__body">{country.cultureTip}</div>
          </div>
          <div className="admin-empty" style={{ marginTop: "20px" }}>No offline phrasebook has been authored for {country.name} yet.</div>
        </>
      )}
    </>
  );
}
