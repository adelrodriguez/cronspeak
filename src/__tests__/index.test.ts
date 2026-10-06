import fc from "fast-check"
import { describe, expect, it } from "vitest"
import type { GrammarRow } from "./fixtures/grammar"
import {
  cron,
  InvalidCronPhraseError,
  isCronPhrase,
  isValidCronPhrase,
  parse,
  safeParse,
} from "../index"
import { GRAMMAR } from "./fixtures/grammar"

// The table phrases are literal types. The runtime tests use them as `string`, the same as input
// from a config file.
const ROWS: readonly GrammarRow[] = GRAMMAR
const STRICT_PHRASES = ROWS.filter((row) => row.strict).map((row) => row.phrase)

describe("grammar table", () => {
  for (const row of ROWS) {
    describe(JSON.stringify(row.phrase), () => {
      if (row.lenient) {
        it(`should convert to "${row.cron}"`, () => {
          expect(parse(row.phrase)).toBe(row.cron)
          expect(safeParse(row.phrase)).toBe(row.cron)
          expect(isValidCronPhrase(row.phrase)).toBe(true)
        })
      } else {
        it("should be rejected with a reason", () => {
          expect(() => parse(row.phrase)).toThrow(InvalidCronPhraseError)
          expect(() => parse(row.phrase)).toThrow(row.error)
          expect(safeParse(row.phrase)).toBeNull()
          expect(isValidCronPhrase(row.phrase)).toBe(false)
        })
      }

      it(`should ${row.strict ? "" : "not "}be in the strict form`, () => {
        expect(isCronPhrase(row.phrase)).toBe(row.strict)
      })

      if (row.strict) {
        it(`should convert to "${row.cron}" with cron`, () => {
          const { phrase } = row
          if (!isCronPhrase(phrase)) throw new Error("expected a strict phrase")

          expect(cron(phrase)).toBe(row.cron)
        })
      }
    })
  }
})

describe("parse", () => {
  it("should store the input in the error", () => {
    let caught: unknown

    try {
      parse("every 7 minutes")
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(InvalidCronPhraseError)
    expect((caught as InvalidCronPhraseError).value).toBe("every 7 minutes")
    expect((caught as InvalidCronPhraseError).message).toBe(
      'Invalid cron phrase: 7 does not divide 60. Use 2, 3, 4, 5, 6, 10, 12, 15, 20, or 30. Received: "every 7 minutes"'
    )
  })

  it("should reject a value that is not a string", () => {
    for (const value of [undefined, null, 15, {}, ["every minute"]]) {
      // The values are not strings, the same as untyped input from JavaScript.
      const input = value as string

      expect(() => parse(input)).toThrow("the value is not a string")
      expect(safeParse(input)).toBeNull()
      expect(isValidCronPhrase(input)).toBe(false)
      expect(isCronPhrase(input)).toBe(false)
    }
  })
})

describe("InvalidCronPhraseError", () => {
  it("should be an Error with its own name", () => {
    const error = new InvalidCronPhraseError("every 7 minutes", "7 does not divide 60")

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe("InvalidCronPhraseError")
  })

  it("should include the reason and the quoted input in the message", () => {
    const error = new InvalidCronPhraseError("every 7 minutes", "7 does not divide 60")

    expect(error.message).toBe(
      'Invalid cron phrase: 7 does not divide 60. Received: "every 7 minutes"'
    )
  })

  it("should store any input value without a change", () => {
    fc.assert(
      fc.property(fc.anything(), (value) => {
        expect(new InvalidCronPhraseError(value, "reason").value).toBe(value)
      })
    )
  })
})

// Strings made of language words, so that the property tests also find valid phrases.
const WORDS = [
  "every",
  "minute",
  "minutes",
  "hour",
  "hours",
  "day",
  "at",
  "on",
  "the",
  "of",
  "month",
  "between",
  "and",
  "monday",
  "friday,",
  "weekday",
  "weekdays",
  "15",
  "2",
  "7",
  "1st",
  "9:30",
  "17:00",
  "noon",
  "hourly",
  "Mins",
  "MON",
]
const wordPhrase = fc
  .array(fc.constantFrom(...WORDS), { maxLength: 10, minLength: 1 })
  .chain((words) =>
    fc
      .array(fc.constantFrom(" ", " ", " ", "  ", "\t", ", "), {
        maxLength: words.length,
        minLength: words.length,
      })
      .map((spaces) =>
        words
          .map((word, index) => `${word}${spaces[index]}`)
          .join("")
          .trimEnd()
      )
  )
const anyPhrase = fc.oneof(
  fc.string(),
  wordPhrase,
  fc.constantFrom(...ROWS.map((row) => row.phrase))
)

describe("guard properties", () => {
  it("should agree with safeParse for arbitrary strings", () => {
    fc.assert(
      fc.property(anyPhrase, (value) => {
        expect(isValidCronPhrase(value)).toBe(safeParse(value) !== null)

        if (isCronPhrase(value)) {
          expect(isValidCronPhrase(value)).toBe(true)
        }
      }),
      { numRuns: 2000 }
    )
  })

  it("should never throw", () => {
    fc.assert(
      fc.property(fc.oneof(anyPhrase, fc.anything()), (value) => {
        const input = value as string

        expect(() => isCronPhrase(input)).not.toThrow()
        expect(() => isValidCronPhrase(input)).not.toThrow()
        expect(() => safeParse(input)).not.toThrow()
      })
    )
  })

  it("should throw only InvalidCronPhraseError from parse", () => {
    fc.assert(
      fc.property(anyPhrase, (value) => {
        try {
          parse(value)
        } catch (error) {
          expect(error).toBeInstanceOf(InvalidCronPhraseError)
        }
      })
    )
  })
})

function changeCase(text: string, upper: readonly boolean[]): string {
  return text
    .split("")
    .map((char, index) => (upper[index] ? char.toUpperCase() : char))
    .join("")
}

describe("normalization properties", () => {
  const whitespace = fc.constantFrom(" ", "  ", "\t", " \n ", " ")

  it("should give the same cron for any case and whitespace change of a strict phrase", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...STRICT_PHRASES),
        fc.array(fc.boolean(), { maxLength: 120, minLength: 120 }),
        fc.array(whitespace, { maxLength: 20, minLength: 20 }),
        fc.string({ maxLength: 3, unit: fc.constantFrom(" ", "\t", "\n") }),
        (phrase, upper, spaces, edge) => {
          const words = changeCase(phrase, upper).split(" ")
          const changed = `${edge}${words.map((word, index) => `${word}${spaces[index] ?? " "}`).join("")}${edge}`

          expect(safeParse(changed)).toBe(parse(phrase))
        }
      )
    )
  })
})
