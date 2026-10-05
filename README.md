<div align="center">
  <h1 align="center">🗓️ <code>cronspeak</code></h1>

  <p align="center">
    <strong>A small, type-safe English-like language that compiles to exact cron expressions</strong>
  </p>
</div>

> [!WARNING]
> Cronspeak is in development. It has no public API yet. See [`SPEC.md`](./SPEC.md) for the planned design.

Cronspeak converts cron phrases such as `"every 15 minutes"` to cron expressions such as `"*/15 * * * *"`. It is not a free-text parser. It accepts a closed set of sentence shapes, and each valid cron phrase maps to exactly one cron expression.

## License

MIT
