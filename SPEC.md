# Cronspeak: a small English-like language that compiles to cron

## Problem Statement

A developer who schedules work with cron must write expressions such as `*/15 9-16 * * 1-5`. These expressions are hard to read and easy to get wrong. A reviewer cannot see quickly what the schedule does.

Natural-language-to-cron tools exist, but they try to parse free text. Free text is ambiguous ("biweekly", "at 9", "twice a day"). These tools guess, and sometimes they return a cron that does something different from the sentence. They also cannot give compile-time type safety, because free text has no fixed grammar.

Some schedules that look simple have no exact cron. For example, `*/7 * * * *` runs at :56 and then at :00, so one gap is 4 minutes, not 7. Most tools do not tell the developer about this.

The developer wants to write schedules as readable phrases, get an exact cron, and get an error (at compile time when possible) when a phrase is not valid or has no exact cron.

## Solution

Cronspeak is a zero-dependency TypeScript package. It is a sibling of Humanspan. It defines a **small, closed language** of English-like **cron phrases**, and it converts each valid phrase to exactly one standard 5-field cron expression.

- Cronspeak is not a free-text parser. The language has a fixed set of **sentence shapes** with a fixed clause order.
- Each valid phrase has exactly one meaning and maps to exactly one cron. The language contains only phrases that cron can express exactly ("exact or throw").
- A `CronPhrase` type checks string literals at compile time. Invalid phrases, and phrases with no exact cron (for example `"every 7 minutes"`), are type errors with readable messages.
- At runtime, `toCron` accepts the **strict form** and small, safe spelling variations (the **lenient form**). The lenient form makes phrases easier to type. It never adds new words or new sentence shapes.

Examples:

| Phrase                                    | Cron                                                  |
| ----------------------------------------- | ----------------------------------------------------- |
| `every 15 minutes`                        | `*/15 * * * *`                                        |
| `every 2 hours`                           | `0 */2 * * *`                                         |
| `hourly` / `daily` / `weekly` / `monthly` | `0 * * * *` / `0 0 * * *` / `0 0 * * 0` / `0 0 1 * *` |
| `every day at 9:30`                       | `30 9 * * *`                                          |
| `every weekday at 17:30`                  | `30 17 * * 1-5`                                       |
| `every monday and friday at 12:00`        | `0 12 * * 1,5`                                        |
| `on the 1st of every month at 8:00`       | `0 8 1 * *`                                           |
| `every 15 minutes on weekdays`            | `*/15 * * * 1-5`                                      |
| `every 7 minutes`                         | error: 7 does not divide 60                           |
| `every 90 minutes`                        | error: no exact single cron                           |

## User Stories

