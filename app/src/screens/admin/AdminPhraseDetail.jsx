import AdminStatusChip from "../../components/AdminStatusChip";
import VocabCard from "../../components/VocabCard";
import {
  state, primeAdminPhraseDraft, patchAdminPhraseDraft, phraseScopeLabel, activeCountriesForLanguage,
  saveDraftPhrase, stagePhrase, unstagePhrase, publishPhrase, newPhraseVersion
} from "../../store";

export default function AdminPhraseDetail({ payload }){
  const id = payload && payload.id;
  const { record, canEdit, view } = primeAdminPhraseDraft(id);
  if (!view) return <div className="admin-empty">Phrase not found.</div>;

  const phraseLangCountries = view.data.languageId ? activeCountriesForLanguage(view.data.languageId) : [];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 2px 4px" }}>
        <span style={{ fontSize: "12px", color: "var(--slate)", fontFamily: "var(--font-mono)" }}>{record ? `v${record.version}` : "New phrase"}</span>
        <AdminStatusChip status={view.status} />
      </div>

      {canEdit ? (
        <>
          <label className="field-label" htmlFor="admin-phrase-en">English</label>
          <input className="text-input" id="admin-phrase-en" value={view.data.en} placeholder="e.g. Hello"
            onChange={e => patchAdminPhraseDraft({ en: e.target.value })} />

          <label className="field-label" htmlFor="admin-phrase-local">Local phrase</label>
          <input className="text-input" id="admin-phrase-local" value={view.data.local} placeholder="e.g. Konnichiwa"
            onChange={e => patchAdminPhraseDraft({ local: e.target.value })} />

          <label className="field-label" htmlFor="admin-phrase-translit">Transliteration</label>
          <input className="text-input" id="admin-phrase-translit" value={view.data.translit} placeholder="e.g. こんにちは"
            onChange={e => patchAdminPhraseDraft({ translit: e.target.value })} />

          <label className="field-label" htmlFor="admin-phrase-tags">Tags (comma-separated)</label>
          <input className="text-input" id="admin-phrase-tags" value={view.data.tags} placeholder="greeting, essentials"
            onChange={e => patchAdminPhraseDraft({ tags: e.target.value })} />

          <label className="field-label" htmlFor="admin-phrase-language">Language</label>
          <select className="admin-select" id="admin-phrase-language" value={view.data.languageId || ""}
            onChange={e => patchAdminPhraseDraft({ languageId: e.target.value || null })}>
            <option value="">— pick a language —</option>
            {state.adminLanguages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>

          <label className="admin-checkbox-row" htmlFor="admin-phrase-languagewide">
            <input type="checkbox" id="admin-phrase-languagewide" checked={view.data.languageWide}
              onChange={e => patchAdminPhraseDraft({ languageWide: e.target.checked, countryKey: null })} />
            This phrase applies to all countries using this language
          </label>

          {!view.data.languageWide ? (
            <>
              <label className="field-label" htmlFor="admin-phrase-country">Country</label>
              <select className="admin-select" id="admin-phrase-country" value={view.data.countryKey || ""}
                onChange={e => patchAdminPhraseDraft({ countryKey: e.target.value || null })}>
                <option value="">— pick a country —</option>
                {phraseLangCountries.map(d => <option key={d.countryKey} value={d.countryKey}>{d.data.name}</option>)}
              </select>
              {!phraseLangCountries.length ? <p className="admin-hint">{view.data.languageId ? "No countries use this language yet." : "Pick a language first."}</p> : null}
            </>
          ) : null}
        </>
      ) : (
        <>
          <div style={{ fontWeight: 800, fontSize: "19px", marginTop: "14px" }}>{view.data.en}</div>
          <div style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "10px" }}>{phraseScopeLabel(view)}</div>
        </>
      )}

      <div className="admin-preview">
        <div className="admin-preview__label">Live preview</div>
        <div className="vocab-grid"><VocabCard phrase={view.data} /></div>
      </div>

      {canEdit ? (
        <div className="sticky-cta admin-actions">
          <button className="btn-secondary" onClick={saveDraftPhrase}>Save Draft</button>
          <button className="btn-primary" onClick={stagePhrase}>Stage</button>
        </div>
      ) : record && record.status === "staged" ? (
        <div className="sticky-cta admin-actions">
          <button className="btn-secondary" onClick={() => unstagePhrase(record.id)}>Back to Draft</button>
          <button className="btn-primary" onClick={() => publishPhrase(record.id)}>Publish</button>
        </div>
      ) : record && record.status === "published" ? (
        <div className="sticky-cta admin-actions"><button className="btn-secondary" onClick={() => newPhraseVersion(record.id)}>Create new draft version</button></div>
      ) : record && record.status === "archived" ? (
        <p className="admin-hint">Archived — superseded by a newer published version.</p>
      ) : null}
    </>
  );
}
