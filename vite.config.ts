// @lovable.dev/vite-tanstack-config already includes:
// tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare,
// componentTagger, env injection, @ alias, dedupe, and error plugins.

import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { nitro } from "nitro/vite";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [nitro()],
  },
});