1. As a package consumer, I want to convert a cron phrase such as `"every 15 minutes"` to a cron expression, so that I can configure a scheduler with a schedule that I can read.
2. As a package consumer, I want the result to be a standard 5-field cron expression, so that it works with common schedulers.
3. As a package consumer, I want a type error when I write an invalid phrase as a string literal, so that I find mistakes before I run the code.
4. As a package consumer, I want a type error for `"every 7 minutes"`, so that I never ship a schedule with uneven gaps.
5. As a package consumer, I want type errors that explain the problem in words (for example "7 does not divide 60. Use 5, 6, 10, 12, 15, 20, or 30."), so that I can fix the phrase without reading the docs.
6. As a package consumer, I want my editor to autocomplete valid phrases where possible, so that I can discover the language while I type.
7. As a package consumer, I want `toCron` to throw a dedicated error class for invalid input, so that I can handle phrase errors separately from other errors.
8. As a package consumer, I want the error to store the invalid input in a `value` property, so that I can log or show it.
9. As a package consumer, I want the error message to say which part of the phrase failed, so that I can correct user input.
10. As a package consumer, I want a `safeToCron` function that returns `null` for invalid input, so that I can validate values without `try`/`catch`.
11. As a package consumer, I want an `isCronPhrase` guard, so that I can narrow a `string` from a config file or a form to the `CronPhrase` type.
12. As a package consumer, I want a guard for the lenient form, so that I can validate user input that uses safe variations.
13. As a package consumer, I want to write minute intervals that divide 60 (1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30), so that I can run frequent jobs.
14. As a package consumer, I want to write hour intervals that divide 24 (1, 2, 3, 4, 6, 8, 12), so that I can run periodic jobs during the day.
15. As a package consumer, I want `every minute` and `every hour` to be valid, so that I do not have to write `every 1 minute`.
16. As a package consumer, I want shortcuts (`hourly`, `daily`, `weekly`, `monthly`), so that common schedules are short.
17. As a package consumer, I want to run a job every day at a specific time (`every day at 9:30`), so that I can schedule daily tasks.
18. As a package consumer, I want to run a job on specific days of the week (`every monday and friday at 9:30`), so that I can schedule weekly tasks.
19. As a package consumer, I want `weekday` and `weekend` day groups, so that I do not have to list five or two days.
20. As a package consumer, I want to run a job on a specific day of the month (`on the 1st of every month at 8:00`), so that I can schedule monthly tasks.
21. As a package consumer, I want to restrict a minute interval to a window (`every 15 minutes between 9:00 and 17:00`), so that jobs run only in working hours.
22. As a package consumer, I want a window to stop at its end time and not continue to the end of that hour, so that the cron matches what the phrase says.
23. As a package consumer, I want to restrict an interval to days (`every 15 minutes on weekdays`), so that jobs do not run on weekends.
24. As a package consumer, I want times in 24-hour format (`17:30`), so that there is no AM/PM ambiguity.
25. As a package consumer, I want times with `am`/`pm` (`9:30am`) to be valid only when they are not ambiguous, so that I can write times the way I speak.
26. As a package consumer, I want `noon` and `midnight` as times, so that common times are easy to read.
27. As a package consumer, I want `at 9` without minutes and without am/pm to be invalid, so that the language never guesses between 09:00 and 21:00.
28. As a package consumer, I want ambiguous words such as `biweekly` and `twice a day` to be invalid, so that every valid phrase has one meaning.
29. As a package consumer, I want `toCron` to accept uppercase and Capitalized words at runtime, so that phrases from config files do not fail for case.
30. As a package consumer, I want `toCron` to accept extra whitespace at runtime, so that formatting differences do not cause errors.
31. As a package consumer, I want unit and day aliases (`min`, `mins`, `hr`, `mon`, `tue`) at runtime, so that short phrases are accepted.
32. As a package consumer, I want unit aliases to mean the same as in Humanspan (`m` = minutes, `mo` = months), so that the two libraries never disagree.
33. As a package consumer, I want the lenient form to never accept a new word or a new sentence shape, so that the language stays small and exact.
34. As a package consumer, I want each lenient phrase to normalize to exactly one strict phrase, so that the type and the runtime never disagree about meaning.
35. As a package consumer, I want days in a list to be in calendar order in the strict form (`monday and friday`), so that each schedule has one spelling.
36. As a package consumer, I want lists of days to use a fixed list format (`monday, wednesday and friday`), so that phrases are consistent.
37. As a package consumer, I want a clause conflict (for example a minute interval and `at 9:30`) to be impossible to write, so that I do not have to learn precedence rules.
38. As a package consumer, I want interval phrases to start at the beginning of the next cycle (:00, midnight), so that the phase of the schedule is predictable.
39. As a package consumer, I want the docs to say that schedules are exact in wall-clock time, not in elapsed time, so that I understand behavior on DST change days.
40. As a package consumer, I want the full grammar on one page of the README, so that I can learn the whole language quickly.
41. As a package consumer, I want each sentence shape in the README to have examples and the cron result, so that I can check my understanding.
42. As a package consumer, I want named exports with no runtime dependencies and no side effects, so that the package adds very little to my bundle.
43. As a package consumer, I want the package to work in Node 20 and later, so that it matches Humanspan support.
44. As a package consumer, I want an ESM-only package with types included, so that it works with modern TypeScript tooling.
45. As a package consumer, I want type checks to stay fast in a large project, so that my editor does not slow down.
46. As a package consumer, I want a `Weekday` type and other slot types exported, so that I can build phrases in my own typed helpers.
47. As a package maintainer, I want one grammar table that lists phrases, strict validity, lenient validity, and the expected cron, so that type tests and runtime tests read the same source of truth.
48. As a package maintainer, I want property tests that compare cron run times with the phrase, so that the "exact or throw" rule is proven, not assumed.
49. As a package maintainer, I want the "exact or throw" rule in an ADR, so that later contributors do not add approximate phrases.
50. As a package maintainer, I want a `GLOSSARY.md` with the domain terms, so that docs, code, and issues use the same words.
51. As a package maintainer, I want the same tooling as Humanspan (tsdown, Adamantite, Changesets, vitest, fast-check), so that both packages are maintained the same way.
52. As a package maintainer, I want to add a sentence shape only when a real use case needs it, so that type complexity stays low.

## Implementation Decisions

### Language

