import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Builds one self-contained HTML file so the game can be published as a single page.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
});
