import AdminListRow from "../components/AdminListRow";
import { state, newAdminBlueprint, openAdminBlueprint } from "../store";
import { TRIP_TYPES } from "../data/tripTypes";
import { LEG_LADDER } from "../data/admin";

export default function AdminBlueprints(){
  const rows = state.adminBlueprints
    .slice()
    .sort((a, b) => TRIP_TYPES[a.data.tripKey].label.localeCompare(TRIP_TYPES[b.data.tripKey].label));

  return (
    <>
      <button
        className="btn-primary"
        style={{ margin: "6px 0 18px" }}
        disabled={!state.adminModules.length}
        onClick={() => newAdminBlueprint(Object.keys(TRIP_TYPES)[0], LEG_LADDER[0])}
      >
        + New blueprint
      </button>
      {!state.adminModules.length ? <p className="admin-hint">Create a Module first — Blueprints gate Modules into Legs.</p> : null}
      {rows.length ? rows.map(bp => (
        <AdminListRow
          key={bp.id}
          name={TRIP_TYPES[bp.data.tripKey].label}
          sub={`${bp.data.legs.length} leg${bp.data.legs.length === 1 ? "" : "s"} · v${bp.version}`}
          status={bp.status}
          onClick={() => openAdminBlueprint(bp.id)}
        />
      )) : <div className="admin-empty">No blueprints yet.</div>}
    </>
  );
}
