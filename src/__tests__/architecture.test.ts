import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

const LIB = join(import.meta.dirname, "..", "lib")

// Dependencies point in one direction:
//
//   vocabulary <- grammar -> schedule <- cron
//   vocabulary <- normalize
//   grammar, normalize, cron <- phrase
//
// The grammar does not know the cron format, and the serializer does not know the language. Nothing
// in lib imports from outside lib.
const ALLOWED_DEPENDENCIES: Record<string, readonly string[]> = {
  cron: ["schedule"],
  grammar: ["schedule", "vocabulary"],
  normalize: ["vocabulary"],
  phrase: ["cron", "grammar", "normalize"],
  schedule: [],
  vocabulary: [],
}

const IMPORT_RE = /from\s+"(\.{1,2}\/[^"]+)"/g

function getModuleFiles(folder: string): string[] {
  return readdirSync(join(LIB, folder)).filter(
    (file) => file.endsWith(".ts") && !file.endsWith(".test.ts")
  )
}

function getImportedFolders(folder: string, file: string): string[] {
  const source = readFileSync(join(LIB, folder, file), "utf8")
  return [...source.matchAll(IMPORT_RE)]
    .map((match) => match[1] ?? "")
    .filter((specifier) => specifier.startsWith("../"))
    .map((specifier) => specifier.split("/")[1] ?? "")
}

describe("module dependencies", () => {
  it("has a rule for every lib folder", () => {
    const folders = readdirSync(LIB, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)

    expect(folders.toSorted()).toEqual(Object.keys(ALLOWED_DEPENDENCIES).toSorted())
  })

  for (const [folder, allowed] of Object.entries(ALLOWED_DEPENDENCIES)) {
    it(`${folder} imports only from ${allowed.join(", ") || "itself"}`, () => {
      for (const file of getModuleFiles(folder)) {
        for (const imported of getImportedFolders(folder, file)) {
          expect(allowed, `${folder}/${file} imports ${imported}`).toContain(imported)
        }
      }
    })
  }
})
