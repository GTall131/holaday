import FlagIcon from "./FlagIcon";
import { TRIP_TYPES } from "../data/tripTypes";
import { travelerCountry, needsFeedback, openCourse } from "../store";

// TODO(admin): as a traveler, this row's subtitle should read "Leg 2
// of 3 · Lesson 2 of 4" instead of "Week 4 of 7", once courses carry
// currentLeg/totalLegs/legName (see store.js STATE comment and
// finalizeCourse). The Home board is the other place progression
// should be legible at a glance, not just inside the dashboard
// (Dashboard.jsx already does Leg-grouping when `course.legs` is
// present). See ADMIN-CONTENT-PLAN.md §9.
export default function BoardRow({ course: c }){
  const country = travelerCountry(c.countryKey);
  const statusClass = c.status === "completed" ? "status--landed" : (c.currentWeek <= 1 ? "status--boarding" : "status--progress");
  const statusText = c.status === "completed" ? "Landed" : (c.currentWeek <= 1 ? "Boarding" : "In progress");
  return (
    <button className="board-row" onClick={() => openCourse(c.id)}>
      <FlagIcon markup={country.flag} className="board-row__flag" />
      <span className="board-row__mid">
        <div className="board-row__dest">{country.name.toUpperCase()} · {TRIP_TYPES[c.tripKey].label}</div>
        <div className="board-row__sub">
          {c.status === "completed" ? `Completed · ${c.weeks} wks` : `Week ${c.currentWeek} of ${c.weeks}`}
          {needsFeedback(c) ? " · Feedback requested" : ""}
        </div>
      </span>
      <span className={`board-row__status ${statusClass}`}>{statusText}</span>
    </button>
  );
}
