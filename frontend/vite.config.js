import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
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