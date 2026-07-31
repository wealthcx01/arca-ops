# metrics.md — the numbers ARCA is actually run on

Short list only. A metric that doesn't change a decision isn't here (per ticket rule), and anything
that reads on real activity today vs. `scripts/seed-prices.ts` synthetic history is labelled
explicitly.

---

## 1. Portfolio value (EOD, base currency)

**Question:** What is a user's portfolio worth right now, in their base currency?

**Definition:** `sum(holdings.quantity × latest cardPrices.market_price_cents × fx_rate) `, converted
to `baseCurrency`. Computed daily as `mktvalue_eod_cents` in `computeDailyPerformance`
(`arca/modules/performance/calculator.ts`). Window: point-in-time (today's latest price per card, no
smoothing). Exclusions: holdings with `quantity <= 0`; cards with no price row contribute 0.

**Source of truth today:** REAL. `cardPrices.market_price_cents` (conflated rank 1) comes from live
TCGdex fetches (`fetchTcgdexCard`, step 1 of `seed-prices.ts`) — real tcgplayer/cardmarket prices.
`holdings` quantities are real. Table: `daily_performance` / live query in `calculator.ts`.

**Decision it changes:** Whether a user's portfolio is worth showing/trusting on login, and whether
the founder can credibly say "here's what your collection is worth" to a prospect.

---

## 2. Daily P&L (partial — price-only)

**Question:** How much did a user's portfolio gain or lose today?

**Definition:** `EOD value − BOD value` in base currency, stored as `pnl_cents`
(`daily_performance` table, `computeDailyPerformance`). Window: one trading day (calendar day, BOD =
prior day's stored EOD). Exclusions: currently **100% of P&L is attributed to price** — the code sets
`fx_pnl_cents = 0` and `transaction_pnl_cents = 0` unconditionally (comment in
`arca/modules/performance/calculator.ts`: "Simplified: attribute all to price for now"). There is no
FX or transaction-driven P&L split, and no backfill — only today's date is computed on each run.

**Source of truth today:** REAL prices/holdings feed the number, but the **decomposition is fake**:
any FX move or buy/sell that happened today is silently folded into "price P&L." This is the "partially
real" nuance the ticket asks to preserve — don't round this to a flat real/fake label. Matches the open
gap tracked as ARCA-23 (full P&L attribution).

**Decision it changes:** Whether "up/down today" shown to a user is trustworthy enough to alert on, or
whether the founder should caveat it (or suppress FX-heavy portfolios) until attribution is built.

---

## 3. Portfolio concentration (HHI / top-5 %)

**Question:** Is a user dangerously concentrated in a small number of cards?

**Definition:** Herfindahl-Hirschman Index over position weights:
`sum((position_value / total_value)^2)`, stored as `concentration_hhi_bp`, plus
`top5_concentration_bp` = value of the 5 largest positions ÷ total value. Computed in
`computePortfolioRisk` (`arca/modules/analytics/portfolio-analytics.ts`). Window: current holdings
snapshot. Exclusions: `quantity <= 0` rows excluded upstream in the SQL.

**Source of truth today:** REAL. Both position value (`quantity × conflated market_price_cents`) and
the weighting are computed from real holdings and real current prices — this metric does not touch
`card_ohlc_daily` or graded prices at all.

**Decision it changes:** Whether to nudge a user to diversify, and whether the founder can flag
concentration risk in an advisory conversation.

---

## 4. Card volatility & Sharpe (Parkinson vol, Sharpe ratio) — SYNTHETIC

**Question:** How risky is holding this specific card, and is its historical return good for that risk?

**Definition:** Parkinson volatility `σ = sqrt(Σ ln(H/L)² / (4n·ln2))`, annualized ×√365, stored as
`volatility_e6`; Sharpe = annualized return ÷ volatility (risk-free = 0), stored as `sharpe_e6`. Both
computed in `arca/modules/analytics/card-analytics.ts` (`parkinsonVolatility`, `sharpeRatio`) from
`card_ohlc_daily` bars. Window: full available OHLC history per card/currency (no fixed lookback cap
in the query).

**Source of truth today: SYNTHETIC.** `card_ohlc_daily` is built from `persistAndGenerateHistory` in
`scripts/seed-prices.ts`, which fabricates 30 days of price history via a Box-Muller random-walk
`jitter()` around the one real current price — there is no real historical trading data. Every
downstream number here (and the `weighted_volatility_e6`/`weighted_sharpe_e6` rolled into portfolio
risk in `portfolio-analytics.ts`) inherits this fabrication. See ARCA-27 (synthetic seed history).

**Decision it changes:** Whether to warn a user off a volatile card, or feature a "high Sharpe" card as
an opportunity — **not safe to act on until real OHLC replaces the random walk.**

---

## 5. Grading alpha (ROI of grading a raw card) — SYNTHETIC

**Question:** Is it worth paying to grade this raw card — does the graded price beat raw price plus
grading cost?

**Definition:** `alpha_bp = ((graded_price_cents − raw_price_cents − grading_cost_cents) / raw_price_cents) × 10,000`,
per grading company/grade, best value stored as `grading_alpha_bp` on `card_analytics`. Computed in
`computeGradingAlpha` (`arca/modules/analytics/grading-alpha.ts`). `raw_price_cents` = conflated rank-1
USD price (real); `grading_cost_cents` = fixed table (PSA $75 / CGC $50 / BGS $100, "regular" tier).
Window: point-in-time (latest raw price vs. current graded price row, no history).

**Source of truth today: 100% SYNTHETIC on the graded side.** `gradedPrices.price_cents` is entirely
fabricated by `generateGradedPrices` in `seed-prices.ts` — a random multiplier applied to the raw
price, stamped `source: "seed"`. There is no real PSA/CGC/BGS graded-sale data anywhere in the system.
Only the raw-price input is real.

**Decision it changes:** Whether to recommend a user send a card for grading — the single highest-
stakes "act on this number" metric in the list, and currently the **least trustworthy**: do not surface
this as advice until real graded comps replace the fabricated multiplier.

---

## 6. Market coverage (% of catalog with a live price)

**Question:** How much of the real card universe does ARCA actually have current pricing for?

**Definition:** `count(distinct cards with a fetched cardPrices row) / count(all cards in catalog)`.
Not currently computed as a stored field anywhere — would be a simple aggregate over `cards` and
`cardPrices`.

**Source of truth today: NOT INSTRUMENTED as a metric**, but the inputs are real and known: pricing
only refreshes held cards (`getHeldCardRefs`), and the catalog seed itself is capped at 5 pages
(~1,250 of ~19k cards) per `arca/docs/tickets/ARCA-024-market-coverage.md`. `market-index.ts`
(`computeMarketIndex`/`backfillMarketIndex`) builds a market-cap index over whatever has OHLC, but that
is consequently a small, held-card-biased slice — not market coverage.

**Decision it changes:** Whether the founder can claim ARCA prices "the market" vs. "cards our users
happen to hold" — governs any public claim about catalog breadth, and whether ARCA-24 should be
prioritized before that claim is made.
