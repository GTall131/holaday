import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initAuth } from "./store";

// Restores a signed-in admin session (if any) before the first render
// — see store.js's initAuth for what this resolves.
initAuth().finally(() => {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
});
