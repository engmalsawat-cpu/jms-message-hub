import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";

// Set initial direction
const lang = localStorage.getItem("jms-language") || "ar";
document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
document.documentElement.lang = lang;

createRoot(document.getElementById("root")!).render(<App />);
