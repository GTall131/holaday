import { resetToHome, stubTab } from "../store";

// Explore/Profile are disabled on purpose — out of scope for v1 (see
// App.jsx MVP SCOPE note); they're visible-but-disabled to signal
// planned surface area rather than removed entirely. No "Admin" tab
// here — content authoring is its own separate app (apps/admin).
export default function TabBar({ activeTab }){
  return (
    <div className="tabbar">
      <button className="tabbar__item" data-active={activeTab === "go-home"} onClick={resetToHome}><span>Trips</span></button>
      <button className="tabbar__item" disabled onClick={stubTab}><span>Explore</span></button>
      <button className="tabbar__item" disabled onClick={stubTab}><span>Profile</span></button>
    </div>
  );
}
