import AdminPaneTabBar from "../../components/AdminPaneTabBar";
import AdminListRow from "../../components/AdminListRow";
import ContentListRows from "../../components/ContentListRows";
import FilterSelect from "../../components/FilterSelect";
import { state, setAdminLanguagesTab, setAdminLanguagesFilterLanguage, newAdminLanguage, openAdminLanguage } from "../../store";

// Language is deliberately reference taxonomy, not staged/published
// content like Country/Module/Lesson/Blueprint (see store.js's
// ensureLanguage) — a Language is something a Country points at, not
// itself authored/reviewed content per §6. Modules and Lessons nest
// here as filterable tabs too (filter by language) — the Destinations-
// pane and Languages-pane Modules/Lessons tabs (AdminDestinations.jsx)
// are two different filtered views over the same underlying lists,
// not two separate sets of content. No Blueprints tab here — see the
// note on AdminDestinations.jsx's TABS.
const TABS = [
  { key: "languages", label: "Languages" },
  { key: "modules", label: "Modules" },
  { key: "lessons", label: "Lessons" },
  { key: "phrases", label: "Phrases" }
];

function languageFilterOptions(){
  return state.adminLanguages.slice().sort((a, b) => a.name.localeCompare(b.name)).map(l => ({ value: l.id, label: l.name }));
}

export default function AdminLanguages(){
  const tab = state.adminLanguagesTab;
  const filter = state.adminLanguagesFilterLanguage;

  let body;
  if (tab === "modules"){
    // Only bespoke Modules/Lessons that name a Language belong here —
    // a Generic one (no Country or Language tie) isn't "under" any
    // Language, so it's filtered out of this pane entirely rather
    // than shown under every Language, unlike the Destinations pane
    // where Generic content legitimately applies to every Country.
    let mods = state.adminModules.filter(m => m.data.kind === "bespoke" && m.data.languageId);
    if (filter) mods = mods.filter(m => m.data.languageId === filter);
    body = (
      <>
        <FilterSelect id="admin-lang-pane-filter" label="Filter by language" value={filter} onChange={setAdminLanguagesFilterLanguage} options={languageFilterOptions()} allLabel="All languages" />
        <ContentListRows modules={mods} />
      </>
    );
  } else if (tab === "lessons"){
    let lessons = state.adminLessons.filter(l => l.data.scope === "country-specific" && l.data.languageId);
    if (filter) lessons = lessons.filter(l => l.data.languageId === filter);
    body = (
      <>
        <FilterSelect id="admin-lang-pane-filter" label="Filter by language" value={filter} onChange={setAdminLanguagesFilterLanguage} options={languageFilterOptions()} allLabel="All languages" />
        <ContentListRows lessons={lessons} />
      </>
    );
  } else if (tab === "phrases"){
    let phrases = state.adminPhrases;
    if (filter) phrases = phrases.filter(p => p.data.languageId === filter);
    body = (
      <>
        <FilterSelect id="admin-lang-pane-filter" label="Filter by language" value={filter} onChange={setAdminLanguagesFilterLanguage} options={languageFilterOptions()} allLabel="All languages" />
        <ContentListRows phrases={phrases} />
      </>
    );
  } else {
    const rows = state.adminLanguages.slice().sort((a, b) => a.name.localeCompare(b.name));
    body = (
      <>
        <button className="btn-primary" style={{ margin: "16px 0 18px" }} onClick={newAdminLanguage}>+ New language</button>
        {rows.length ? rows.map(l => {
          const countryCount = state.adminDestinations.filter(d => d.data.languageId === l.id && d.status !== "archived").length;
          return (
            <AdminListRow
              key={l.id}
              name={l.name}
              sub={`${countryCount} countr${countryCount === 1 ? "y" : "ies"}`}
              onClick={() => openAdminLanguage(l.id)}
            />
          );
        }) : <div className="admin-empty">No languages yet.</div>}
      </>
    );
  }

  return (
    <>
      <AdminPaneTabBar tabs={TABS} activeTab={tab} onTab={setAdminLanguagesTab} />
      {body}
    </>
  );
}
