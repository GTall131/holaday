import FlagIcon from "../components/FlagIcon";
import WeekRow from "../components/WeekRow";
import { travelerCountry, needsFeedback, openPhrasebook, openFeedback, openLesson } from "../store";
import { TRIP_TYPES } from "../data/tripTypes";

/* ================================================================
   SCREEN: DASHBOARD

   ASSUMPTION: progressive unlock (future weeks locked until the prior
   week is marked complete) is read by users as helpful pacing/focus,
   not as an artificial gate that frustrates people who want to skim
   ahead or binge content before their trip.

   HYPOTHESIS: we believe locking future weeks increases actual lesson
   completion (vs. exposing the whole syllabus at once and letting
   people jump around), because it keeps users focused on one thing at
   a time rather than skimming and losing momentum. We'll know this is
   wrong if a meaningful share of testers tap locked weeks repeatedly
   (frustration signal), or say in feedback that they wanted to
   preview later content.

   VALIDATION METRIC: tap-on-locked-week event rate (how often users
   try to open something that's locked) as a frustration proxy, plus a
   completion-rate comparison if/when we A/B against an
   unlocked-all-weeks variant.

   Course progression is Leg-grouped whenever `course.legs` is present
   — i.e. the course was resolved from a
   published Blueprint rather than the legacy hardcoded syllabus() (see
   store.js finalizeCourse/resolveBlueprintSyllabus):
     - Ticket stats: "Leg n of N" is shown alongside total weeks (kept
       as a secondary stat for trip-date pacing, not replaced).
     - The week-list is Leg-grouped, reusing the `.section-label`
       pattern as Leg headers ("LEG 1 — SLIGHTLY SCARED TOURIST").
       Locking is still sequential by week number (not per-Leg) — a
       real build would lock a whole Leg until the prior one finishes;
       this demo keeps the simpler per-week unlock rule and layers Leg
       headers on top of it.
     - A dedicated Leg-complete toast fires the Leg's `blurb` copy
       instead of the generic "Lesson complete" message when the
       finished lesson was the last one in its Leg (see store.js
       lessonStepContinue).
   ================================================================ */
export default function Dashboard({ payload }){
  const c = payload.course;
  const country = travelerCountry(c.countryKey);
  const trip = TRIP_TYPES[c.tripKey];
  const weeks = c.syllabus;
  const doneCount = c.status === "completed" ? c.weeks : Math.max(0, c.currentWeek - 1);
  const pct = Math.round((doneCount / c.weeks) * 100);
  const hasLegacyContent = !!country.phrases;

  function weekMeta(week, idx){
    const num = idx + 1;
    const built = week.source === "authored" || (num <= 3 && hasLegacyContent);
    const done = c.status === "completed" || num < c.currentWeek;
    const locked = !built || (c.status !== "completed" && num > c.currentWeek);
    return { num, built, done, locked };
  }

  let weekListNode;
  if (c.legs){
    let idx = 0;
    weekListNode = c.legs.map((leg, legIndex) => {
      const rows = [];
      while (idx < weeks.length && weeks[idx].legIndex === legIndex){
        const week = weeks[idx];
        const { num, built, done, locked } = weekMeta(week, idx);
        rows.push(
          <WeekRow key={idx} num={num} week={week} done={done} locked={locked} built={built} onOpen={() => openLesson(num)} />
        );
        idx++;
      }
      return (
        <div key={legIndex}>
          <div className="section-label" style={{ marginTop: "20px" }}>Leg {legIndex + 1} — {leg.name.toUpperCase()}</div>
          <div className="week-list">{rows}</div>
        </div>
      );
    });
  } else {
    weekListNode = (
      <>
        <div className="section-label" style={{ marginTop: "20px" }}>Your syllabus</div>
        <div className="week-list">
          {weeks.map((week, idx) => {
            const { num, built, done, locked } = weekMeta(week, idx);
            return <WeekRow key={idx} num={num} week={week} done={done} locked={locked} built={built} onOpen={() => openLesson(num)} />;
          })}
        </div>
      </>
    );
  }

  let legStat = null;
  if (c.legs){
    const currentEntry = weeks[Math.min(c.currentWeek, c.weeks) - 1];
    const currentLegNum = c.status === "completed" ? c.legs.length : (currentEntry ? currentEntry.legIndex + 1 : 1);
    legStat = <div><b>{currentLegNum}/{c.legs.length}</b><small>Current leg</small></div>;
  }

  return (
    <>
      <div className="ticket">
        <div className="ticket__stripe">
          <span style={{ background: country.colours.primary }}></span>
          <span style={{ background: country.colours.secondary }}></span>
          <span style={{ background: country.colours.tertiary }}></span>
        </div>
        <div className="ticket__eyebrow">{trip.label} · {country.capital}</div>
        <div className="ticket__title"><FlagIcon markup={country.flag} className="ticket__flag" />{country.name}</div>
        <div className="ticket__meta">
          {legStat}
          <div><b>{c.weeks}</b><small>Weeks total</small></div>
          <div><b>{c.status === "completed" ? c.weeks : c.currentWeek}</b><small>{c.status === "completed" ? "Completed" : "Current week"}</small></div>
        </div>
        <div className="ticket__progress">
          <div className="ticket__progress-track"><div className="ticket__progress-fill" style={{ width: `${pct}%` }}></div></div>
          <div className="ticket__progress-label">{pct}% trip-ready</div>
        </div>
        {c.status === "completed" ? <button className="ticket__cta" onClick={openPhrasebook}>View offline phrasebook</button> : null}
        {needsFeedback(c) ? <button className="ticket__cta" onClick={openFeedback}>Share trip feedback</button> : null}
      </div>

      <div className="culture-card">
        <div className="culture-card__label">Know before you go</div>
        <div className="culture-card__body">{country.cultureTip}</div>
      </div>

      {weekListNode}
    </>
  );
}
