import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getActiveTheme, applyThemeToDOM } from "./hooks/use-theme";

// Apply saved theme on startup
applyThemeToDOM(getActiveTheme());

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(<App />);
