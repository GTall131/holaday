export default function WeekRow({ num, week, done, locked, built, onOpen }){
  const statusTag = locked ? (built ? "Upcoming" : "Preview only") : (done ? "Review" : "Start");
  return (
    <button
      className="week-row"
      data-locked={locked}
      onClick={locked ? undefined : onOpen}
    >
      <span className="week-row__num" data-done={done}>{done ? "✓" : num}</span>
      <span className="week-row__title">{week.title}</span>
      <span className="week-row__tag">{week.type} · {statusTag}</span>
    </button>
  );
}
