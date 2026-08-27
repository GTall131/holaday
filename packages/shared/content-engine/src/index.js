// Pure content-resolution logic shared by the admin app's live preview
// and the finalize-course Edge Function — ported here from
// apps/traveler/src/store.js (buildLessonBeats, adminQuestionToBeat,
// resolveBlueprintSyllabus, moduleIsComplete, blueprintIsPublishable,
// slugify, parseCsv, buildFlagSvg) during the admin/publish-pipeline
// build phases. No React or Supabase imports belong in this package —
// it has to run unchanged inside a Deno Edge Function.
