import BoardRow from "../components/BoardRow";
import { state, startCourse } from "../store";

/* ================================================================
   SCREEN: HOME — "MY TRIPS" DEPARTURE BOARD

   WHY THE AIRPORT-BOARD METAPHOR: this screen borrows split-flap
   departure-board language because it maps cleanly onto the product's
   own mental model, not just decoration:
     - A "flight" = a course. It has a destination, a status, and a
       countdown.
     - BOARDING    = course just generated, not yet started.
     - IN PROGRESS = course underway, shows current week like a "gate."
     - LANDED      = course completed (trip has presumably happened).
   This gives users a familiar, glanceable status language instead of
   a generic progress bar, and reinforces "this course exists to get
   you on a plane prepared," not "this is a permanent subscription."
   (See BoardRow.jsx for where BOARDING/IN PROGRESS/LANDED are derived.)

   ASSUMPTION: the departure-board status language is more legible and
   motivating at a glance than a conventional progress bar or
   percentage, and reinforces "this is finite, not a subscription"
   without needing explanatory copy.

   HYPOTHESIS: we believe users correctly infer course state from the
   status labels alone — without confusing "Boarding" for "not started
   yet, nothing to do," or "Landed" for "archived/inaccessible." We'll
   know this is wrong if usability sessions show users misreading a
   status label, or hesitating over what action to take from a given
   status.

   VALIDATION METRIC: quick comprehension check in early usability
   sessions — show the home screen and ask users to say, in their own
   words, what each status means and what happens if they tap it;
   track % correct per label. In-app, tap-through rate on "Landed"
   rows (do people still open completed courses, e.g. to revisit the
   phrasebook) as a secondary signal.
   ================================================================ */
export default function Home(){
  const current = state.courses.filter(c => c.status === "active");
  const previous = state.courses.filter(c => c.status === "completed");

  return (
    <>
      <div className="section-label">Current</div>
      {current.length ? current.map(c => <BoardRow key={c.id} course={c} />) : (
        <div className="board-empty">
          <div className="board-empty__flap">NO ACTIVE TRIP</div>
          <button className="btn-primary" onClick={startCourse}>Book a course</button>
        </div>
      )}

      <div className="section-label">Previous</div>
      {previous.length
        ? previous.map(c => <BoardRow key={c.id} course={c} />)
        : <p style={{ fontSize: "12.5px", color: "var(--slate)", padding: "4px 2px" }}>Completed courses will land here.</p>}
    </>
  );
}
