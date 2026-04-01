import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: process.env.TEMPO === "true" ? "0.0.0.0" : "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    // @ts-ignore
    allowedHosts: process.env.TEMPO === "true" ? true : undefined,
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('three')) return 'three-vendor';
          if (id.includes('recharts')) return 'chart-vendor';
          if (id.includes('jspdf')) return 'pdf-vendor';
          if (id.includes('react-markdown')) return 'markdown-vendor';
          if (id.includes('katex')) return 'math-vendor';
        },
      },
    },
  },
}));
