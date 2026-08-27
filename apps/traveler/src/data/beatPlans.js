// ================================================================
// LESSON BEATS
// A lesson is a sequence of one-question-per-page "beats" — see the
// full design rationale (mixed question styles, why not one repeated
// drill) at the top of screens/Lesson.jsx. Weeks 1 and 2 reuse the
// shared 8-phrase country bank via the generic beat plans below —
// only the intro context flexes per country (week 1) or trip type
// (week 2, via TRIP_TYPES.exploreIntro). Week 3 is bespoke per
// country: see `beatPlan` on each country's `transport` object in
// countries.js.
//
// TODO(admin): as a content author, each entry below (and each
// country's `transport.beatPlan`) should be an authored Question
// (`{ id, kind, phraseId, context, tags[] }`) referenced by ID from a
// Lesson, not a plan entry keyed by array position (`phraseIndex`)
// baked into one hardcoded plan. This is the concrete "reuse" gap:
// today nothing stops the same produce-question being wanted in two
// different Lessons, but there's no library to pull it from — an
// author has to know it already exists and copy the entry. As an
// author building a new Lesson (see store.js's Admin Lesson section
// and screens/admin/AdminLessonDetail.jsx), I need to search existing
// Questions/Phrases (by country/kind/tag) and attach one by reference
// before falling back to authoring a new one — which is exactly what
// the "From phrase bank" question source (store.js phrasesForLesson /
// adminQuestionToBeat) now does for produce/comprehend questions; a
// symbol/situational Question, or a produce/comprehend one an author
// chooses not to phrase-link, still authors its content inline on the
// Lesson.
// ================================================================
export const ARRIVAL_BEAT_PLAN = [
  { kind:"produce", phraseIndex:0, context:"You step up to passport control." },
  { kind:"comprehend", phraseIndex:1, context:"The officer hands your documents back and says:", question:"What are they telling you?" },
  { kind:"produce", phraseIndex:2, context:"You need a hand finding baggage claim — ask politely." },
  { kind:"comprehend", phraseIndex:3, context:"You bump someone's suitcase in the crowd, and they say:", question:"What are they saying?" },
  { kind:"symbol", symbol:"baggage", context:"Following the signs out of arrivals,", question:"What does this sign point to?", correct:"Baggage claim", distractors:["Currency exchange", "Passport control"] }
];
export const EXPLORE_BEAT_PLAN = [
  { kind:"produce", phraseIndex:4, context:"You've been walking for a while and need to find a bathroom." },
  { kind:"comprehend", phraseIndex:5, context:"A shopkeeper points at the item you picked up and says:", question:"What are they asking?" },
  { kind:"produce", phraseIndex:6, context:"The reply comes back fast and you lose the thread." },
  { kind:"comprehend", phraseIndex:7, context:"Someone raises a glass in your direction and says:", question:"What are they saying?" },
  { kind:"symbol", symbol:"noPhoto", context:"Stepping into a small shop, you notice this sign by the door.", question:"What does it mean?", correct:"No photos allowed inside", distractors:["No entry without a purchase", "Cash only"] }
];
