import { describe, expect, it } from "vitest"
import type { GrammarRow } from "../../grammar/__tests__/grammar.table"
import type { CronPhrase } from "../../grammar/types"
import { GRAMMAR } from "../../grammar/__tests__/grammar.table"
import { cron } from "../cron"
import { InvalidCronPhraseError } from "../errors"

const ROWS: readonly GrammarRow[] = GRAMMAR

describe("cron", () => {
  for (const row of ROWS) {
    if (!row.strict) continue

    it(`should convert ${JSON.stringify(row.phrase)} to "${row.cron}"`, () => {
      // The table types each phrase as `string`. The grammar table tests prove that each strict
      // row is a CronPhrase.
      expect(cron(row.phrase as CronPhrase)).toBe(row.cron)
    })
  }

  it("should use the lenient parser at runtime, the same as parse", () => {
    // Untyped JavaScript can pass any string.
    expect(cron("Every 15 Mins" as CronPhrase)).toBe("*/15 * * * *")
  })

  it("should throw InvalidCronPhraseError for an invalid phrase at runtime", () => {
    expect(() => cron("every 7 minutes" as CronPhrase)).toThrow(InvalidCronPhraseError)
    expect(() => cron("every 7 minutes" as CronPhrase)).toThrow("7 does not divide 60")
  })
})
