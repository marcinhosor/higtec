import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { getActiveTheme, applyThemeToDOM } from "./hooks/use-theme";

// Apply saved theme on startup
applyThemeToDOM(getActiveTheme());

createRoot(document.getElementById("root")!).render(<App />);
