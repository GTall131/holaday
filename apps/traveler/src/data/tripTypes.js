// Trip type drives lesson-2's framing and the course's total duration —
// more situationally complex trip types get an extra week or two.
// `exploreIntro` sets the scene for week 2's opening question (see
// EXPLORE_BEAT_PLAN in beatPlans.js) — it's the one place trip-type
// flavour shows up, since the underlying phrases (bathroom/price/
// don't-understand/cheers) are shared across every trip type.
//
// TODO(admin): as a content author, I need to define each Trip Type as
// a Blueprint: an ordered list of named Legs (e.g. Leg 1 "Slightly
// Scared Tourist", Leg 2 "Confident Traveller"), each with a `blurb`
// (traveler-facing, written from the holiday-excitement angle, not the
// lesson angle) and a `moduleGate` (which Modules are included at this
// Leg and at what Tier — see store.js's Blueprint section). This
// replaces the flat `weeks` count below: total duration becomes the
// sum of each Leg's length, and later Legs repeat the same core
// Modules at a harder Tier rather than introducing all-new topics. As
// a reviewer, I need Leg `blurb` copy quality to be a real review
// criterion, not skippable polish.
// This TODO is now partially resolved by store.js's
// resolveBlueprintSyllabus() — a published Blueprint overrides
// syllabus() below for its Trip Type; only unauthored Trip Types still
// fall back to this hardcoded shell.
export const TRIP_TYPES = {
  city:      { label:"City Break",          weeks:6, lesson2:"Getting Around Like a Local",
               exploreIntro:(name)=>`You've ditched the guidebook for a wander through ${name} — the afternoon usually goes something like this.` },
  beach:     { label:"Beach Escape",         weeks:6, lesson2:"Beach, Bargaining & Small Talk",
               exploreIntro:(name)=>`Between the beach and the boardwalk in ${name}, a few small moments come up again and again.` },
  food:      { label:"Food & Wine",          weeks:7, lesson2:"At the Table: Ordering & Toasting",
               exploreIntro:(name)=>`Between courses and tasting stops in ${name}, these are the moments where a few words go a long way.` },
  family:    { label:"Family Trip",          weeks:7, lesson2:"Everyday Essentials for Everyone",
               exploreIntro:(name)=>`With the whole family in tow around ${name}, it's these small everyday moments that come up most.` },
  adventure: { label:"Adventure & Outdoors", weeks:8, lesson2:"On the Trail: Asking for Help",
               exploreIntro:(name)=>`Off the beaten path around ${name}, these are the moments where a few words matter most.` },
  business:  { label:"Business Trip",        weeks:6, lesson2:"Politeness & Small Talk for Meetings",
               exploreIntro:(name)=>`Between meetings in ${name}, these are the small everyday moments that still come up.` }
};

// Generic 8-week syllabus shell. Weeks 1-3 ship as built, interactive
// lessons (see Lesson.jsx) — weeks beyond that render as locked/
// upcoming to demonstrate progressive unlock rather than dumping the
// whole course on day one. Week 3 is always the "culture" lesson
// (Public Transport) rather than another phrase drill, so every
// course proves out the etiquette/customs differentiator, not just
// vocab.
//
// TODO(admin): this whole hardcoded 8-entry array is what a Blueprint
// (see TODO above) should generate instead — as a traveler, the
// syllabus should come from resolving my Trip Type's published
// Blueprint against the country I'm traveling to, not slicing a fixed
// array by week count. store.js's resolveBlueprintSyllabus() is that
// resolution; this function is only the fallback for Trip Types with
// no published Blueprint yet.
export function syllabus(tripKey){
  const t = TRIP_TYPES[tripKey];
  const all = [
    { title:"Airport & Arrival Essentials", type:"Phrase" },
    { title:t.lesson2, type:"Phrase" },
    { title:"Public Transport & Getting Around", type:"Culture" },
    { title:"Local Etiquette Deep-Dive", type:"Culture" },
    { title:"Numbers, Time & Directions", type:"Phrase" },
    { title:"Food, Drink & Dining Out", type:"Phrase" },
    { title:"Handling the Unexpected", type:"Phrase" },
    { title:"Review & Trip-Ready Checkpoint", type:"Culture" }
  ];
  return all.slice(0, t.weeks);
}
