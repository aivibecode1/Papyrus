import React from "react";
import ReactDOM from "react-dom/client";
import "./i18n";
import "./index.css";
import App from "./App";

const savedLang = localStorage.getItem("papyrus-lang") ?? "en";
document.documentElement.lang = savedLang;
document.documentElement.dir = savedLang === "ar" ? "rtl" : "ltr";

const savedTheme = localStorage.getItem("papyrus-theme");
if (
  savedTheme === "dark" ||
  savedTheme === "dos" ||
  (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
) {
  document.documentElement.classList.add("dark");
}
// Sepia and dos are palette variants selected via data-theme (the hook
// mirrors this on every change).
if (savedTheme === "sepia" || savedTheme === "dos") {
  document.documentElement.dataset.theme = savedTheme;
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
