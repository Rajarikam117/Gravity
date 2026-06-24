// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";

// export default defineConfig({
//   plugins: [react()],
//   optimizeDeps: {
//     exclude: ["mind-ar"],
//   },
//   server: {
//     port: 5173,
//     host: true,
//   },
//   build: {
//     target: "es2020",
//     chunkSizeWarningLimit: 1200,
//   },
// });


// chatgpt//
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  optimizeDeps: {
    exclude: ["mind-ar"],
  },

  server: {
    port: 5173,
    host: "0.0.0.0",
    allowedHosts: true,
  },

  build: {
    target: "es2020",
    chunkSizeWarningLimit: 1200,
  },
});