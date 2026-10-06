import { execFileSync } from "node:child_process"
import { existsSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import packageJson from "../package.json" with { type: "json" }

const packageRoot = join(import.meta.dirname, "..")
const temporaryDirectory = mkdtempSync(join(tmpdir(), "cronspeak-build-"))
const exportPaths = [packageJson.module, packageJson.types, packageJson.exports["."].import]

function run(command: string, arguments_: string[], cwd: string) {
  execFileSync(command, arguments_, { cwd, stdio: "inherit" })
}

try {
  for (const exportPath of exportPaths) {
    const resolvedPath = join(packageRoot, exportPath)
    if (!existsSync(resolvedPath)) {
      throw new Error(`The package export does not exist: ${exportPath}`)
    }
  }

  run("pnpm", ["pack", "--pack-destination", temporaryDirectory], packageRoot)

  const tarballs = readdirSync(temporaryDirectory).filter((file) => file.endsWith(".tgz"))
  const [tarball] = tarballs
  if (!tarball || tarballs.length !== 1) {
    throw new Error(`Expected one package tarball, found ${tarballs.length}`)
  }

  const tarballPath = join(temporaryDirectory, tarball)
  writeFileSync(
    join(temporaryDirectory, "package.json"),
    `${JSON.stringify({ name: "cronspeak-build-verification", private: true, type: "module" }, null, 2)}\n`
  )
  run("npm", ["install", "--ignore-scripts", "--no-package-lock", tarballPath], temporaryDirectory)

  writeFileSync(
    join(temporaryDirectory, "runtime.mjs"),
    `import assert from "node:assert/strict"

import { cron, InvalidCronPhraseError, isCronPhrase, parse, safeParse } from "cronspeak"

assert.equal(cron("every 15 minutes between 9:00 and 17:00 on weekdays"), "*/15 9-16 * * 1-5")
assert.equal(parse("Every Mon At 9:30 AM"), "30 9 * * 1")
assert.equal(safeParse("every 7 minutes"), null)
assert.equal(isCronPhrase("every monday and friday at 12:00"), true)
assert.throws(() => parse("every 90 minutes"), InvalidCronPhraseError)
`
  )
  run(process.execPath, ["runtime.mjs"], temporaryDirectory)

  writeFileSync(
    join(temporaryDirectory, "consumer.ts"),
    `import { cron, isCronPhrase, parse, type CronPhrase, type Weekday } from "cronspeak"

const phrase: CronPhrase = "every weekday at 17:30"
const day: Weekday = "monday"
const result: string = cron("every 15 minutes")
declare const input: string

// @ts-expect-error -- 7 does not divide 60.
cron("every 7 minutes")

// @ts-expect-error -- a plain string must be narrowed with isCronPhrase first.
cron(input)

if (isCronPhrase(input)) cron(input)

void [phrase, day, result, parse(input)]
`
  )
  writeFileSync(
    join(temporaryDirectory, "tsconfig.json"),
    `${JSON.stringify(
      {
        compilerOptions: {
          module: "NodeNext",
          moduleResolution: "NodeNext",
          noEmit: true,
          strict: true,
          target: "ESNext",
        },
        files: ["consumer.ts"],
      },
      null,
      2
    )}\n`
  )

  run(
    process.execPath,
    [join(packageRoot, "node_modules/typescript/bin/tsc"), "--project", "tsconfig.json"],
    temporaryDirectory
  )

  console.info("Verified the packed Cronspeak runtime and declarations.")
} finally {
  rmSync(temporaryDirectory, { force: true, recursive: true })
}
