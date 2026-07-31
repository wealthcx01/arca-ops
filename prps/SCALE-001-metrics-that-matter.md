# PRP — SCALE-001-metrics-that-matter

## Intent
The founder gets a single short document, `context/metrics.md`, naming the ~6 numbers that would
actually change an ARCA decision — each precisely defined, each honestly labelled with where its
data comes from today (real provider feed, derived-but-synthetic, or not instrumented).

## Context
- Product repo is `/opt/foundry/lane/arca` (this ops repo, `arca-ops`, holds tickets/context/library
  only — no product code to change).
- `arca/docs/analytics-continuation-prompt.md` and `arca/docs/analytics-implementation.md` are the
  existing analytics docs the ticket asks to read; they already flag the two open risks this metrics
  list must reflect: OHLC/analytics computed with no batching (ARCA-38), and the pipeline running on
  synthetic seed history (ARCA-27).
- `arca/scripts/seed-prices.ts` is the ground truth on what's synthetic: step 1 fetches **real**
  current prices from TCGdex (`fetchTcgdexCard`, real tcgplayer/cardmarket data); step 2
  (`persistAndGenerateHistory`) fabricates 30 days of price *history* via a Box-Muller random walk
  (`jitter()`); step 3 (`generateGradedPrices`) invents PSA/CGC/BGS graded prices from a random
  multiplier on the raw price (`source: "seed"`) — there is no real graded-sale data anywhere in the
  system.
- `arca/modules/analytics/card-analytics.ts` computes volatility (Parkinson), Sharpe, max drawdown,
  liquidity, trend, VWAP — all read from `card_ohlc_daily`, which today is built from the synthetic
  walk above. `arca/modules/analytics/arca-score.ts` composites momentum/value/liquidity/risk/scarcity
  from the same OHLC plus `popReports` (mostly empty — ARCA-28 "Automated pop-report ingestion" is
  still Planned, so scarcity defaults to a neutral 50).
- `arca/modules/analytics/grading-alpha.ts` computes ROI-of-grading purely from `gradedPrices`, which
  is 100% the fabricated multiplier from seed-prices.ts — the clearest synthetic-data case in the repo.
- `arca/modules/analytics/portfolio-analytics.ts` (`computePortfolioRisk`) weights real holdings ×
  real conflated current prices for value/HHI/top-5 concentration/currency exposure (these are real),
  but weighted volatility/Sharpe/drawdown inherit the OHLC-synthetic taint, and the weighting is
  "simple-weighted — not covariance-aware" per its own comment (matches ARCA-38's stated gap).
- `arca/modules/performance/calculator.ts` (`computeDailyPerformance`) uses real current prices ×
  real holdings for EOD value and daily P&L, but attributes 100% of P&L to price
  (`fx_pnl=0`, `transaction_pnl=0`, comment: "Simplified: attribute all to price for now") — matches
  the open ticket ARCA-23 "Full P&L attribution," and has no backfill (today-only).
- `arca/modules/analytics/market-index.ts` builds a market-cap index over whatever cards have OHLC —
  but `arca/docs/tickets/ARCA-024-market-coverage.md` confirms pricing today only refreshes held
  cards and the catalog seed is capped (~1,250 of ~19k cards), so the index covers a small, held-card-
  biased slice, not the market.
- `context/README.md` says one idea per file, named after the idea — `metrics.md` is a single file
  by the ticket's own instruction, which is the intended exception (it's the *list*, not a single idea).

## Approach
Pure research-and-write ticket — no product code touched (explicitly out of scope). Read the arca
analytics/data-model surface named above, shortlist ~6 candidate metrics that (a) map to a real
decision an ARCA user/founder makes and (b) already exist as a computed concept in the codebase or
are a plain aggregate of one, then write `context/metrics.md` in this repo with the four required
fields per metric. Files touched: `context/metrics.md` (new) only.

## Tasks
- [ ] Re-confirm the synthetic-vs-real boundary by re-reading seed-prices.ts, card-analytics.ts,
      grading-alpha.ts, portfolio-analytics.ts, performance/calculator.ts, market-index.ts in the
      arca repo (already reviewed in this research pass — verify nothing has since changed).
- [ ] Shortlist candidate metrics against the "changes a decision" test and cut anything that doesn't
      pass it (target: ~6, hard cap around 6).
- [ ] For each shortlisted metric, write the plain-English question, the precise definition
      (numerator/denominator/window/exclusions), the source of truth (named table/module/function) or
      "not instrumented", and the decision it changes.
- [ ] Explicitly label every metric whose current value depends on `seed-prices.ts` synthetic history
      or fabricated graded prices — do not let a synthetic-backed metric read as if it were live.
- [ ] Write `context/metrics.md` with the finalized list.
- [ ] Cross-check the finished list against the acceptance criteria line by line before calling it done.

## Validation gates
- [ ] happy path: `context/metrics.md` exists and contains a bounded list of metrics (around 6, not
      "every number the analytics engine produces"), each with all four fields — question, precise
      definition, source of truth, decision it changes — filled in, not left as a placeholder.
- [ ] edge cases: metrics that are partially real (e.g. portfolio concentration uses real prices but
      weighted volatility inherits synthetic OHLC; daily P&L uses real prices but has no FX/transaction
      split) are called out with that nuance rather than rounded to a flat "real" or "fake" label.
- [ ] errors: any metric considered but rejected for not changing a decision is left out of the file
      entirely (per the ticket's own rule) rather than included with a weak or missing "decision"
      field.
- [ ] coverage: every metric sourced from `card_ohlc_daily` / `gradedPrices` (i.e. anything downstream
      of `seed-prices.ts`'s random walk or fabricated grading multipliers) is labelled synthetic in the
      file, and the three acceptance criteria in the ticket are each verifiable by reading
      `context/metrics.md` directly — no external doc needed to confirm them.

<!-- foundry-ticket: 596de2d06613eb6d -->
