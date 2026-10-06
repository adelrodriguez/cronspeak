// Checks that the built bundle runs on the minimum supported runtime.
//
// The floor is the `engines.node` version in package.json. The bundle must not import Node.js
// modules. This script also removes globals that are newer than the floor, so a run on a newer
// runtime fails in the same way as a run on the floor.
//
// Usage: node scripts/compat-smoke.mjs [dist directory]

import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { pathToFileURL } from "node:url"

const distDir = resolve(process.argv[2] ?? "dist")
const entry = resolve(distDir, "index.js")

function check(condition, message) {
  if (!condition) {
    throw new Error(`Compatibility smoke test failed: ${message}`)
  }
}

const content = await readFile(entry, "utf8")
check(
  !/(?:from|import|require)\s*\(?\s*["']node:/.test(content),
  "the bundle imports no Node.js module"
)

if (typeof Array.prototype.toSorted !== "function") {
  throw new Error("This runtime is below the supported floor")
}

// Globals that Node.js added after 20.0.0.
delete RegExp.escape
delete Object.groupBy
delete Map.groupBy
delete Promise.withResolvers
delete Array.fromAsync
delete Error.isError
delete Math.sumPrecise
delete Set.prototype.difference
delete Set.prototype.intersection
delete Set.prototype.isDisjointFrom
delete Set.prototype.isSubsetOf
delete Set.prototype.isSupersetOf
delete Set.prototype.symmetricDifference
delete Set.prototype.union

/**
 * @type {typeof import("../src/index")}
 */
const plaincron = await import(pathToFileURL(entry).href)

check(plaincron.cron("every 15 minutes") === "*/15 * * * *", "cron converts a phrase")
check(
  plaincron.parse("Every Mon, Wed and Fri at 9:30 PM") === "30 21 * * 1,3,5",
  "parse accepts the lenient form"
)
check(plaincron.safeParse("every 7 minutes") === null, "safeParse returns null")
check(plaincron.isCronPhrase("every weekday at 17:30"), "isCronPhrase accepts the strict form")
check(plaincron.isValidCronPhrase("EVERY 2 HRS"), "isValidCronPhrase accepts the lenient form")

try {
  plaincron.parse("every 90 minutes")
  check(false, "parse throws for an invalid phrase")
} catch (error) {
  check(
    error instanceof plaincron.InvalidCronPhraseError && error.value === "every 90 minutes",
    "InvalidCronPhraseError stores the input"
  )
}
