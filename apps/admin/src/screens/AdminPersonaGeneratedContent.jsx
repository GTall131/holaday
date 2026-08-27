import AdminListRow from "../components/AdminListRow";
import { state, moduleScopeLabel, openAdminModule, openAdminLesson, openAdminPhrase } from "../store";

/* ================================================================
   Shows what was generated for a Persona as an actual tree — Module
   at the top, its Lessons nested under it, and each Lesson's Phrases
   (resolved via that lesson's questions, the real FK relationship —
   see store.js's Question.phraseId) nested one level deeper still.
   Deliberately its own screen (not inline on AdminPersonaDetail) and
   its own layout (not the flat ContentListRows used elsewhere) — a
   generated bundle is exactly one Module -> N Lessons -> N Phrases, so
   the nesting itself is what makes "these are three different kinds
   of thing" obvious, rather than relying on a text label to say so.
   ================================================================ */
export default function AdminPersonaGeneratedContent({ payload }){
  const persona = state.adminPersonas.find(p => p.id === payload.personaId);
  if (!persona) return <div className="admin-empty">Persona not found.</div>;

  const modules = state.adminModules.filter(m => m.data.generatedFromPersonaId === persona.id);

  return (
    <>
      <p style={{ fontSize: "13px", color: "var(--slate)", margin: "6px 2px 20px" }}>
        Everything generated for <strong>{persona.data.name || "this persona"}</strong>.
      </p>

      {modules.length ? modules.map(mod => {
        const lessons = state.adminLessons.filter(l => l.data.moduleId === mod.id);
        return (
          <div key={mod.id} className="admin-hierarchy-group">
            <div className="admin-hierarchy-kicker">Module</div>
            <AdminListRow
              name={mod.data.name}
              sub={moduleScopeLabel(mod)}
              status={mod.status}
              onClick={() => openAdminModule(mod.id)}
            />

            {lessons.length ? (
              <div className="admin-hierarchy-nest">
                {lessons.map(lesson => {
                  const phraseIds = lesson.data.questions
                    .filter(q => q.source === "phrase" && q.phraseId)
                    .map(q => q.phraseId);
                  const phrases = state.adminPhrases.filter(p => phraseIds.includes(p.id));
                  return (
                    <div key={lesson.id} style={{ marginBottom: "14px" }}>
                      <div className="admin-hierarchy-kicker">Lesson · Tier {lesson.data.tier}</div>
                      <AdminListRow
                        name={lesson.data.title}
                        sub={`${lesson.data.questions.length} question${lesson.data.questions.length === 1 ? "" : "s"}`}
                        status={lesson.status}
                        onClick={() => openAdminLesson(lesson.id)}
                      />

                      {phrases.length ? (
                        <div className="admin-hierarchy-nest">
                          <div className="admin-hierarchy-kicker">Phrases used by this lesson</div>
                          {phrases.map(phrase => (
                            <AdminListRow
                              key={phrase.id}
                              name={phrase.data.en}
                              sub={phrase.data.local}
                              status={phrase.status}
                              onClick={() => openAdminPhrase(phrase.id)}
                            />
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      }) : <div className="admin-empty">Nothing generated for this persona yet.</div>}
    </>
  );
}
