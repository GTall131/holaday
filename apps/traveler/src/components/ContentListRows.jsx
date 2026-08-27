import AdminListRow from "./AdminListRow";
import { moduleScopeLabel, lessonScopeLabel, phraseScopeLabel, openAdminModule, openAdminLesson, openAdminPhrase } from "../store";

// Shared by the Country and Language detail screens, and the
// Destinations/Languages pane's Modules/Lessons/Phrases tabs — rows
// for whatever's relevant, using the same scope-label vocabulary so
// "why is this listed here" reads the same way everywhere.
export default function ContentListRows({ modules = [], lessons = [], phrases = [] }){
  if (!modules.length && !lessons.length && !phrases.length){
    return <div className="admin-empty">No modules, lessons, or phrases here yet.</div>;
  }
  return (
    <>
      {modules.map(m => (
        <AdminListRow
          key={m.id}
          name={m.data.name}
          sub={`Module · ${moduleScopeLabel(m)}`}
          status={m.status}
          onClick={() => openAdminModule(m.id)}
        />
      ))}
      {lessons.map(l => (
        <AdminListRow
          key={l.id}
          name={l.data.title}
          sub={`Lesson · ${lessonScopeLabel(l)}`}
          status={l.status}
          onClick={() => openAdminLesson(l.id)}
        />
      ))}
      {phrases.map(p => (
        <AdminListRow
          key={p.id}
          name={p.data.en}
          sub={`Phrase · ${phraseScopeLabel(p)}`}
          status={p.status}
          onClick={() => openAdminPhrase(p.id)}
        />
      ))}
    </>
  );
}
