import React from "react";
import ReactDOM from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import App from "./App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);

// Register PWA Service Worker in web production only (never inside native Capacitor WebView)
if ("serviceWorker" in navigator) {
  if (Capacitor.isNativePlatform()) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => {
        for (const registration of registrations) {
          void registration.unregister();
        }
      })
      .catch(() => {});
  } else if (import.meta.env.PROD) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[Noticed PWA] Service Worker registered, scope:", reg.scope);
          // Automatically check for updates on app foregrounding (essential for iOS PWA)
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              reg.update();
            }
          });
        })
        .catch((err) => {
          console.warn("[Noticed PWA] Service Worker registration failed:", err);
        });
    });
  }
}

