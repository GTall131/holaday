import AdminStatusChip from "../../components/AdminStatusChip";
import {
  state, primeAdminModuleDraft, patchAdminModuleDraft, moduleScopeLabel, moduleGridRows,
  moduleLessonCandidates, moduleIsComplete, activeCountriesForLanguage,
  saveDraftModule, stageModule, unstageModule, publishModule, newModuleVersion,
  newAdminLessonForModule, openAdminLesson
} from "../../store";

export default function AdminModuleDetail({ payload }){
  const id = payload && payload.id;
  const { record, canEdit, view } = primeAdminModuleDraft(id);
  if (!view) return <div className="admin-empty">Module not found.</div>;

  const moduleLangCountries = view.data.languageId ? activeCountriesForLanguage(view.data.languageId) : [];
  const gridRows = moduleGridRows(view);
  const tiers = Array.from({ length: view.data.tierCount }, (_, i) => i + 1);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 2px 4px" }}>
        <span style={{ fontSize: "12px", color: "var(--slate)", fontFamily: "var(--font-mono)" }}>{record ? `v${record.version}` : "New module"}</span>
        <AdminStatusChip status={view.status} />
      </div>

      {canEdit ? (
        <>
          <label className="field-label" htmlFor="admin-module-name">Module name</label>
          <input className="text-input" id="admin-module-name" value={view.data.name} placeholder="e.g. Ordering Food"
            onChange={e => patchAdminModuleDraft({ name: e.target.value })} />

          <label className="field-label" htmlFor="admin-module-kind">Ladder type</label>
          <select className="admin-select" id="admin-module-kind" value={view.data.kind}
            onChange={e => patchAdminModuleDraft({ kind: e.target.value })}>
            <option value="generic">Generic — one Lesson per Tier, shared across every country</option>
            <option value="bespoke">Country-bespoke — one Lesson per Tier, per country or per language</option>
          </select>

          <label className="field-label" htmlFor="admin-module-tiercount">Number of tiers</label>
          <input className="text-input" type="number" min="1" max="6" id="admin-module-tiercount" value={view.data.tierCount}
            onChange={e => patchAdminModuleDraft({ tierCount: Math.max(1, Math.min(6, Number(e.target.value) || 1)) })} />

          {view.data.kind === "bespoke" ? (
            <>
              <label className="field-label" htmlFor="admin-module-language">Language</label>
              <select className="admin-select" id="admin-module-language" value={view.data.languageId || ""}
                onChange={e => patchAdminModuleDraft({ languageId: e.target.value || null, countryKey: null })}>
                <option value="">— pick a language —</option>
                {state.adminLanguages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              <label className="admin-checkbox-row" htmlFor="admin-module-languagewide">
                <input type="checkbox" id="admin-module-languagewide" checked={view.data.languageWide}
                  onChange={e => patchAdminModuleDraft({ languageWide: e.target.checked, countryKey: null })} />
                This content applies to all countries using this language
              </label>

              {!view.data.languageWide ? (
                <>
                  <label className="field-label" htmlFor="admin-module-country">Country</label>
                  <select className="admin-select" id="admin-module-country" value={view.data.countryKey || ""}
                    onChange={e => patchAdminModuleDraft({ countryKey: e.target.value || null })}>
                    <option value="">— pick a country —</option>
                    {moduleLangCountries.map(d => <option key={d.countryKey} value={d.countryKey}>{d.data.name}</option>)}
                  </select>
                  {!moduleLangCountries.length ? <p className="admin-hint">{view.data.languageId ? "No countries use this language yet." : "Pick a language first."}</p> : null}
                </>
              ) : null}
            </>
          ) : null}
        </>
      ) : (
        <>
          <div style={{ fontWeight: 800, fontSize: "19px", marginTop: "14px" }}>{view.data.name}</div>
          <div style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "10px" }}>{moduleScopeLabel(view)} · {view.data.tierCount} tier{view.data.tierCount === 1 ? "" : "s"}</div>
        </>
      )}

      {!view.id ? (
        <p className="admin-hint">Save this module as a Draft first to start attaching Lessons to its tier ladder.</p>
      ) : (
        <>
          <label className="field-label">Tier ladder completeness</label>
          <div className="admin-grid-scroll">
            <table className="admin-grid-table">
              <thead><tr><th></th>{tiers.map(t => <th key={t}>Tier {t}</th>)}</tr></thead>
              <tbody>
                {gridRows.map(countryKey => {
                  const rowLabel = countryKey === null ? "All countries" : (state.adminDestinations.find(d => d.countryKey === countryKey)?.data.name || countryKey);
                  return (
                    <tr key={countryKey || "generic"}>
                      <td className="admin-grid-row-label">{rowLabel}</td>
                      {tiers.map(t => {
                        const candidates = moduleLessonCandidates(view, t, countryKey);
                        return (
                          <td key={t}>
                            <div className="admin-grid-cell-stack">
                              {candidates.length ? candidates.map(lesson => (
                                <button key={lesson.id} className="admin-grid-cell" onClick={() => openAdminLesson(lesson.id)}>
                                  <AdminStatusChip status={lesson.status} />
                                  <span className="admin-grid-cell__title">{lesson.data.title || "Untitled"}</span>
                                </button>
                              )) : <AdminStatusChip status="missing" />}
                              <button className="admin-grid-cell-add" onClick={() => newAdminLessonForModule({ moduleId: view.id, tier: t, countryKey: countryKey || null })}>+ Add lesson</button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {!moduleIsComplete(view) ? <p className="admin-hint">Every cell needs a Published Lesson before this module can be published.</p> : null}
        </>
      )}

      {canEdit ? (
        <div className="sticky-cta admin-actions">
          <button className="btn-secondary" onClick={saveDraftModule}>Save Draft</button>
          <button className="btn-primary" onClick={stageModule}>Stage</button>
        </div>
      ) : record && record.status === "staged" ? (
        <>
          <div className="sticky-cta admin-actions">
            <button className="btn-secondary" onClick={() => unstageModule(record.id)}>Back to Draft</button>
            {moduleIsComplete(record) ? <button className="btn-primary" onClick={() => publishModule(record.id)}>Publish</button> : null}
          </div>
          {!moduleIsComplete(record) ? <p className="admin-hint">Can't publish yet — the tier ladder above isn't fully Published.</p> : null}
        </>
      ) : record && record.status === "published" ? (
        <div className="sticky-cta admin-actions"><button className="btn-secondary" onClick={() => newModuleVersion(record.id)}>Create new draft version</button></div>
      ) : record && record.status === "archived" ? (
        <p className="admin-hint">Archived — superseded by a newer published version.</p>
      ) : null}
    </>
  );
}