- **Closed language, not free text.** The language is a fixed set of sentence shapes. Each shape has a fixed clause order. Optional clauses are in brackets.

  | Shape            | Strict form                                                                               |
  | ---------------- | ----------------------------------------------------------------------------------------- |
  | Minute interval  | `every <N> minutes [between <time> and <time>] [on <day set>]` (`every minute` for N = 1) |
  | Hour interval    | `every <N> hours [on <day set>]` (`every hour` for N = 1)                                 |
  | Daily            | `every day at <time>`                                                                     |
  | Days of the week | `every <day set> at <time>`                                                               |
  | Day of the month | `on the <ordinal> of every month at <time>`                                               |
  | Shortcut         | `hourly`, `daily`, `weekly`, `monthly`                                                    |

- **Slot values.**
  - Minute interval N: divisors of 60 → 1, 2, 3, 4, 5, 6, 10, 12, 15, 20, 30.
  - Hour interval N: divisors of 24 → 1, 2, 3, 4, 6, 8, 12.
  - Time: `H:MM` or `HH:MM` in 24-hour format, `H:MMam`/`H:MMpm` in 12-hour format, `noon`, `midnight`. A bare hour (`9`) is not valid.
  - Day set: one day name, a list of day names in calendar order (Monday first), `weekday`/`weekdays`, `weekend`.
  - Ordinal: `1st` to `28th`. Days 29 to 31 are not in v1, because they do not occur in every month and the result would be a schedule that skips months without a warning.
- **Exact or throw.** The language contains only phrases whose set of run times is exactly one cron expression. Record this in an ADR.
- **Phase.** Intervals start at the beginning of the next larger cycle (minute intervals at :00 of each hour, hour intervals at 00:00 of each day). Record this in an ADR.
- **Windows.** In v1, window start and end times must be on an hour boundary, and the window is serialized as an hour range. The result must be exactly one cron. An inclusive end (a run at 17:00 but not at 17:15) needs two crons, so the end is exclusive or the phrase is invalid. The final wording of the window clause is an open item (see Further Notes).
- **Week start and day numbers.** Days are listed Monday first in phrases. Cron output uses 0 for Sunday. `weekly` means Sunday at 00:00, the same as the common `@weekly` cron macro.
- **Wall-clock time.** Schedules are exact in wall-clock time. Elapsed time between runs can change on DST change days. Time zones are not part of a phrase.

### Strict form and lenient form

- The **strict form** is the language that the `CronPhrase` type accepts: lowercase, single spaces, fixed clause order, days in calendar order, canonical words only.
- The **lenient form** is what the runtime accepts. The runtime is a **normalizer plus the strict parser**:
  1. Normalize: lowercase, collapse whitespace, trim, map each alias to its canonical word.
  2. Parse the normalized string with the same strict grammar.
- A variation is allowed only if it is a pure spelling change that maps to exactly one canonical word. `mins` → `minutes` and `mon` → `monday` are allowed. Words with no single meaning (`morning`, `biweekly`) are never allowed.
- Unit aliases match Humanspan's unit table, so that the same alias never means different units in the two packages. Cronspeak does not depend on Humanspan at runtime. The alias table is copied, and a test checks that it agrees with Humanspan.

### Public interface

- `toCron(phrase)` returns a standard 5-field cron string. It throws `InvalidCronPhraseError` for invalid input.
- `safeToCron(phrase)` returns the cron string or `null`. It never throws.
- `isCronPhrase(value)` is a type guard for the strict form. It never throws.
- `isValidCronPhrase(value)` returns `true` for any value that `toCron` accepts (strict or lenient form). It never throws.
- `InvalidCronPhraseError` stores the input in `value`. The message names the part of the phrase that failed.
- `CronPhrase` is the type of the strict form. Slot types (for example the day name and interval types) are also exported.
- Return type: `string` in v1. A literal result type (for example `"*/15 * * * *"` for `"every 15 minutes"`) is a stretch goal. Add it only if type-check performance stays acceptable.

### Type-level design

- Small closed slots (intervals, shortcuts, ordinals, day names, day sets) are union types. The 127 day sets in calendar order can come from a generation script or a recursive type. Choose the method that type-checks faster.
- Large regular slots (times) are checked by a validator generic: the public functions take a string literal type parameter, and a conditional type checks it. This avoids a large union for 1440 times in two formats.
- For invalid literals, the validator returns a string literal type that explains the error, so that the editor shows a readable message instead of a large union.
- When the input type is `string` (not a literal), the type accepts it. The runtime check and the guards protect these values.

### Internal modules

These modules are internal. Tests do not call them directly.

