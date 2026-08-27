// Trip type drives lesson-2's framing and the course's total duration —
// more situationally complex trip types get an extra week or two.
// Mirrored in supabase/*/migrations' `trip_types` seed (label/weeks/
// lesson2) for the finalize-course Edge Function's fallback syllabus —
// this client-side copy is for display (labels, the country picker's
// trip-type list) rather than resolution, which now happens server-side
// (see store.js finalizeCourse and packages/shared/content-engine).
export const TRIP_TYPES = {
  city:      { label:"City Break",          weeks:6, lesson2:"Getting Around Like a Local" },
  beach:     { label:"Beach Escape",         weeks:6, lesson2:"Beach, Bargaining & Small Talk" },
  food:      { label:"Food & Wine",          weeks:7, lesson2:"At the Table: Ordering & Toasting" },
  family:    { label:"Family Trip",          weeks:7, lesson2:"Everyday Essentials for Everyone" },
  adventure: { label:"Adventure & Outdoors", weeks:8, lesson2:"On the Trail: Asking for Help" },
  business:  { label:"Business Trip",        weeks:6, lesson2:"Politeness & Small Talk for Meetings" }
};
