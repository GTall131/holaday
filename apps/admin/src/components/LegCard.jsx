import { state, moduleScopeLabel, patchBlueprintLeg, removeBlueprintLeg, toggleBlueprintGate, setBlueprintGateTier } from "../store";
import { LEG_LADDER } from "../data/admin";

export default function LegCard({ leg, li }){
  return (
    <div className="admin-question-card">
      <div className="admin-question-card__head">
        <span className="admin-question-card__index">{LEG_LADDER[li] || `Leg ${li + 1}`}</span>
        <button type="button" className="admin-remove-btn" onClick={() => removeBlueprintLeg(li)}>Remove</button>
      </div>

      <label className="field-label">Leg name</label>
      <input className="text-input" value={leg.name} placeholder={`e.g. ${LEG_LADDER[li] || "Leg name"}`}
        onChange={e => patchBlueprintLeg(li, { name: e.target.value })} />

      <label className="field-label">Blurb</label>
      <textarea className="notes" style={{ minHeight: "44px" }} placeholder="What does this leg feel like for the traveler?"
        value={leg.blurb} onChange={e => patchBlueprintLeg(li, { blurb: e.target.value })} />

      <label className="field-label">Modules gated into this leg</label>
      {state.adminModules.length ? state.adminModules.map(mod => {
        const gate = leg.moduleGates.find(g => g.moduleId === mod.id);
        return (
          <div className="admin-list-row" style={{ cursor: "default" }} key={mod.id}>
            <input
              type="checkbox"
              checked={!!gate}
              style={{ width: "18px", height: "18px", flexShrink: 0 }}
              onChange={() => toggleBlueprintGate(li, mod.id, 1)}
            />
            <span className="admin-list-row__mid">
              <div className="admin-list-row__name">{mod.data.name}</div>
              <div className="admin-list-row__sub">{moduleScopeLabel(mod)} · up to Tier {mod.data.tierCount}{mod.status !== "published" ? " · not yet published" : ""}</div>
            </span>
            <input
              className="text-input"
              type="number"
              min="1"
              max={mod.data.tierCount}
              value={gate ? gate.tier : 1}
              style={{ width: "52px", textAlign: "center", flexShrink: 0 }}
              onChange={e => setBlueprintGateTier(li, mod.id, Math.max(1, Math.min(mod.data.tierCount, Number(e.target.value) || 1)))}
            />
          </div>
        );
      }) : <p className="admin-hint">No modules yet — create one first.</p>}
    </div>
  );
}
