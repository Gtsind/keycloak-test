import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { initKeycloak } from "./auth/keycloak";

initKeycloak()
  .then((authenticated) => {
    if (!authenticated) {
      // login-required forces a redirect; this branch shouldn't happen.
      return;
    }
    createRoot(document.getElementById("root")!).render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  })
  .catch((err) => {
    console.error("Keycloak init failed", err);
    document.getElementById("root")!.textContent =
      "Failed to initialize authentication. Check that Keycloak is running.";
  });
