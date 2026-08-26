# Holaday — Admin / Content-Authoring Plan

Status: **design only, nothing in this doc is built yet.** This captures the
plan for the destination-creation, lesson-creation, course-creation,
staging/publishing, and content-reuse ("indexing") flows on the
administration side of the app, worked out against the existing
traveler-facing prototype in `index.html` / `holaday-prd-demo.html`.
Section numbers below are stable anchors — the HTML file's TODO comments
reference them as `§N`.

The traveler-facing demo's seed/demo course was removed as part of this
pass (`courses` now starts as `[]`) so the app reflects only what a real
session actually generates.

## 1. Why this exists

The existing prototype hard-codes all content (`COUNTRIES`, `TRIP_TYPES`,
beat plans) directly in JS — fine for proving the traveler experience, not
a real content pipeline. This plan is for the admin side: how content
teams actually author, review, publish, and reuse the material that
traveler-facing courses are generated from.

## 2. Content hierarchy

```
Phrase → Question → Lesson (tagged: Module + Tier) → Module (a theme's difficulty ladder)
                                                            ↓
                                          Trip Type Blueprint (Legs: name + gate + blurb)
                                                            ↓
                                          generated Course (runtime, per traveler — never authored)
```

- **Phrase** — `{ id, countryKey, en, local, translit, tags[] }`. Replaces
  today's flat `country.phrases[]` / `country.transport.phrases[]` arrays
  with addressable, stable-ID rows.
- **Question** (today's "beat") — `{ id, kind: produce|comprehend|symbol|situational, phraseId?, symbolId?, scenarioId?, context, tags[] }`.
  The reusable unit — a Japan "produce: hello" Question is authored once
  and attached to *N* Lessons, instead of re-embedded per lesson the way
  `buildBeat`/`ARRIVAL_BEAT_PLAN` do today.
- **Lesson** — `{ id, title, type: Phrase|Culture, moduleId, tier, scope: generic|country-specific, countryKey?, questionIds[] (ordered) }`.
- **Module** — a thematic grouping (Arrival, Getting Around, Ordering Food,
  Local Customs, Handling Problems…) holding a **tier ladder** of Lessons
  (Tier 1 = basic, Tier 2 = harder, …). A Module can be generic (tiers
  built from any country's phrase bank + a shared beat-plan template, like
  today's weeks 1–2) or country-bespoke (fully custom per country per
  tier, like today's Transport week).
- **Trip Type Blueprint** — replaces the old idea of a fixed "Course
  Template." It's a rule set, not a fixed week list: how many Legs this
  trip type has, which Modules are core (every Leg) vs. introduced later,
  how each Leg maps to a Tier per Module, and how Leg length grows. See §8
  for what a Leg actually is.
- **generated Course** — the object already in the prototype's `courses[]`
  array. Unchanged in spirit: the runtime instance one traveler owns,
  resolved by walking a published Blueprint against the published
  Module/Lesson bank for their country. **Never itself authored or
  reviewed** — see §6.

Every Phrase above carries a `countryKey` — none of this hierarchy has
anywhere to attach to until the destination itself exists as authored
content. See §2a.

## 2a. Flow: Destination (Country) creation (Author)

Not one of the original four flows, but a prerequisite underneath all of
them. `COUNTRIES` is down to a single hardcoded entry (Japan, kept only
so the traveler flow has something to generate a course against out of
the box); every other destination is meant to be authored through this
flow. Publishing a Destination here is now what makes it selectable in
the traveler-facing country picker — `screenCountry` reads from
`publishedDestinations()`, not `COUNTRIES` (see `travelerCountry()`) —
so authoring and publishing a new Country genuinely "pulls it through"
into the traveler app immediately. What it does *not* get for free is a
phrase/transport bank (`country.phrases`/`country.transport` — see §7):
those only exist on the one legacy `COUNTRIES` entry. A new Country can
still support a fully working course end-to-end, but only through
authored Lessons resolved via a published Blueprint (§5/§8) — see the
Module/Blueprint readiness gating in §4/§6. Until that's authored, its
offline Phrasebook (§9) shows an empty state rather than crashing.

1. Author sets the destination's shell profile: `name`, `capital`, and the
   three flag `colours` (primary/secondary/tertiary) that theme every
   screen for courses to this country (`--flag-*` CSS vars, ticket/week-
   row/culture-card accents — see the DASHBOARD styles).
2. Author provides the flag icon itself. Per PRD §12 this is deliberately
   a hand-built inline SVG, not an emoji or photo, so this step needs
   either an SVG upload or a small in-app "build a flag from these
   stripes/shapes and these three colours" tool — not a generic image
   picker.
3. Author writes the destination-level `cultureTip` — the one-off "Know
   before you go" copy shown on the dashboard's culture card, which sits
   at the Country level rather than belonging to any single Lesson.
4. This flow only creates the shell. Phrases, Questions, Lessons, and
   Modules for this country are then authored separately against it (§3,
   §4) — a brand-new Country starts with an empty content bank, so it
   won't be sufficient for any Blueprint to resolve against until enough
   of that follow-on content is published (see the Module/Blueprint
   readiness gating in §4/§6). Authoring that content does *not* wait on
   the Country's own status — a Country only needs to exist (past its
   first Save Draft, which is what assigns its stable `countryKey`), not
   be Staged or Published, before Modules/Lessons can target it. Only
   *publishing* a Module/Lesson still requires the Countries it claims to
   actually be Published (§4) — that's a separate, later gate.
5. Preview reuses the existing `country-card` (picker) and `ticket`
   (dashboard) rendering so the author sees exactly how the destination
   will look before it's real.
6. Save Draft → Stage → Publish. Same lifecycle as everything else (§6)
   — a Country profile goes through the same staging gate as everything
   else, not exempt because it looks like static metadata.
7. Author picks the Country's **Language** (§2b) as part of the shell
   profile — required before the Country can be saved. This is what lets
   Module/Lesson authoring (§3/§4) offer "applies to all countries using
   this language" instead of forcing every piece of bespoke content to
   be re-authored per country.

## 2b. Language

A Language is reference taxonomy, not itself staged/published content like
the rest of this hierarchy — it has no draft/staged lifecycle, just a
name. Every Country names exactly one Language (§2a step 7); a Module or
Lesson authored as country-bespoke either targets one specific Country
or is marked **language-wide**, in which case it resolves against
*every* published Country currently using that Language — computed live,
so a Country added later in an already-authored Language picks up that
content automatically rather than needing it re-authored per country.

Two entry points set the default for the language-wide toggle:
- Pressing "Create Module"/"Create Lesson" from a **Country** screen
  inherits that Country's Language, toggle off by default (scoped to
  just that Country — the narrower, safer default).
