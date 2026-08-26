import { useMemo, useState } from "react";
import BeatCard from "../components/BeatCard";
import { travelerCountry, courseLessonBeats, lessonMeta, lessonStepContinue } from "../store";
import { TRIP_TYPES } from "../data/tripTypes";

/* ================================================================
   SCREEN: LESSON — a sequence of one-question-per-page "beats"

   Revision history: the very first builds put vocab/etiquette content
   and a 3-question quiz on one long scrollable page (bad — the quiz
   measured how far someone would scroll, not what they remembered).
   The next revision split that into an "info" page (a walk-through of
   phrases/etiquette) followed by a separate "quiz" page. User testing
   on THAT version said it still didn't feel like a lesson — it read
   as a reference card you skimmed, then a quiz on content you'd just
   seen seconds ago, which barely tests retention.

   So a lesson is no longer "content, then quiz." It's a sequence of
   graded question pages — `payload.stepIndex` picks which one to
   show, each pushed as its own stack entry (see store.js openLesson /
   lessonStepContinue). Every page is scenario-framed and asks exactly
   one question; there is no separate content page to read first. The
   back button still lets someone return to a prior question, and
   going back re-presents it fresh (unanswered) — the `key` on this
   component in App.jsx (course id + week + stepIndex) is what gives
   that "fresh, unanswered" reset, since it forces BeatCard to remount
   rather than needing a manual state reset.

   MIXED QUESTION STYLES, NOT ONE REPEATED DRILL: "How do you say X?"
   five times in a row is still just a flashcard deck wearing a
   scenario costume. Each lesson mixes three question styles across
   its beats (see store.js buildBeat/buildLessonBeats), all
   scenario-framed so it still reads as one situation playing out, not
   five disconnected drills:
     - "produce"     — "How do you say X?" — English prompt, answer in
       the local language. Tests recall/production.
     - "comprehend"  — a local phrase is quoted as something someone
       just said to you ("The officer says: '...' — what are they
       telling you?") — local phrase shown, answer in English. Tests
       listening/comprehension, the reverse direction of "produce."
     - "symbol"      — a sign or icon is shown ("You notice this on a
       seat — what does it mean?") with a small inline SVG (SYMBOLS in
       data/flags.js, same font-independent rationale as FLAGS — see
       that file) standing in for a real transit/customs sign. Tests
       recognition of non-verbal cues, not just vocabulary.
     - "situational" — week 3 (Public Transport) only, "what would you
       do?" judgement calls. Reuses each country's existing
       `transport.scenario` content unchanged, just delivered as one
       beat among the others instead of a bonus quiz question tacked
       onto the end.

   Weeks 1 and 2 pull from generic, shared beat plans
   (data/beatPlans.js: ARRIVAL_BEAT_PLAN, EXPLORE_BEAT_PLAN) applied to
   each country's 8-phrase bank (see the content-model note at the top
   of data/countries.js) —
   only the scene-setting context flexes per country (week 1) or trip
   type (week 2, via TRIP_TYPES.exploreIntro). Week 3 (Public
   Transport) is bespoke per country (`transport.beatPlan` on each
   Country in data/countries.js), because its phrases/etiquette were
   already bespoke per country and the symbol/situational beats are
   tied to a specific country's real transit rules (e.g. Japan's quiet
   carriages) — a generic prompt wouldn't fit every destination.

   Every built lesson IS a 5-question multiple-choice sequence, one
   question per page, mixing question styles rather than one repeated
   drill. "Mark lesson complete" only appears on the final question
   and stays disabled until it's answered (see the `answered` state
   below) — a deliberate, if small, gate so the lesson feels like it's
   testing retention rather than just displaying content to scroll
   past.
   ================================================================ */
export default function Lesson({ payload }){
  const c = payload.course;
  const country = travelerCountry(c.countryKey);
  const trip = TRIP_TYPES[c.tripKey];
  const week = payload.week;
  const stepIndex = payload.stepIndex || 0;
  const entry = c.syllabus[week - 1];
  const meta = entry.source === "authored" ? { title: entry.title, type: entry.type + " lesson" } : lessonMeta(week, country, trip);

  // Computed once per (course, week) — matches the original's "fresh
  // shuffle each time you open this lesson" without redoing the work
  // on every question navigated within the same lesson visit.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const beats = useMemo(() => courseLessonBeats(c, week), [c.id, week]);
  const total = beats.length;
  const isLast = stepIndex + 1 >= total;
  const currentBeat = beats[stepIndex];

  const [answered, setAnswered] = useState(false);
  const pct = Math.round((stepIndex / total) * 100);

  return (
    <>
      <div className="lesson-hero">
        <div className="lesson-hero__eyebrow">Week {week} · {country.name} · {meta.type}</div>
        <div className="lesson-hero__title">{meta.title}</div>
      </div>

      <div className="beat-progress">
        <div className="beat-progress__track"><div className="beat-progress__fill" style={{ width: `${pct}%` }}></div></div>
        <div className="beat-progress__label">Question {stepIndex + 1} of {total}</div>
      </div>

      <BeatCard beat={currentBeat} onAnswered={() => setAnswered(true)} />

      <div className="lesson-cta">
        <button
          className="btn-primary"
          disabled={!answered}
          onClick={() => lessonStepContinue({ course: c, week, stepIndex, total })}
        >
          {answered ? (isLast ? "Mark lesson complete" : "Next question") : "Answer to continue"}
        </button>
      </div>
    </>
  );
}
