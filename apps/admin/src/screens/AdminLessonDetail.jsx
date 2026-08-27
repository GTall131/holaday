import AdminStatusChip from "../components/AdminStatusChip";
import BeatCard from "../components/BeatCard";
import QuestionCard from "../components/QuestionCard";
import {
  state, primeAdminLessonDraft, patchAdminLessonDraft, lessonScopeLabel, activeCountriesForLanguage,
  phrasesForLesson, adminQuestionToBeat, addLessonQuestion, stepLessonPreview,
  saveDraftLesson, stageLesson, unstageLesson, publishLesson, newLessonVersion
} from "../store";
import { SYMBOLS } from "../data/flags";

export default function AdminLessonDetail({ payload }){
  const id = payload && payload.id;
  const { record, canEdit, view } = primeAdminLessonDraft(id);
  if (!view) return <div className="admin-empty">Lesson not found.</div>;

  const lessonLangCountries = view.data.languageId ? activeCountriesForLanguage(view.data.languageId) : [];
  const questions = view.data.questions;
  const phrases = phrasesForLesson(view.data);
  const previewIndex = state.adminLessonPreviewIndex;
  const previewQ = questions[previewIndex];
  const previewBeat = previewQ ? adminQuestionToBeat(previewQ, view.data) : null;

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "6px 2px 4px" }}>
        <span style={{ fontSize: "12px", color: "var(--slate)", fontFamily: "var(--font-mono)" }}>{record ? `v${record.version}` : "New lesson"}</span>
        <AdminStatusChip status={view.status} />
      </div>

      {canEdit ? (
        <>
          <label className="field-label" htmlFor="admin-lesson-title">Lesson title</label>
          <input className="text-input" id="admin-lesson-title" value={view.data.title} placeholder="e.g. Ordering at a Restaurant"
            onChange={e => patchAdminLessonDraft({ title: e.target.value })} />

          <label className="field-label" htmlFor="admin-lesson-type">Type</label>
          <select className="admin-select" id="admin-lesson-type" value={view.data.type} onChange={e => patchAdminLessonDraft({ type: e.target.value })}>
            <option value="Phrase">Phrase</option>
            <option value="Culture">Culture</option>
          </select>

          {/* Known gap: the Module and Scope selects below are independently
              editable with no cross-validation, so a Lesson can still be
              hand-edited into a Module/Scope combination that no longer
              matches any grid cell in that Module (store.js's
              moduleLessonCandidates filters generic-Module cells to
              scope:"generic" lessons and bespoke-Module cells to
              lessonMatchesGridCountry matches only). Pre-existing, orthogonal
              to lesson creation now being Module-only — not fixed here. */}
          <label className="field-label" htmlFor="admin-lesson-module">Module</label>
          <select className="admin-select" id="admin-lesson-module" value={view.data.moduleId || ""} onChange={e => patchAdminLessonDraft({ moduleId: e.target.value || null })}>
            <option value="">— pick a module —</option>
            {state.adminModules.map(m => <option key={m.id} value={m.id}>{m.data.name}</option>)}
          </select>

          <label className="field-label" htmlFor="admin-lesson-tier">Tier</label>
          <input className="text-input" type="number" min="1" id="admin-lesson-tier" value={view.data.tier}
            onChange={e => patchAdminLessonDraft({ tier: Math.max(1, Number(e.target.value) || 1) })} />

          <label className="field-label" htmlFor="admin-lesson-scope">Scope</label>
          <select className="admin-select" id="admin-lesson-scope" value={view.data.scope}
            onChange={e => patchAdminLessonDraft({ scope: e.target.value })}>
            <option value="generic">Generic — reusable across countries</option>
            <option value="country-specific">Country-specific</option>
          </select>

          {view.data.scope === "country-specific" ? (
            <>
              <label className="field-label" htmlFor="admin-lesson-language">Language</label>
              <select className="admin-select" id="admin-lesson-language" value={view.data.languageId || ""}
                onChange={e => patchAdminLessonDraft({ languageId: e.target.value || null, countryKey: null })}>
                <option value="">— pick a language —</option>
                {state.adminLanguages.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>

              <label className="admin-checkbox-row" htmlFor="admin-lesson-languagewide">
                <input type="checkbox" id="admin-lesson-languagewide" checked={view.data.languageWide}
                  onChange={e => patchAdminLessonDraft({ languageWide: e.target.checked, countryKey: null })} />
                This content applies to all countries using this language
              </label>

              {!view.data.languageWide ? (
                <>
                  <label className="field-label" htmlFor="admin-lesson-country">Country</label>
                  <select className="admin-select" id="admin-lesson-country" value={view.data.countryKey || ""}
                    onChange={e => patchAdminLessonDraft({ countryKey: e.target.value || null })}>
                    <option value="">— pick a country —</option>
                    {lessonLangCountries.map(d => <option key={d.countryKey} value={d.countryKey}>{d.data.name}</option>)}
                  </select>
                  {!lessonLangCountries.length ? <p className="admin-hint">{view.data.languageId ? "No countries use this language yet." : "Pick a language first."}</p> : null}
                </>
              ) : null}
            </>
          ) : null}

          <label className="field-label" style={{ marginTop: "24px" }}>Questions ({questions.length}{questions.length < 5 ? " — needs 5+ to stage" : ""})</label>
          {questions.map((q, i) => <QuestionCard key={i} q={q} i={i} lessonData={view.data} phrases={phrases} />)}
          <button type="button" className="btn-secondary" onClick={() => addLessonQuestion(Object.keys(SYMBOLS))}>+ Add question</button>
        </>
      ) : (
        <>
          <div style={{ fontWeight: 800, fontSize: "19px", marginTop: "14px" }}>{view.data.title}</div>
          <div style={{ fontSize: "13px", color: "var(--slate)", marginBottom: "10px" }}>{view.data.type} · {lessonScopeLabel(view)} · Tier {view.data.tier} · {questions.length} questions</div>
        </>
      )}

      <div className="admin-preview">
        <div className="admin-preview__label">Live preview — reuses the real traveler beat renderer, and the option buttons below actually work</div>
        {previewQ ? (
          <>
            {previewBeat ? <BeatCard key={previewIndex} beat={previewBeat} /> : <div className="admin-empty">Pick a published phrase above to preview this question.</div>}
            <div className="admin-actions" style={{ marginTop: "10px" }}>
              <button className="btn-secondary" disabled={previewIndex === 0} onClick={() => stepLessonPreview(-1)}>Prev</button>
              <button className="btn-secondary" disabled={previewIndex >= questions.length - 1} onClick={() => stepLessonPreview(1)}>Next</button>
            </div>
            <div style={{ fontSize: "11.5px", color: "var(--slate)", textAlign: "center", marginTop: "6px" }}>Question {previewIndex + 1} of {questions.length}</div>
          </>
        ) : <div className="admin-empty">Add a question to preview it.</div>}
      </div>

      {canEdit ? (
        <div className="sticky-cta admin-actions">
          <button className="btn-secondary" onClick={saveDraftLesson}>Save Draft</button>
          <button className="btn-primary" onClick={stageLesson}>Stage</button>
        </div>
      ) : record && record.status === "staged" ? (
        <div className="sticky-cta admin-actions">
          <button className="btn-secondary" onClick={() => unstageLesson(record.id)}>Back to Draft</button>
          <button className="btn-primary" onClick={() => publishLesson(record.id)}>Publish</button>
        </div>
      ) : record && record.status === "published" ? (
        <div className="sticky-cta admin-actions"><button className="btn-secondary" onClick={() => newLessonVersion(record.id)}>Create new draft version</button></div>
      ) : record && record.status === "archived" ? (
        <p className="admin-hint">Archived — superseded by a newer published version.</p>
      ) : null}
    </>
  );
}
