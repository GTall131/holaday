/* ================================================================
   HOLADAY ADMIN — content authoring workspace

   A genuinely separate app from apps/traveler (see supabase/README.md
   and the original ADMIN-CONTENT-PLAN.md's now-superseded §10 note):
   desktop-oriented, no phone-frame chrome, its own Supabase project
   (holaday-admin) and its own auth (no self-serve signup — see
   screens/Login.jsx). This app authors the content bank
   (Language/Destination/Module/Lesson/Phrase/Blueprint/Persona)
   through the same draft -> staged -> published -> archived lifecycle
   for everything except Language/Persona (see store.js). Publishing
   here does not yet push into holaday-content (the traveler app's
   project) — that cross-project sync is a separate, later piece.
   ================================================================ */
import { useStoreVersion } from "./useStore";
import { top } from "./store";
import AppBar from "./components/AppBar";
import Toast from "./components/Toast";

import Login from "./screens/Login";
import AdminHome from "./screens/AdminHome";
import AdminLanguages from "./screens/AdminLanguages";
import AdminLanguageDetail from "./screens/AdminLanguageDetail";
import AdminDestinations from "./screens/AdminDestinations";
import AdminStaged from "./screens/AdminStaged";
import AdminDestinationDetail from "./screens/AdminDestinationDetail";
import AdminModuleDetail from "./screens/AdminModuleDetail";
import AdminLessonDetail from "./screens/AdminLessonDetail";
import AdminPhraseDetail from "./screens/AdminPhraseDetail";
import AdminBlueprints from "./screens/AdminBlueprints";
import AdminBlueprintDetail from "./screens/AdminBlueprintDetail";
import AdminPersonas from "./screens/AdminPersonas";
import AdminPersonaDetail from "./screens/AdminPersonaDetail";
import AdminPersonaGenerating from "./screens/AdminPersonaGenerating";
import AdminPersonaGenerateContent from "./screens/AdminPersonaGenerateContent";
import AdminPersonaGeneratingContent from "./screens/AdminPersonaGeneratingContent";
import AdminPersonaGeneratedContent from "./screens/AdminPersonaGeneratedContent";

function Screen({ top: t }){
  switch (t.name){
    case "login": return <Login />;
    case "admin-home": return <AdminHome />;
    case "admin-languages": return <AdminLanguages />;
    case "admin-language": return <AdminLanguageDetail payload={t.payload} />;
    case "admin-destinations": return <AdminDestinations />;
    case "admin-staged": return <AdminStaged />;
    case "admin-destination": return <AdminDestinationDetail payload={t.payload} />;
    case "admin-module": return <AdminModuleDetail payload={t.payload} />;
    case "admin-lesson": return <AdminLessonDetail payload={t.payload} />;
    case "admin-phrase": return <AdminPhraseDetail payload={t.payload} />;
    case "admin-blueprints": return <AdminBlueprints />;
    case "admin-blueprint": return <AdminBlueprintDetail payload={t.payload} />;
    case "admin-personas": return <AdminPersonas />;
    case "admin-persona": return <AdminPersonaDetail payload={t.payload} />;
    case "admin-persona-generating": return <AdminPersonaGenerating payload={t.payload} />;
    case "admin-persona-generate-content": return <AdminPersonaGenerateContent payload={t.payload} />;
    case "admin-persona-generating-content": return <AdminPersonaGeneratingContent payload={t.payload} />;
    case "admin-persona-generated-content": return <AdminPersonaGeneratedContent payload={t.payload} />;
    default: return null;
  }
}

export default function App(){
  useStoreVersion();
  const t = top();

  return (
    <div className="app-shell is-admin no-tabbar">
      <AppBar top={t} />
      <main id="app">
        <Screen top={t} />
      </main>
      <Toast />
    </div>
  );
}
