import AdminListRow from "../components/AdminListRow";
import { state, newAdminPersona, openAdminPersona } from "../store";

export default function AdminPersonas(){
  const rows = state.adminPersonas
    .slice()
    .sort((a, b) => (a.data.name || "Untitled persona").localeCompare(b.data.name || "Untitled persona"));

  return (
    <>
      <p style={{ fontSize: "13px", color: "var(--slate)", margin: "6px 2px 14px" }}>
        Sketch a traveler persona, let it get fleshed out, then generate starter lesson content from it.
      </p>
      <button className="btn-primary" style={{ margin: "0 0 18px" }} onClick={newAdminPersona}>+ New persona</button>
      {rows.length ? rows.map(p => (
        <AdminListRow
          key={p.id}
          name={p.data.name || "Untitled persona"}
          sub={p.data.generated ? "Generated" : "Outline only"}
          onClick={() => openAdminPersona(p.id)}
        />
      )) : <div className="admin-empty">No personas yet.</div>}
    </>
  );
}
