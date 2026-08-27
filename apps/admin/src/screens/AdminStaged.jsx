import AdminListRow from "../components/AdminListRow";
import { allRecordsByStatus, openRecord, flagMarkup } from "../store";
import { TRIP_TYPES } from "../data/tripTypes";

const TYPE_LABEL = { destination: "Destination", module: "Module", lesson: "Lesson", blueprint: "Blueprint", phrase: "Phrase" };

function nameFor(type, record){
  if (type === "destination") return record.data.name;
  if (type === "module") return record.data.name;
  if (type === "lesson") return record.data.title;
  if (type === "blueprint") return TRIP_TYPES[record.data.tripKey].label;
  if (type === "phrase") return record.data.en;
  return "";
}

export default function AdminStaged(){
  const rows = allRecordsByStatus("staged");
  return (
    <>
      <p style={{ fontSize: "13px", color: "var(--slate)", margin: "6px 2px 14px" }}>
        Everything staged and ready to publish, across destinations, modules, lessons, and blueprints.
      </p>
      {rows.length ? rows.map(({ type, record }) => (
        <AdminListRow
          key={`${type}-${record.id}`}
          flagMarkup={type === "destination" ? flagMarkup(record) : null}
          name={nameFor(type, record)}
          sub={`${TYPE_LABEL[type]} · v${record.version}`}
          status={record.status}
          onClick={() => openRecord(type, record.id)}
        />
      )) : <div className="admin-empty">Nothing staged right now.</div>}
    </>
  );
}
