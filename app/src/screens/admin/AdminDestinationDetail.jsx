import FlagIcon from "../../components/FlagIcon";
import AdminStatusChip from "../../components/AdminStatusChip";
import ContentListRows from "../../components/ContentListRows";
import { FLAG_PATTERNS, buildFlagSvg } from "../../data/admin";
import {
  state, primeAdminDestinationDraft, patchAdminDraft, adminFlagMarkup, languageName,
  saveDraftDestination, stageDestination, unstageDestination, publishDestination, newDestinationVersion,
  newAdminModuleForCountry, newAdminPhraseForCountry,
  moduleAppliesToCountry, lessonAppliesToCountry, phraseAppliesToCountry
} from "../../store";

export default function AdminDestinationDetail({ payload }){
  const id = payload && payload.id;
  const { record, canEdit, view } = primeAdminDestinationDraft(id);
  if (!view) return <div className="admin-empty">Destination not found.</div>;

  const flagSvg = canEdit ? buildFlagSvg(view.data.flagPattern || "vertical-tricolor", view.data.colours) : adminFlagMarkup(view);

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 2px 4px" }}>
        <span style={{ fontSize: "12px", color: "var(--slate)", fontFamily: "var(--font-mono)" }}>{record ? `v${record.version}` : "New destination"}</span>
        <AdminStatusChip status={view.status} />
      </div>

      {canEdit ? (
        <>
          <label className="field-label" htmlFor="admin-dest-name">Destination name</label>
          <input className="text-input" id="admin-dest-name" value={view.data.name} placeholder="e.g. Portugal"
            onChange={e => patchAdminDraft({ name: e.target.value })} />

          <label className="field-label" htmlFor="admin-dest-capital">Capital</label>
          <input className="text-input" id="admin-dest-capital" value={view.data.capital} placeholder="e.g. Lisbon"
            onChange={e => patchAdminDraft({ capital: e.target.value })} />

          <label className="field-label" htmlFor="admin-dest-language">Language</label>
          <select className="admin-select" id="admin-dest-language" value={view.data.languageId || ""}
            onChange={e => patchAdminDraft({ languageId: e.target.value || null })}>
            <option value="">— pick a language —</option>
            {state.adminLanguages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            <option value="__new__">+ Add a new language</option>
          </select>
          {view.data.languageId === "__new__" ? (
            <input className="text-input" id="admin-dest-language-new" style={{ marginTop: "8px" }}
              value={view.data.newLanguageName || ""} placeholder="e.g. Portuguese" autoFocus
              onChange={e => patchAdminDraft({ newLanguageName: e.target.value })} />
          ) : null}

          <label className="field-label">Flag colours</label>
          <div className="admin-form-grid">
            <div className="admin-colour-field">
              <label htmlFor="admin-dest-primary">Primary</label>
              <input type="color" id="admin-dest-primary" value={view.data.colours.primary}
                onChange={e => patchAdminDraft({ colours: { ...view.data.colours, primary: e.target.value } })} />
            </div>
            <div className="admin-colour-field">
              <label htmlFor="admin-dest-secondary">Secondary</label>
              <input type="color" id="admin-dest-secondary" value={view.data.colours.secondary}
                onChange={e => patchAdminDraft({ colours: { ...view.data.colours, secondary: e.target.value } })} />
            </div>
            <div className="admin-colour-field">
              <label htmlFor="admin-dest-tertiary">Tertiary</label>
              <input type="color" id="admin-dest-tertiary" value={view.data.colours.tertiary}
                onChange={e => patchAdminDraft({ colours: { ...view.data.colours, tertiary: e.target.value } })} />
            </div>
          </div>

          <label className="field-label" htmlFor="admin-dest-pattern">Flag pattern</label>
          <select className="admin-select" id="admin-dest-pattern" value={view.data.flagPattern || "vertical-tricolor"}
            onChange={e => patchAdminDraft({ flagPattern: e.target.value })}>
            {Object.entries(FLAG_PATTERNS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
          </select>

          <label className="field-label" htmlFor="admin-dest-culturetip">"Know before you go" culture tip</label>
          <textarea className="notes" id="admin-dest-culturetip"
            placeholder="One or two sentences travelers see on the dashboard's culture card..."
            value={view.data.cultureTip}
            onChange={e => patchAdminDraft({ cultureTip: e.target.value })} />
        </>
      ) : (
        <>
          <div style={{ fontWeight: 800, fontSize: "19px", marginTop: "14px" }}>{view.data.name}</div>
          <div style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "16px" }}>{view.data.capital} · {languageName(view.data.languageId)}</div>
          <label className="field-label">"Know before you go" culture tip</label>
          <p style={{ fontSize: "13.5px", lineHeight: 1.5 }}>{view.data.cultureTip || "—"}</p>
        </>
      )}

      <div className="admin-preview">
        <div className="admin-preview__label">Live preview</div>
        <button className="country-card" style={{ pointerEvents: "none" }} tabIndex={-1}>
          <FlagIcon markup={flagSvg} className="country-card__flag" />
          <span className="country-card__body">
            <div className="country-card__name">{view.data.name || "Untitled destination"}</div>
            <div className="country-card__capital">{view.data.capital || "—"}</div>
          </span>
        </button>
        <div className="ticket" style={{ ["--flag-primary"]: view.data.colours.primary, ["--flag-secondary"]: view.data.colours.secondary, ["--flag-tertiary"]: view.data.colours.tertiary }}>
          <div className="ticket__stripe">
            <span style={{ background: view.data.colours.primary }}></span>
            <span style={{ background: view.data.colours.secondary }}></span>
            <span style={{ background: view.data.colours.tertiary }}></span>
          </div>
          <div className="ticket__eyebrow">Dashboard theme preview</div>
          <div className="ticket__title"><FlagIcon markup={flagSvg} className="ticket__flag" /><span>{view.data.name || "Untitled destination"}</span></div>
        </div>
        <div className="culture-card">
          <div className="culture-card__label">Know before you go</div>
          <div className="culture-card__body">{view.data.cultureTip || "No culture tip written yet."}</div>
        </div>
      </div>

      {record ? (
        <>
          <label className="field-label" style={{ marginTop: "24px" }}>Modules &amp; lessons for {view.data.name}</label>
          <div className="admin-actions" style={{ margin: "0 0 10px" }}>
            <button className="btn-secondary" onClick={() => newAdminModuleForCountry(record.countryKey)}>+ New module</button>
          </div>
          <ContentListRows
            modules={state.adminModules.filter(m => moduleAppliesToCountry(m, record.countryKey))}
            lessons={state.adminLessons.filter(l => lessonAppliesToCountry(l, record.countryKey))}
          />

          <label className="field-label" style={{ marginTop: "24px" }}>Phrases for {view.data.name}</label>
          <div className="admin-actions" style={{ margin: "0 0 10px" }}>
            <button className="btn-secondary" onClick={() => newAdminPhraseForCountry(record.countryKey)}>+ New phrase</button>
          </div>
          <ContentListRows phrases={state.adminPhrases.filter(p => phraseAppliesToCountry(p, record.countryKey))} />
        </>
      ) : null}

      {canEdit ? (
        <div className="sticky-cta admin-actions">
          <button className="btn-secondary" onClick={saveDraftDestination}>Save Draft</button>
          <button className="btn-primary" onClick={stageDestination}>Stage</button>
        </div>
      ) : record && record.status === "staged" ? (
        <div className="sticky-cta admin-actions">
          <button className="btn-secondary" onClick={() => unstageDestination(record.id)}>Back to Draft</button>
          <button className="btn-primary" onClick={() => publishDestination(record.id)}>Publish</button>
        </div>
      ) : record && record.status === "published" ? (
        <div className="sticky-cta admin-actions"><button className="btn-secondary" onClick={() => newDestinationVersion(record.id)}>Create new draft version</button></div>
      ) : record && record.status === "archived" ? (
        <p className="admin-hint">Archived — superseded by a newer published version.</p>
      ) : null}
    </>
  );
}