- Pressing "Create Module"/"Create Lesson" from a **Language** screen
  has no single Country to default to, so the toggle defaults on
  (language-wide) instead.

Browsing a Country's screen lists every Module/Lesson that applies to
it — generic, pinned to that Country, or language-wide under its
Language — so authoring against an already-covered Language (a 7th
country added in an existing Language) immediately surfaces what's
already there instead of looking empty.

## 3. Flow: Lesson creation (Author)

1. Pick type (Phrase/Culture), Module, and Tier.
2. Assemble the ordered Question list — search the existing Question
   library first (filter by country/kind/tag) and attach by reference;
   only create a new Question if nothing fits. Creating one means
   picking/creating its Phrase, writing the scenario `context`, and (for
   `symbol` kind) picking an existing icon from the `SYMBOLS` registry or
   uploading a new one.
3. Live preview reuses `renderBeat`/`screenLesson` verbatim — what the
   author sees is the literal traveler-facing beat sequence, distractors
   included.
4. Save Draft → validation (≥5 questions, mixed kinds per PRD §11a, phrase
   bank deep enough for the distractor count) → Stage.
5. If scoped to a Country rather than marked generic, the author also
   picks a Language and, per §2b, either a specific Country or the
   "applies to all countries using this language" toggle.

## 4. Flow: Module creation (Author)

1. Define the theme/name and whether it's generic or country-bespoke.
   A bespoke Module names a Language and either one specific Country or
   "applies to all countries using this language" (§2b).
2. Build the tier ladder — attach or author a Lesson at each Tier.
3. Track per-country ladder completeness: a completeness grid (rows =
   countries, columns = Tiers) shows Missing/Draft/Staged/Published per
   cell. For a language-wide Module the rows are every published Country
   currently using its Language, not a fixed list. A Module can't be
   published until every Tier it claims to offer has a published Lesson
   for every country it needs to support.

## 5. Flow: Blueprint creation (Author)

1. Pick an existing Trip Type or define a new one.
2. Define the Legs (see §8): name each, decide which Modules are core vs.
   added-later, set the Tier-per-Leg mapping, set how Leg length grows.
3. Preview is a **dry-run**: simulate the generator against current draft
   content for a chosen country and render the resulting Leg-by-Leg
   syllabus — reusing `screenDashboard`'s ticket/week-list rendering,
   grouped by Leg (§9).
