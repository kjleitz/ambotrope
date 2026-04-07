import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import checker from "vite-plugin-checker"

export default defineConfig({
  plugins: [react(), tailwindcss(), checker({ typescript: { tsconfigPath: "./tsconfig.app.json" } })],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET || "http://localhost:3000",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/ws": {
        target: process.env.VITE_WS_PROXY_TARGET || "ws://localhost:3000",
        ws: true,
      },
    },
  },
})
