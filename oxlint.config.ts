import core from "adamantite/lint"
import { defineConfig } from "oxlint"

export default defineConfig({
  extends: [core],
  options: {
    respectEslintDisableDirectives: true,
    typeAware: true,
    typeCheck: true,
  },
  overrides: [
    {
      // JSDoc is the only type syntax available in plain JavaScript files.
      files: ["scripts/**/*.mjs"],
      rules: { "jsdoc/check-tag-names": ["error", { typed: false }] },
    },
    {
      // Each type test is a bare block so its locals stay scoped to one case.
      files: ["src/__tests__/types.test-d.ts"],
      rules: {
        "eslint/no-lone-blocks": "off",
      },
    },
  ],
})
