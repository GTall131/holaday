import { state, openAdminDestinations, openAdminLanguages, openAdminPersonas, logout, push } from "../store";

export default function AdminHome(){
  const destCounts = { draft: 0, staged: 0, published: 0, archived: 0 };
  state.adminDestinations.forEach(d => destCounts[d.status]++);
  const totalStaged =
    state.adminDestinations.filter(d => d.status === "staged").length +
    state.adminModules.filter(m => m.status === "staged").length +
    state.adminLessons.filter(l => l.status === "staged").length +
    state.adminBlueprints.filter(b => b.status === "staged").length +
    state.adminPhrases.filter(p => p.status === "staged").length;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 2px 20px" }}>
        <p style={{ fontSize: "13px", color: "var(--slate)", margin: 0 }}>{state.account ? state.account.email : ""}</p>
        <button className="btn-secondary" style={{ width: "auto", padding: "8px 14px" }} onClick={logout}>Log out</button>
      </div>

      <div className="section-label">Content</div>
      <button className="admin-card" onClick={openAdminLanguages}>
        <div className="admin-card__title">Languages</div>
        <div className="admin-card__meta">{state.adminLanguages.length} language{state.adminLanguages.length === 1 ? "" : "s"}</div>
      </button>
      <button className="admin-card" onClick={openAdminDestinations}>
        <div className="admin-card__title">Destinations</div>
        <div className="admin-card__meta">{destCounts.published} published · {destCounts.draft} draft · {destCounts.staged} staged</div>
      </button>
      <button className="admin-card" onClick={openAdminPersonas}>
        <div className="admin-card__title">Personas</div>
        <div className="admin-card__meta">{state.adminPersonas.length} persona{state.adminPersonas.length === 1 ? "" : "s"}</div>
      </button>

      <div className="section-label">Publishing</div>
      <button className="admin-card" onClick={() => push("admin-staged")}>
        <div className="admin-card__title">Staged</div>
        <div className="admin-card__meta">{totalStaged} item{totalStaged === 1 ? "" : "s"} ready to publish</div>
      </button>
    </>
  );
}
