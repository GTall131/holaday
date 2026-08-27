import { useState } from "react";
import { state, travelerCountry, selectTrip, confirmTrip } from "../store";
import { TRIP_TYPES } from "../data/tripTypes";
import StepProgress from "../components/StepProgress";

/* ================================================================
   SCREEN: TRIP DETAILS

   ASSUMPTION: the trip-type chips capture enough of how a real trip
   actually breaks down that trip-type alone is a sufficient signal to
   prioritize content — without needing the free-text notes to
   actually feed the generated course.

   HYPOTHESIS: we believe users can accurately self-categorize their
   trip into one of these archetypes, rather than feeling like their
   trip is a poor fit for all of them. We'll know this is wrong if
   testers frequently say "none of these really describe my trip," or
   write notes that contradict/override their chip choice.

   VALIDATION METRIC: track chip-selection hesitation — time spent on
   this screen before selecting, and whether users change their chip
   selection after starting to type notes (a proxy for "the chip
   didn't feel right, so they're compensating in free text").

   OPEN QUESTION: departure/return dates captured here are
   only used to know when to trigger the post-trip feedback prompt
   (see store.js needsFeedback/tripEnded, and Feedback.jsx) — do we
   also use them to back-calculate lesson pacing instead of the flat
   per-trip-type week count from TRIP_TYPES? Also unresolved: what
   happens to a course if the trip is postponed/cancelled (dates
   aren't editable after course creation), and should trip type be
   multi-select (a trip is rarely just one archetype)?
   ================================================================ */
export default function TripDetails(){
  const country = travelerCountry(state.draft.countryKey);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [notes, setNotes] = useState("");

  const tripKey = state.draft.tripKey;
  const datesEntered = !!(startDate && endDate);
  const datesValid = datesEntered && new Date(endDate) >= new Date(startDate);

  let ctaLabel, ctaDisabled;
  if (!tripKey){ ctaLabel = "Choose a trip type above"; ctaDisabled = true; }
  else if (!datesValid){ ctaLabel = "Add your travel dates above"; ctaDisabled = true; }
  else { ctaLabel = `Start my ${TRIP_TYPES[tripKey].weeks}-week course`; ctaDisabled = false; }

  return (
    <>
      <StepProgress
        step={2}
        total={2}
        label={`Step 2 of 2 — what's the ${country.name} trip actually like? This shapes which lessons come first.`}
      />
      <div className="chip-grid">
        {Object.entries(TRIP_TYPES).map(([key, t]) => (
          <button key={key} className="chip" data-selected={tripKey === key} onClick={() => selectTrip(key)}>
            <span className="chip__label">{t.label}</span>
            <span className="chip__weeks">{t.weeks} wks</span>
          </button>
        ))}
      </div>
      <label className="field-label">When are you traveling?</label>
      <div className="date-row">
        <div className="date-field">
          <label htmlFor="trip-start">Departure</label>
          <input type="date" id="trip-start" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </div>
        <div className="date-field">
          <label htmlFor="trip-end">Return</label>
          <input type="date" id="trip-end" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </div>
      </div>
      <div className="date-hint" data-tone={datesEntered && !datesValid ? "bad" : undefined}>
        {datesEntered && !datesValid ? "Return date can't be before the departure date." : ""}
      </div>
      <label className="field-label" htmlFor="trip-notes">Anything else worth knowing? (optional)</label>
      <textarea
        className="notes"
        id="trip-notes"
        placeholder="e.g. staying with family, mostly rural, doing a food tour on day 2..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />
      <div className="sticky-cta">
        <button
          className="btn-primary"
          id="trip-cta"
          disabled={ctaDisabled}
          onClick={() => confirmTrip({ notes: notes.trim(), startDate, endDate })}
        >
          {ctaLabel}
        </button>
      </div>
    </>
  );
}
