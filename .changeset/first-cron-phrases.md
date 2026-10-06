---
"cronspeak": minor
---

Add the first version of the Cronspeak language. `cron` converts a cron phrase such as `"every 15 minutes on weekdays"` to a standard 5-field cron expression. An invalid phrase, or a phrase with no exact cron, is a type error that names the failed part. `parse` converts a `string` in the strict or lenient form and throws `InvalidCronPhraseError` for an invalid phrase, and `safeParse` returns `null` instead. `isCronPhrase` narrows a `string` to `CronPhrase`, and `isValidCronPhrase` checks the strict and lenient forms.
