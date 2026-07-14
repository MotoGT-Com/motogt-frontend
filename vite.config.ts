import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
  // Ensure .env VITE_API_BASE_URL is available for the dev proxy (process.env alone
  // does not load .env, so the proxy previously fell back to production).
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_BASE_URL || "https://api.motogt.com";

  return {
    plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
    server: {
      host: true, // Allow external connections
      port: 5173,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: apiProxyTarget.startsWith("https"),
          // Keep the /api prefix when forwarding
          rewrite: (path) => path,
        },
      },
    },
  };
});
