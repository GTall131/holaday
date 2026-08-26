export const FLAG_PATTERNS = {
  "vertical-tricolor": "Vertical tricolor",
  "horizontal-tricolor": "Horizontal tricolor",
  "circle-on-field": "Circle on field",
  "cross-on-field": "Cross on field"
};

// The named ladder of Legs a Trip Type Blueprint walks through (see
// store.js's "ADMIN — Trip Type Blueprint" section and the Blueprint
// TODO in data/tripTypes.js) — later Legs repeat the same core Modules
// at a harder Tier rather than introducing all-new topics, so the
// names read as a difficulty/confidence progression, not a plain
// "Leg 1, Leg 2" counter.
export const LEG_LADDER = ["Slightly Scared Tourist", "Confident Traveller", "Seasoned Explorer", "Honorary Local"];

export const ADMIN_STATUS_LABELS = {
  missing: "Missing", draft: "Draft", staged: "Staged", published: "Published", archived: "Archived"
};

export const ADMIN_STATUS_RANK = { missing:0, archived:0, draft:1, staged:2, published:3 };

// Per the iconography rationale in data/flags.js, flags are hand-built
// shapes from the destination's three colours, not an upload/photo
// picker — this is the "small in-app tool" called for in
// ADMIN-CONTENT-PLAN.md §2a step 2, applied to whichever colours the
// author has picked so far (see screens/admin/AdminDestinationDetail.jsx's
// live preview).
export function buildFlagSvg(pattern, colours){
  const p = colours.primary, s = colours.secondary, t = colours.tertiary;
  switch (pattern){
    case "horizontal-tricolor":
      return `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="${s}"/><rect width="30" height="6.67" fill="${p}"/><rect y="13.33" width="30" height="6.67" fill="${t}"/></svg>`;
    case "circle-on-field":
      return `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="${s}"/><circle cx="15" cy="10" r="6" fill="${p}"/><circle cx="15" cy="10" r="6" fill="none" stroke="${t}" stroke-width="1.2"/></svg>`;
    case "cross-on-field":
      return `<svg viewBox="0 0 30 20"><rect width="30" height="20" fill="${t}"/><rect x="12" width="6" height="20" fill="${s}"/><rect y="7" width="30" height="6" fill="${s}"/><rect x="13.2" width="3.6" height="20" fill="${p}"/><rect y="8.2" width="30" height="3.6" fill="${p}"/></svg>`;
    case "vertical-tricolor":
    default:
      return `<svg viewBox="0 0 30 20"><rect width="10" height="20" fill="${p}"/><rect x="10" width="10" height="20" fill="${s}"/><rect x="20" width="10" height="20" fill="${t}"/></svg>`;
  }
}
