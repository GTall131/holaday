// Shared by the Destinations and Languages admin panes: a row of tabs
// where most entries switch a local sub-tab, but some (Blueprints) are
// really navigation to a different screen (`onNav` instead of `onTab`).
export default function AdminPaneTabBar({ tabs, activeTab, onTab }){
  return (
    <div className="admin-tab-bar">
      {tabs.map(t => t.onNav ? (
        <button key={t.label} onClick={t.onNav}>{t.label}</button>
      ) : (
        <button key={t.key} data-active={activeTab === t.key} onClick={() => onTab(t.key)}>{t.label}</button>
      ))}
    </div>
  );
}
