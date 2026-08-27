// Standalone admin/content-authoring app — a separate deploy from
// apps/traveler (desktop-oriented, no phone-frame chrome), per the build
// plan. Screens under apps/traveler/src/screens/admin/* and their
// store.js CRUD/staging logic land here against real holaday-admin
// Supabase tables during the Admin core build phase; this is just the
// running shell for now.
export default function App() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "40px" }}>
      <h1>Holaday Admin</h1>
      <p>Content authoring workspace — not yet wired up.</p>
    </main>
  );
}
