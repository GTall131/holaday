import AdminStatusChip from "../components/AdminStatusChip";
import LegCard from "../components/LegCard";
import {
  state, primeAdminBlueprintDraft, patchAdminBlueprintDraft, ensureBlueprintPreviewCountry, setBlueprintPreviewCountry,
  resolveBlueprintGateLessons, blueprintIsPublishable, addBlueprintLeg,
  saveDraftBlueprint, stageBlueprint, unstageBlueprint, publishBlueprint, newBlueprintVersion
} from "../store";
import { TRIP_TYPES } from "../data/tripTypes";
import { LEG_LADDER } from "../data/admin";

export default function AdminBlueprintDetail({ payload }){
  const id = payload && payload.id;
  const { record, canEdit, view } = primeAdminBlueprintDraft(id);
  if (!view) return <div className="admin-empty">Blueprint not found.</div>;

  const dests = ensureBlueprintPreviewCountry();

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 2px 4px" }}>
        <span style={{ fontSize: "12px", color: "var(--slate)", fontFamily: "var(--font-mono)" }}>{record ? `v${record.version}` : "New blueprint"}</span>
        <AdminStatusChip status={view.status} />
      </div>

      {canEdit ? (
        <>
          <label className="field-label" htmlFor="admin-bp-triptype">Trip Type</label>
          <select className="admin-select" id="admin-bp-triptype" value={view.data.tripKey}
            onChange={e => patchAdminBlueprintDraft({ tripKey: e.target.value })}>
            {Object.entries(TRIP_TYPES).map(([key, t]) => <option key={key} value={key}>{t.label}</option>)}
          </select>

          <label className="field-label" style={{ marginTop: "24px" }}>Legs ({view.data.legs.length}/{LEG_LADDER.length})</label>
          {view.data.legs.map((leg, li) => <LegCard key={li} leg={leg} li={li} />)}
          {view.data.legs.length < LEG_LADDER.length
            ? <button type="button" className="btn-secondary" onClick={() => addBlueprintLeg(LEG_LADDER[view.data.legs.length])}>+ Add leg</button>
            : <p className="admin-hint">Maximum of {LEG_LADDER.length} legs.</p>}
        </>
      ) : (
        <>
          <div style={{ fontWeight: 800, fontSize: "19px", marginTop: "14px" }}>{TRIP_TYPES[view.data.tripKey].label}</div>
          <div style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "10px" }}>{view.data.legs.length} leg{view.data.legs.length === 1 ? "" : "s"}</div>
          {view.data.legs.map((leg, li) => (
            <div className="admin-question-card" key={li}>
              <div className="admin-question-card__head"><span className="admin-question-card__index">{leg.name || (LEG_LADDER[li] || `Leg ${li + 1}`)}</span></div>
              <div style={{ fontSize: "13px", color: "var(--slate)" }}>{leg.blurb || "No blurb yet."}</div>
              <div style={{ fontSize: "12px", color: "var(--slate)", marginTop: "6px" }}>{leg.moduleGates.length} module{leg.moduleGates.length === 1 ? "" : "s"} gated</div>
            </div>
          ))}
        </>
      )}

      <div className="admin-preview">
        <div className="admin-preview__label">Dry-run preview — resolves this Blueprint's Legs against a real country, the way a traveler's syllabus will</div>
        {dests.length ? (
          <>
            <label className="field-label" htmlFor="admin-bp-preview-country" style={{ marginTop: 0 }}>Preview country</label>
            <select className="admin-select" id="admin-bp-preview-country" value={state.adminBlueprintPreviewCountry || ""}
              onChange={e => setBlueprintPreviewCountry(e.target.value)}>
              {dests.map(d => <option key={d.countryKey} value={d.countryKey}>{d.data.name}</option>)}
            </select>
            {view.data.legs.map((leg, li) => (
              <div key={li}>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: "10.5px", textTransform: "uppercase", letterSpacing: ".06em", color: "var(--slate)", margin: "16px 2px 6px" }}>
                  {leg.name || (LEG_LADDER[li] || `Leg ${li + 1}`)}
                </div>
                <div className="week-list">
                  {leg.moduleGates.length ? leg.moduleGates.flatMap(gate => {
                    const mod = state.adminModules.find(m => m.id === gate.moduleId);
                    const lessons = resolveBlueprintGateLessons(gate, state.adminBlueprintPreviewCountry);
                    if (!lessons.length){
                      return [
                        <div className="week-row" style={{ cursor: "default" }} key={`${gate.moduleId}-missing`}>
                          <span className="week-row__num" data-done="false">–</span>
                          <span className="week-row__title">{mod ? mod.data.name : "Unknown module"} — not yet resolved</span>
                          <span className="week-row__tag">{mod ? mod.data.name : ""} · Tier {gate.tier}</span>
                        </div>
                      ];
                    }
                    return lessons.map(lesson => (
                      <div className="week-row" style={{ cursor: "default" }} key={lesson.id}>
                        <span className="week-row__num" data-done="true">✓</span>
                        <span className="week-row__title">{lesson.data.title}</span>
                        <span className="week-row__tag">{mod ? mod.data.name : ""} · Tier {gate.tier}</span>
                      </div>
                    ));
                  }) : <div className="admin-empty">No modules gated into this leg yet.</div>}
                </div>
              </div>
            ))}
          </>
        ) : <p className="admin-hint">No published destinations yet — publish one to dry-run this Blueprint.</p>}
      </div>

      {canEdit ? (
        <div className="sticky-cta admin-actions">
          <button className="btn-secondary" onClick={saveDraftBlueprint}>Save Draft</button>
          <button className="btn-primary" onClick={stageBlueprint}>Stage</button>
        </div>
      ) : record && record.status === "staged" ? (
        <>
          <div className="sticky-cta admin-actions">
            <button className="btn-secondary" onClick={() => unstageBlueprint(record.id)}>Back to Draft</button>
            {blueprintIsPublishable(record) ? <button className="btn-primary" onClick={() => publishBlueprint(record.id)}>Publish</button> : null}
          </div>
          {!blueprintIsPublishable(record) ? <p className="admin-hint">Can't publish yet — every gated Module needs to be Published first.</p> : null}
        </>
      ) : record && record.status === "published" ? (
        <div className="sticky-cta admin-actions"><button className="btn-secondary" onClick={() => newBlueprintVersion(record.id)}>Create new draft version</button></div>
      ) : record && record.status === "archived" ? (
        <p className="admin-hint">Archived — superseded by a newer published version.</p>
      ) : null}
    </>
  );
}
