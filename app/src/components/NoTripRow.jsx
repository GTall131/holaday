import { startCourse } from "../store";

// Empty-state twin of BoardRow, sized identically so the "Current"
// section doesn't jump in height once a real trip exists — a sad face
// stands in for the flag, "Nowhere" stands in for the destination.
export default function NoTripRow(){
  return (
    <button className="board-row" onClick={startCourse}>
      <span className="flag-icon board-row__flag board-row__flag--empty" aria-hidden="true">
        <svg viewBox="0 0 30 20">
          <circle cx="10" cy="7.5" r="1.6" fill="#9aa3b5" />
          <circle cx="20" cy="7.5" r="1.6" fill="#9aa3b5" />
          <path d="M9 15 Q15 11.5 21 15" stroke="#9aa3b5" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      </span>
      <span className="board-row__mid">
        <div className="board-row__dest">NOWHERE</div>
        <div className="board-row__sub">No trip booked yet</div>
      </span>
      <span className="board-row__status status--start">Start a course</span>
    </button>
  );
}