4. Save Draft → Stage.

## 6. Flow: Staging & publishing

A Course can't be a staging target — it doesn't exist until the
generator resolves a Blueprint for a specific traveler at a specific
moment, so there's nothing stable to stage. **The staging surface is
the content bank itself**: Country profile (§2a), Phrase, Question,
Lesson, Module, Blueprint, and the Leg naming/copy (Confidence Ladder —
see §8).

State machine (same for every item type above):

```
Draft → Staged → Published → Archived (superseded by new version)
   ^       |
   └───────┘  (Staged can drop back to Draft for further edits)
```

- **Author**: creates/edits Drafts, then Stages when it's ready — Staged
  is a self-checkpoint ("I'm done with this, it's ready to go live"), not
  a handoff to a separate reviewer. There's no Approver role and no
  request-changes step: the same person drafts and publishes, so a
  distinct review/approval stage would just add friction without adding
  safety. If a Staged item needs more work, "Back to Draft" reopens it
  for editing — no note or reason required. Status tracking still applies
  regardless of who's doing the work.
- Gating cascades: a Lesson needs Staged+ Questions; a Module needs a
  published Lesson at every Tier/country it claims; a Blueprint needs
  every Module it references to have enough published Tiers for every
  country the Trip Type targets, before the Blueprint itself is
  publishable (i.e., before that Trip Type is offerable for that country
  in the traveler picker).
- Publishing swaps the live version immediately (no backend, matches this
  prototype's spirit) — but a generated `Course` should pin a
  `templateVersion` at `finalizeCourse()` time so publishing a new
  Blueprint mid-trip doesn't retroactively rewrite someone's in-progress
  course.
- The Leg `blurb` (§8) goes through the same staging gate — copy quality
  is a real bar to clear before staging, not a nice-to-have (see §8).

## 7. "Indexing" — two separate concerns, only one is in scope now

- **Content reuse (in scope, this plan)**: the Phrase/Question/Lesson/
  Module library with tags and search, described above — solves "say hi"
  existing once and being attached everywhere it's needed, instead of
  re-authored per lesson.
- **LLM retrieval index (explicitly out of scope for this plan)**: once
  generation stops being a hardcoded switch and an LLM actually
  selects/sequences published content per trip, *that* content will need
  its own retrieval index (tags/embeddings over Phrases/Questions/
  Lessons/Modules). The tagging scheme above is designed so it can feed
  that later without rework — but building the retrieval/generation index
  itself is a separate, later effort from admin CRUD + approvals.

## 8. Legs (formerly "Rounds")

"Leg" was chosen over "Round" because it's already implicit in the
existing metaphor (PRD §6: "a flight = a course") — "the first leg of your
journey" is the natural phrase for a multi-stage trip that gets
harder/longer as it goes, and it doesn't collide with Week/Course/Trip.

A Leg is **dual-purpose**, and both halves are real fields on the object,
authored per Blueprint (seeded from a default ladder, fully editable):

- `name` — the persona, e.g. "Slightly Scared Tourist" → "Confident
  Traveller" → "Seasoned Explorer" → "Honorary Local" (default 4-step
  Confidence Ladder; most Trip Types will only need 2–3 given the
  existing 6–8 week ceiling, so Blueprints truncate from this ladder
  rather than being required to use all 4).
