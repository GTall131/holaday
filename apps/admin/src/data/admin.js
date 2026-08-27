export const FLAG_PATTERNS = {
  "vertical-tricolor": "Vertical tricolor",
  "horizontal-tricolor": "Horizontal tricolor",
  "circle-on-field": "Circle on field",
  "cross-on-field": "Cross on field"
};

// The named ladder of Legs a Trip Type Blueprint walks through (see
// store.js's Blueprint section) — later Legs repeat the same core
// Modules at a harder Tier rather than introducing all-new topics, so
// the names read as a difficulty/confidence progression, not a plain
// "Leg 1, Leg 2" counter.
export const LEG_LADDER = ["Slightly Scared Tourist", "Confident Traveller", "Seasoned Explorer", "Honorary Local"];

export const ADMIN_STATUS_LABELS = {
  missing: "Missing", draft: "Draft", staged: "Staged", published: "Published", archived: "Archived"
};

export const ADMIN_STATUS_RANK = { missing:0, archived:0, draft:1, staged:2, published:3 };