- **Normalizer.** Lenient input → strict input.
- **Grammar.** Strict input → a schedule model, or an error that names the failed part.
- **Schedule model.** One set of values for each cron field (minute, hour, day of month, month, day of week). This model separates the language from the output format, so that more dialects can be added later without changes to the grammar.
- **Serializer.** Schedule model → standard 5-field cron string (ranges `a-b`, lists `a,b`, steps `*/n`).

### Package

- Zero runtime dependencies, ESM only, `sideEffects: false`, Node 20 and later.
- Same tooling and layout conventions as Humanspan: tsdown, Adamantite, Changesets, vitest, fast-check, knip.
- `GLOSSARY.md` terms: cron phrase, sentence shape, clause, slot, strict form, lenient form, normalizer, schedule, cron field, interval, window, day set, phase, dialect, package consumer.
- ADRs: "exact or throw", "interval phase", "lenient form is normalization only".

## Testing Decisions

- **One test seam: the public package entry.** Tests import only the public exports. They do not test the normalizer, grammar, schedule model, or serializer directly. This lets the internal design change without changes to the tests.
- **A good test checks external behavior.** It gives a phrase and checks the cron, the error, the `null` result, the guard result, or the type. It does not check how the package got the result.
- **One grammar table is the source of truth.** Each row has a phrase, whether the strict type accepts it, whether the runtime accepts it, and the expected cron (or the expected error part). Both test kinds read this table:
  - Runtime tests check `toCron`, `safeToCron`, `isCronPhrase`, and `isValidCronPhrase` for each row.
  - Type-level tests (vitest `expectTypeOf` and `@ts-expect-error`) check that the type accepts and rejects the same strict rows.
- **Exactness property tests.** Generate valid phrases with fast-check. Compute the next run times of the result with `croner` (dev dependency only), and check that the run times match what the phrase says (gaps, window limits, days). This test proves the "exact or throw" rule.
- **Guard agreement property tests.** For arbitrary strings, `isValidCronPhrase(value)` equals `safeToCron(value) !== null`, and `isCronPhrase(value)` implies `isValidCronPhrase(value)`. Prior art: Humanspan's guard property tests ("should agree with safeParse for arbitrary strings").
- **Normalization property tests.** For each strict phrase, random case and whitespace changes give the same cron.
- **Alias agreement test.** The unit alias table agrees with Humanspan's unit table (Humanspan as a dev dependency).
- **Type-check performance check.** Measure type-check time with extended diagnostics on a file with many phrases. Fail CI if it goes above an agreed limit.
- **Package checks.** A build verification and a compatibility smoke test of the built package, the same as Humanspan's `build:verify` and `test:compat` scripts. An architecture test, the same as Humanspan's, checks the module layering.

## Out of Scope

- Free-text parsing or guessing of any kind.
- Cron → phrase (description). `cronstrue` already does this. A canonical describe function can come later.
- Results that need more than one cron (for example `every 90 minutes`).
- Time zones, and phrases that name a time zone.
- 6-field cron (seconds), Quartz, and other dialects. The schedule model allows them later.
- Dialect-only features: "last day of the month" (`L`), "first Monday of the month" (`1#1`).
- Days 29 to 31 of the month, intervals of days, intervals of weeks, and month and year intervals other than the shortcuts.
- Calculation of next run times at runtime. Use a scheduler or `croner` for this.
- Languages other than English.
- A runtime dependency on Humanspan.

## Further Notes

- Name: `cronspeak` is free on npm (checked 2026-10-05). The GitHub repo `adelrodriguez/cronspeak` does not exist yet. Check the domain before you publish.
- Open item: the exact window rule. `*/15 9-17 * * *` runs until 17:45, but "between 9:00 and 17:00" means it stops at 17:00. One cron can express "between 9:00 and 17:00" only if the end is excluded (`*/15 9-16 * * *`). Decide in the grammar table whether the end time is exclusive (simple, one cron) or the shape requires an exclusive word (for example `from 9:00 until 17:00`). Record the decision in an ADR.
- Open item: whether `weekly` means Sunday (cron `@weekly`) or Monday (ISO week). The spec uses Sunday to match cron.
- Theory behind the interval limits: a cron expression is a product of field sets. An interval of N units is a product set only if N divides the length of the next larger cycle. So the set of exact intervals is finite (about 25 values), and the type can describe it exactly.
- Union outputs could make more intervals exact later. Any interval that divides one day (for example 90 minutes) is a finite union of crons. This needs a list result type, which many schedulers do not accept, so it is not in v1.