- `blurb` — traveler-facing copy shown at the Leg transition, written from
  the **holiday** angle, not the **lesson** angle. This is the field most
  likely to get skipped under deadline pressure since it isn't load-bearing
  for the generator — which is exactly why it's a required author field
  and a real review criterion ("does this feel like progress toward the
  trip, not just progress through content"), not optional polish.
- `moduleGate` — the functional half: which Modules are included at this
  Leg and at what Tier. This is what the generation automation actually
  reads to know which parts of the content bank it's allowed to draw from
  for a given traveler's current Leg.

Guiding principle to carry forward (explicitly flagged as easy to lose
under delivery pressure): **Legs should make the traveler feel good about
the actual holiday, not just mark learning progress.** Example
Leg-complete copy blending both halves: *"Leg 1 complete — you can order
food, ask directions, and get through an airport without panicking.
Confident Traveller starts now."* — functional proof in service of an
emotional payoff, not "5/5 lessons done."

## 9. Traveler-facing impact

- `Course` gains `currentLeg` / `totalLegs` / `legName` alongside the
  existing `currentWeek`/`weeks` (total weeks still matters for pacing
  against the travel date).
- Dashboard ticket: primary stat becomes "Leg *n* of *N*"; total weeks
  becomes a secondary stat.
- Week-list becomes Leg-grouped, reusing the existing `.section-label`
  pattern as Leg headers (e.g. "LEG 1 — SLIGHTLY SCARED TOURIST"); a Leg's
  rows stay locked until the prior Leg is fully complete.
- Home row subtitle: "Leg 2 of 3 · Lesson 2 of 4" instead of "Week 4 of 7".
- Leg-complete moment: a dedicated toast/beat (see §8 example), not the
  generic "Lesson complete" toast.
- Open call, recommended default: **Leg 1 complete = the "trip-ready"
  floor** (survivable minimum), later Legs framed as optional sharpening
  before departure rather than an all-or-nothing bar. Flag if this should
  be stricter.

## 10. Where the admin surface lives

**Demo phase (now):** a new section inside this same file, not a separate
prototype — new stack screens (e.g. `admin-lessons`, `admin-modules`,
`admin-blueprints`, `admin-review`) pushed onto the existing
`stack`/`push`/`render` machinery, reusing `board-row`/`chip`/`vocab-card`
patterns. The existing 400px phone-frame constraint (see the `@media
(min-width: 640px)` rule) is a poor fit for review-queue tables and diffs,
so admin screens should render full-width outside that frame — same ink/
paper/amber tokens, different chrome. There's a single admin surface, no
role toggle — real auth (whoever's allowed into `/admin`) stands in for
now, consistent with how the rest of this prototype fakes state rather
than building a backend. This is deliberately a shortcut to let us nail
down the feature set quickly in one file, not the intended end state.

**Real build (later): a genuinely separate app**, not a mode/tab bolted
onto the traveler app. Content authoring and review is a desktop/laptop
workflow — tables, diffs, multi-pane review queues — and shouldn't be
constrained by a mobile app-shell or ship in the same bundle/deploy as the
traveler-facing product at all. Treat everything built in the demo phase
above as throwaway scaffolding for validating the flows, not as the
foundation the production admin app gets built on top of.

## 11. Open questions / pending decisions

- If a Blueprint's Legs outrun the authored Tiers for a Module (e.g. 4
  Legs but only 2 Tiers built for one Module), does the generator repeat
  the top Tier, drop that Module for later Legs, or block the Blueprint
  from publishing until Tiers catch up?
- Is "trip-ready" Leg 1 completion (recommended) or all Legs? (§9)
- Are Leg numbers ever shown to travelers ("Leg 2 of 3"), or is the Leg
  *name* the only traveler-facing label, with the numeric count staying
  an internal/authoring detail?

## 12. Persona-driven content generation (stub)

Two flows, currently stubbed (`app/src/store.js`'s "ADMIN — Persona"
section), for going from a traveler archetype straight to draft content:

1. **Persona creation.** Author writes a rough outline (a few sentences).
   A (stubbed) call fleshes it out into a full profile — name, summary,
   age range, travel style, motivations, pain points, vocab focus — which
   the author then reviews and edits in place. Persona is reference
   material for authoring, not traveler-facing content, so — like
   Language (§2b) — it has no draft/staged/published lifecycle; it's
   just always-editable.
2. **Generate lesson content.** From a fleshed-out Persona, the author
   picks a Country + Trip Type and generates a starter Module, one
   Lesson under it, and the Phrases that Lesson's questions reference —
   all tagged `generatedFromPersonaId` for traceability. These land as
   ordinary Drafts in the real content-bank tables, so they go through
   the *same* review/staging/publish gate as hand-authored content (§6)
   — generation doesn't get to skip review just because a machine
   produced it. The result is shown as its own screen, structured as an
   actual Module -> Lesson -> Phrase tree (not a flat list), specifically
   *not* shown inline alongside the Persona's own outline/profile fields
   — reviewing "what got generated" and editing "who is this persona"
   are different tasks and shouldn't compete for the same screen.

**Feature note (not built yet):** the generation step in (2) should be
an **LLM-as-Judge** pipeline, not single-pass generate-and-accept. A
second model call should score each candidate Module/Lesson/Phrase
against the source Persona — relevance to that persona's stated
motivations/pain points, tone, factual plausibility of any translated
phrase content — and reject/retry anything that scores poorly *before*
it's written to the content bank. Right now the human Draft-review step
(§6) is the only quality gate; an LLM-as-Judge pass in front of that
would catch low-relevance or generic-sounding output earlier, before it
ever reaches an author's queue.
