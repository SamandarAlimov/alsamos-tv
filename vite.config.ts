import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;

          if (id.includes("react") || id.includes("react-dom") || id.includes("react-router-dom")) {
            return "vendor-react";
          }
          if (id.includes("@radix-ui")) {
            return "vendor-radix";
          }
          if (id.includes("lucide-react")) {
            return "vendor-icons";
          }
          if (id.includes("framer-motion")) {
            return "vendor-motion";
          }
          if (id.includes("@supabase")) {
            return "vendor-supabase";
          }
          if (id.includes("@tanstack")) {
            return "vendor-query";
          }
          if (id.includes("hls.js")) {
            return "vendor-media";
          }
          if (id.includes("recharts") || id.includes("date-fns")) {
            return "vendor-charts";
          }

          return "vendor";
        },
      },
    },
  },
}));
