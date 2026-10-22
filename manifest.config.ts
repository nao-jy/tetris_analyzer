import { defineManifest } from "@crxjs/vite-plugin";
import pkg from "./package.json";

export default defineManifest({
  manifest_version: 3,
  content_security_policy: {
    extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self';",
  },
  name: pkg.name,
  description: pkg.description,
  version: pkg.version,
  icons: {
    48: "public/logo.png",
  },
  action: {
    default_icon: { 48: "public/logo.png" },
    default_popup: "src/popup/index.html",
  },
  permissions: ["sidePanel", "activeTab", "scripting"],
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  side_panel: {
    default_path: "src/sidepanel/index.html",
  },
});
