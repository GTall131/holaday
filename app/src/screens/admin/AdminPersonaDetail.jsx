import ContentListRows from "../../components/ContentListRows";
import { state, primeAdminPersonaDraft, patchAdminPersonaDraft, saveAdminPersona, startPersonaGeneration, push } from "../../store";

export default function AdminPersonaDetail({ payload }){
  const id = payload && payload.id;
  const { record, view } = primeAdminPersonaDraft(id);
  if (!view) return <div className="admin-empty">Persona not found.</div>;

  const generatedModules = record ? state.adminModules.filter(m => m.data.generatedFromPersonaId === record.id) : [];
  const generatedLessons = record ? state.adminLessons.filter(l => l.data.generatedFromPersonaId === record.id) : [];
  const generatedPhrases = record ? state.adminPhrases.filter(p => p.data.generatedFromPersonaId === record.id) : [];
  const hasGeneratedContent = generatedModules.length || generatedLessons.length || generatedPhrases.length;

  return (
    <>
      <label className="field-label" htmlFor="persona-outline">Rough outline</label>
      <textarea
        className="notes"
        id="persona-outline"
        placeholder="e.g. a solo backpacker in their 20s, tight budget, wants to eat street food and avoid tourist traps..."
        value={view.data.outline}
        onChange={e => patchAdminPersonaDraft({ outline: e.target.value })}
      />

      {view.data.generated ? (
        <>
          <label className="field-label" htmlFor="persona-name" style={{ marginTop: "20px" }}>Name</label>
          <input className="text-input" id="persona-name" value={view.data.name}
            onChange={e => patchAdminPersonaDraft({ name: e.target.value })} />

          <label className="field-label" htmlFor="persona-summary">Summary</label>
          <textarea className="notes" id="persona-summary" value={view.data.summary}
            onChange={e => patchAdminPersonaDraft({ summary: e.target.value })} />

          <label className="field-label" htmlFor="persona-age">Age range</label>
          <input className="text-input" id="persona-age" value={view.data.ageRange}
            onChange={e => patchAdminPersonaDraft({ ageRange: e.target.value })} />

          <label className="field-label" htmlFor="persona-style">Travel style</label>
          <input className="text-input" id="persona-style" value={view.data.travelStyle}
            onChange={e => patchAdminPersonaDraft({ travelStyle: e.target.value })} />

          <label className="field-label" htmlFor="persona-motivations">Motivations</label>
          <input className="text-input" id="persona-motivations" value={view.data.motivations}
            onChange={e => patchAdminPersonaDraft({ motivations: e.target.value })} />

          <label className="field-label" htmlFor="persona-pain">Pain points</label>
          <input className="text-input" id="persona-pain" value={view.data.painPoints}
            onChange={e => patchAdminPersonaDraft({ painPoints: e.target.value })} />

          <label className="field-label" htmlFor="persona-vocab">Vocab focus (tags)</label>
          <input className="text-input" id="persona-vocab" value={view.data.vocabFocus}
            onChange={e => patchAdminPersonaDraft({ vocabFocus: e.target.value })} />

          <p className="admin-hint">Generated from your outline — this is a stub, not a live model call yet. Review and edit before generating lesson content.</p>
        </>
      ) : (
        <p className="admin-hint">Save this persona, then generate its full profile from the outline above.</p>
      )}

      <div className="sticky-cta admin-actions">
        <button className="btn-secondary" onClick={saveAdminPersona}>Save</button>
        {record ? (
          <button className="btn-primary" onClick={() => startPersonaGeneration(record.id)}>
            {view.data.generated ? "Regenerate persona details" : "Generate persona details"}
          </button>
        ) : null}
      </div>

      {record && view.data.generated ? (
        <>
          <label className="field-label" style={{ marginTop: "24px" }}>Generate lesson content</label>
          <p className="admin-hint" style={{ marginTop: 0 }}>Pick a country and trip type to generate a starter Module, Lesson, and Phrases for this persona.</p>
          <button className="btn-primary" onClick={() => push("admin-persona-generate-content", { personaId: record.id })}>Generate lesson content</button>
        </>
      ) : null}

      {hasGeneratedContent ? (
        <>
          <label className="field-label" style={{ marginTop: "24px" }}>Content generated from this persona</label>
          <ContentListRows modules={generatedModules} lessons={generatedLessons} phrases={generatedPhrases} />
        </>
      ) : null}
    </>
  );
}
