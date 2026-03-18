import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    host: true, // Allow external connections
    port: 5173,
    proxy: {
      "/api": {
        target: process.env.VITE_API_BASE_URL || "https://api.motogt.com",
        changeOrigin: true,
        secure: true,
        // Keep the /api prefix when forwarding
        rewrite: (path) => path,
      },
    },
  },
});
