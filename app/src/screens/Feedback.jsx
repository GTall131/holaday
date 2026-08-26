import { useState } from "react";
import { state, travelerCountry, resetFeedbackDraft, feedbackScore, feedbackCulture, submitFeedback } from "../store";

/* ================================================================
   SCREEN: FEEDBACK

   Only reachable once store.js's needsFeedback() is true (the
   Dashboard ticket CTA and the Home board row both surface it) — i.e.
   the trip's return date has already passed and no feedback has been
   submitted yet (see store.js tripEnded/needsFeedback, and
   travelStart/travelEnd captured back in TripDetails.jsx). Deliberately
   independent of lesson-completion status: a course that stalled at
   week 2 still had a real trip happen, and that's arguably the more
   useful feedback to collect, not less.

   This exists to answer a PRD success-metric that couldn't be
   collected before: post-trip customer satisfaction / NPS, gathered
   once the trip has actually happened rather than at course
   completion (a course can be "trip-ready" before departure and still
   not have a real post-trip result yet). The core assumption this is
   testing: scoping a course to one finite, dated trip — rather than
   an open-ended subscription — is what drives people to actually
   FINISH, not just start.

   ASSUMPTION: a 1-5 NPS-style scale plus a single yes/no question
   about culture/etiquette content specifically is enough signal to
   test that hypothesis, without needing a longer post-trip survey
   that risks a lower response rate.

   VALIDATION METRIC: feedback-prompt response rate (submitted vs.
   ever shown), and the culture Y/N split specifically, benchmarked
   against overall NPS — if culture "yes" doesn't correlate with a
   higher score, that undercuts the "culture is a real differentiator"
   bet (see App.jsx's KEY DIFFERENTIATOR note).
   ================================================================ */
export default function Feedback({ payload }){
  resetFeedbackDraft();
  const c = payload.course;
  const country = travelerCountry(c.countryKey);
  const [notes, setNotes] = useState("");

  const cta = state.feedbackDraft.score ? "Submit feedback" : "Rate your trip above";

  return (
    <>
      <p style={{ fontSize: "13px", color: "var(--slate)", margin: "6px 2px 14px" }}>
        Your {country.name} trip has wrapped up — a couple of quick questions while it's fresh.
      </p>

      <label className="field-label" style={{ marginTop: "6px" }}>How likely are you to recommend Holaday to a friend planning a similar trip?</label>
      <div className="feedback-scale">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} data-selected={state.feedbackDraft.score === n} onClick={() => feedbackScore(n)}>{n}</button>
        ))}
      </div>
      <div className="feedback-scale-labels"><span>Not likely</span><span>Very likely</span></div>

      <label className="field-label">Did anything you learned about local customs or etiquette come in useful on the trip?</label>
      <div className="feedback-yn">
        <button data-selected={state.feedbackDraft.cultureHelped === "yes"} onClick={() => feedbackCulture("yes")}>Yes</button>
        <button data-selected={state.feedbackDraft.cultureHelped === "no"} onClick={() => feedbackCulture("no")}>No</button>
      </div>

      <label className="field-label" htmlFor="feedback-notes">Anything else worth telling us? (optional)</label>
      <textarea
        className="notes"
        id="feedback-notes"
        placeholder="e.g. wish there'd been more on tipping, the transport lesson saved me on day one..."
        value={notes}
        onChange={e => setNotes(e.target.value)}
      />

      <div className="sticky-cta">
        <button className="btn-primary" disabled={!state.feedbackDraft.score} onClick={() => submitFeedback(notes.trim())}>
          {cta}
        </button>
      </div>
    </>
  );
}
