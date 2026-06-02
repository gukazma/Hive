import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// 开发态把 /api 与 /ws 代理到 Go 后端（默认 8080）。
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    proxy: {
      // /api 同时承载 REST 与 /api/ws WebSocket
      "/api": { target: "http://localhost:8080", changeOrigin: true, ws: true },
    },
  },
});
