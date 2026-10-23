import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "react-i18next": fileURLToPath(
        new URL("./src/i18n/useTranslation.js", import.meta.url)
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // Palitan kung iba ang backend URL mo sa Laragon
        target: "http://localhost/rolcalapan/backend/public",
        changeOrigin: true,
      },
    },
  },
});