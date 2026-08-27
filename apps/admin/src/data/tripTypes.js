// Reference copy of apps/traveler/src/data/tripTypes.js — mirrored in
// the trip_types table in both Supabase projects (see supabase/*/
// migrations). Used here for labels in Blueprint/Persona dropdowns and
// the AppBar title.
export const TRIP_TYPES = {
  city:      { label:"City Break",          weeks:6, lesson2:"Getting Around Like a Local" },
  beach:     { label:"Beach Escape",         weeks:6, lesson2:"Beach, Bargaining & Small Talk" },
  food:      { label:"Food & Wine",          weeks:7, lesson2:"At the Table: Ordering & Toasting" },
  family:    { label:"Family Trip",          weeks:7, lesson2:"Everyday Essentials for Everyone" },
  adventure: { label:"Adventure & Outdoors", weeks:8, lesson2:"On the Trail: Asking for Help" },
  business:  { label:"Business Trip",        weeks:6, lesson2:"Politeness & Small Talk for Meetings" }
};
