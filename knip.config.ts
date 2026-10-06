import type { KnipConfig } from "knip"
import analyze from "adamantite/analyze"

export default {
  ...analyze,
  entry: ["src/**/*.test-d.ts"],
  ignore: [],
  ignoreFiles: [],
  project: ["src/**/*.ts"],
} satisfies KnipConfig
