import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Fortal CRM - Gestão de Leads",
        short_name: "Fortal CRM",
        description: "Gestão e distribuição de leads da Fortal Inteligência Imobiliária",
        theme_color: "#0E0C0A",
        background_color: "#0E0C0A",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
