import AdminPaneTabBar from "../../components/AdminPaneTabBar";
import AdminListRow from "../../components/AdminListRow";
import ContentListRows from "../../components/ContentListRows";
import FilterSelect from "../../components/FilterSelect";
import {
  state, adminFlagMarkup, languageName, setAdminDestinationsTab, setAdminDestinationsFilterCountry,
  newAdminDestination, openAdminDestination, openAdminBlueprints, newAdminModule, newAdminPhrase,
  moduleAppliesToCountry, lessonAppliesToCountry, phraseAppliesToCountry
} from "../../store";

// Destinations pane: Countries is the primary tab, with Modules/
// Lessons nested here as filterable tabs (filter by country) rather
// than their own admin-home entries, and Blueprints reachable here
// too — but only here, never under Languages (AdminLanguages.jsx),
// because a Blueprint resolves per-country, never per-language.
const TABS = [
  { key: "countries", label: "Countries" },
  { key: "modules", label: "Modules" },
  { key: "lessons", label: "Lessons" },
  { key: "phrases", label: "Phrases" },
  { label: "Blueprints", onNav: openAdminBlueprints }
];

function countryFilterOptions(){
  return state.adminDestinations
    .slice()
    .sort((a, b) => a.data.name.localeCompare(b.data.name))
    .map(d => ({ value: d.countryKey, label: d.data.name }));
}

export default function AdminDestinations(){
  const tab = state.adminDestinationsTab;
  const filter = state.adminDestinationsFilterCountry;

  let body;
  if (tab === "modules"){
    const mods = filter ? state.adminModules.filter(m => moduleAppliesToCountry(m, filter)) : state.adminModules;
    body = (
      <>
        <button className="btn-primary" style={{ margin: "16px 0 0" }} onClick={newAdminModule}>+ New module</button>
        <FilterSelect id="admin-dest-pane-filter" label="Filter by country" value={filter} onChange={setAdminDestinationsFilterCountry} options={countryFilterOptions()} allLabel="All countries" />
        <ContentListRows modules={mods} />
      </>
    );
  } else if (tab === "lessons"){
    // Lessons are only created from inside a Module's tier grid (§4,
    // see AdminModuleDetail.jsx) — this tab is browse/filter only, no
    // "+ New lesson" here.
    const lessons = filter ? state.adminLessons.filter(l => lessonAppliesToCountry(l, filter)) : state.adminLessons;
    body = (
      <>
        <FilterSelect id="admin-dest-pane-filter" label="Filter by country" value={filter} onChange={setAdminDestinationsFilterCountry} options={countryFilterOptions()} allLabel="All countries" />
        <ContentListRows lessons={lessons} />
      </>
    );
  } else if (tab === "phrases"){
    const phrases = filter ? state.adminPhrases.filter(p => phraseAppliesToCountry(p, filter)) : state.adminPhrases;
    body = (
      <>
        <button className="btn-primary" style={{ margin: "16px 0 0" }} onClick={newAdminPhrase}>+ New phrase</button>
        <FilterSelect id="admin-dest-pane-filter" label="Filter by country" value={filter} onChange={setAdminDestinationsFilterCountry} options={countryFilterOptions()} allLabel="All countries" />
        <ContentListRows phrases={phrases} />
      </>
    );
  } else {
    const rows = state.adminDestinations.slice().sort((a, b) => a.data.name.localeCompare(b.data.name));
    body = (
      <>
        <button className="btn-primary" style={{ margin: "16px 0 18px" }} onClick={newAdminDestination}>+ New destination</button>
        {rows.length ? rows.map(d => (
          <AdminListRow
            key={d.id}
            flagMarkup={adminFlagMarkup(d)}
            name={d.data.name + (d.legacy ? " (legacy)" : "")}
            sub={`${d.data.capital} · ${languageName(d.data.languageId)} · v${d.version}`}
            status={d.status}
            onClick={() => openAdminDestination(d.id)}
          />
        )) : <div className="admin-empty">No destinations yet.</div>}
      </>
    );
  }

  return (
    <>
      <AdminPaneTabBar tabs={TABS} activeTab={tab} onTab={setAdminDestinationsTab} />
      {body}
    </>
  );
}
