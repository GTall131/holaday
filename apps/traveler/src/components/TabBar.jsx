import { resetToHome, goAdmin, stubTab } from "../store";

// Explore/Profile are disabled on purpose — out of scope for v1 (see
// App.jsx MVP SCOPE note); they're visible-but-disabled to signal
// planned surface area rather than removed entirely.
//
// Admin entry point: the "Admin" tab
// drops into the admin stack (screens/admin/*), rendered full-width —
// see .app-shell.is-admin in index.css and App.jsx's flagStyle/is-admin
// toggling. STILL NOT the intended end state: this is demo-phase
// scaffolding for validating the flows. The real admin surface should
// be its own separate app, optimised for desktop/laptop, not a mode
// bolted onto this mobile traveler app or shipped in the same bundle.
export default function TabBar({ activeTab }){
  return (
    <div className="tabbar">
      <button className="tabbar__item" data-active={activeTab === "go-home"} onClick={resetToHome}><span>Trips</span></button>
      <button className="tabbar__item" disabled onClick={stubTab}><span>Explore</span></button>
      <button className="tabbar__item" disabled onClick={stubTab}><span>Profile</span></button>
      <button className="tabbar__item" data-active={activeTab === "go-admin"} onClick={goAdmin}><span>Admin</span></button>
    </div>
  );
}
