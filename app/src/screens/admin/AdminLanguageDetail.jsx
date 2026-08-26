import AdminListRow from "../../components/AdminListRow";
import ContentListRows from "../../components/ContentListRows";
import {
  state, primeAdminLanguageDraft, patchAdminLanguageDraft, saveAdminLanguage,
  openAdminDestination, newAdminModuleForLanguage, newAdminPhraseForLanguage, adminFlagMarkup
} from "../../store";

export default function AdminLanguageDetail({ payload }){
  const id = payload && payload.id;
  const { record, canEdit, view } = primeAdminLanguageDraft(id);
  if (!view) return <div className="admin-empty">Language not found.</div>;

  return (
    <>
      {canEdit ? (
        <>
          <label className="field-label" htmlFor="admin-language-name">Language name</label>
          <input
            className="text-input"
            id="admin-language-name"
            value={view.name}
            placeholder="e.g. Portuguese"
            onChange={e => patchAdminLanguageDraft({ name: e.target.value })}
          />
        </>
      ) : (
        <div style={{ fontWeight: 800, fontSize: "19px", marginTop: "14px", marginBottom: "16px" }}>{view.name}</div>
      )}

      {record ? (
        <>
          <label className="field-label" style={{ marginTop: "24px" }}>Countries using {record.name}</label>
          {(() => {
            const countries = state.adminDestinations.filter(d => d.data.languageId === record.id && d.status !== "archived");
            return countries.length
              ? countries.map(d => (
                  <AdminListRow
                    key={d.id}
                    flagMarkup={adminFlagMarkup(d)}
                    name={d.data.name}
                    status={d.status}
                    onClick={() => openAdminDestination(d.id)}
                  />
                ))
              : <div className="admin-empty">No countries use this language yet.</div>;
          })()}

          <label className="field-label" style={{ marginTop: "24px" }}>Modules &amp; lessons tied to {record.name}</label>
          <div className="admin-actions" style={{ margin: "0 0 10px" }}>
            <button className="btn-secondary" onClick={() => newAdminModuleForLanguage(record.id)}>+ New module</button>
          </div>
          <ContentListRows
            modules={state.adminModules.filter(m => m.data.kind === "bespoke" && m.data.languageId === record.id)}
            lessons={state.adminLessons.filter(l => l.data.scope === "country-specific" && l.data.languageId === record.id)}
          />

          <label className="field-label" style={{ marginTop: "24px" }}>Phrases tied to {record.name}</label>
          <div className="admin-actions" style={{ margin: "0 0 10px" }}>
            <button className="btn-secondary" onClick={() => newAdminPhraseForLanguage(record.id)}>+ New phrase</button>
          </div>
          <ContentListRows phrases={state.adminPhrases.filter(p => p.data.languageWide && p.data.languageId === record.id)} />
        </>
      ) : null}

      {canEdit ? (
        <div className="sticky-cta admin-actions"><button className="btn-primary" onClick={saveAdminLanguage}>Save</button></div>
      ) : null}
    </>
  );
}
