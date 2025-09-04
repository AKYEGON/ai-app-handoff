
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log('[Main] Starting React application initialization...');

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element not found");
}

console.log('[Main] Creating React root...');
const root = createRoot(rootElement);

console.log('[Main] Rendering React app...');
root.render(
  <StrictMode>
    <App />
  </StrictMode>
);

console.log('[Main] React app rendered successfully');
