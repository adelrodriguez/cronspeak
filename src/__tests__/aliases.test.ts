import { MS_PER_HOUR, MS_PER_MINUTE, safeParse } from "humanspan"
import { describe, expect, it } from "vitest"
import { safeParse as safeParseCron } from "../index"

// Every unit alias in the Humanspan unit table. An alias must never mean different units in the two
// packages.
const HUMANSPAN_ALIASES = [
  "years",
  "year",
  "yrs",
  "yr",
  "y",
  "months",
  "month",
  "mo",
  "weeks",
  "week",
  "w",
  "days",
  "day",
  "d",
  "hours",
  "hour",
  "hrs",
  "hr",
  "h",
  "minutes",
  "minute",
  "mins",
  "min",
  "m",
  "seconds",
  "second",
  "secs",
  "sec",
  "s",
  "milliseconds",
  "millisecond",
  "msecs",
  "msec",
  "ms",
]

describe("unit aliases", () => {
  for (const alias of HUMANSPAN_ALIASES) {
    it(`should give "${alias}" the same unit as Humanspan`, () => {
      const humanspan = safeParse(`2${alias}`)
      expect(humanspan).not.toBeNull()

      const cron = safeParseCron(`every 2 ${alias}`)
      const attached = safeParseCron(`every 2${alias}`)

      expect(cron === "*/2 * * * *").toBe(humanspan === 2 * MS_PER_MINUTE)
      expect(cron === "0 */2 * * *").toBe(humanspan === 2 * MS_PER_HOUR)
      expect(attached).toBe(cron)
    })
  }
})
