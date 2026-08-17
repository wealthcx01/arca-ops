# metrics.md — the numbers ARCA is actually run on

Six numbers, each mapped to a decision. Anything that didn't change a decision was left off,
not included with a weak justification. Compiled 2026-08-17 by re-reading the `arca` repo's
analytics modules and seed scripts directly (paths below); nothing here is inferred from the
docs alone.

Read this before trusting any of these on a dashboard: **every metric below that touches
`card_ohlc_daily` or `gradedPrices` is currently computed from fabricated data, not real market
history** (see "Real vs. synthetic today" on each). That's not a caveat to skim past — right now
none of the card-level analytics can be shown to a founder or user as if it reflects an actual
market.

---

## 1. Grading ROI ("grading alpha")

**Question:** Is it worth sending this specific raw card in for grading, or better to sell/hold it raw?

**Definition:** `alpha_bp = (graded_price_cents − raw_price_cents − grading_cost_cents) / raw_price_cents × 10,000`,
computed per (card, grading company, grade); the best (max) alpha across grades is stored as the
card's headline number. `raw_price_cents` is the conflated rank-1 USD price. `grading_cost_cents`
is a fixed "regular tier" cost per company (PSA $75 / CGC $50 / BGS $100) — express/bulk tiers are
not modeled. Point-in-time, not a time series. Excludes cards with no rank-1 USD price or no
graded-price row.

**Source of truth today:** `modules/analytics/grading-alpha.ts` (`computeGradingAlpha`,
`computeAllGradingAlpha`), reading `card_prices` and `graded_prices`, writing
`card_analytics.grading_alpha_bp`.

**Decision it changes:** submit-for-grading vs. sell-raw, for a specific card.

**Real vs. synthetic today:** 100% synthetic. `graded_prices.price_cents` is entirely fabricated
by `scripts/seed-prices.ts` (`generateGradedPrices`) — a random multiplier (0.85–1.15× a fixed
per-grade multiplier, e.g. PSA 10 = 3.5×) applied to the seeded raw price, stored with
`source: "seed"`. There is no real graded-sale data anywhere in the system yet. This is the
clearest case in the whole list: the number exists, but it cannot support a real grading decision
until a real graded-comp source lands.

---

## 2. Card risk-adjusted return (volatility + Sharpe)

**Question:** Is this specific card's price stable and rewarding enough, risk-adjusted, to buy or hold?

**Definition:** `volatility_e6` = annualized Parkinson estimator,
`sqrt(Σ ln(H/L)² / (4n·ln2)) × sqrt(365)`, over all available `card_ohlc_daily` bars for
(card, currency), ordered by date — no fixed lookback window, it uses whatever history exists
(today, ≤30 days). `sharpe_e6` = annualized total return over that same window ÷ volatility,
risk-free rate = 0. Bars with `high_cents` or `low_cents` ≤ 0 are excluded from the volatility
sum; Sharpe is 0 if fewer than 2 bars or volatility is 0.

**Source of truth today:** `modules/analytics/card-analytics.ts` (`parkinsonVolatility`,
`sharpeRatio`, `computeCardAnalytics`), reading `card_ohlc_daily`, writing
`card_analytics.volatility_e6` / `card_analytics.sharpe_e6`.

**Decision it changes:** add-to-portfolio or hold-vs-sell for a specific card, on a risk-adjusted basis.

**Real vs. synthetic today:** 100% synthetic. `card_ohlc_daily` is built from `price_history`,
and every daily value in `price_history` beyond "today" is a Box-Muller random walk
(`jitter()` in `scripts/seed-prices.ts`, `persistAndGenerateHistory`) seeded from a single real
spot price — not recorded historical trades. Every volatility/Sharpe figure in the system today
reflects fabricated day-to-day noise, not real price movement.

---

## 3. ARCA Score (composite 0–100 card rating)

**Question:** Which cards are worth shortlisting for the watchlist or a buy?

**Definition:** `score = momentum×0.25 + value×0.20 + liquidity×0.15 + risk-adjusted×0.25 + scarcity×0.15`,
each sub-score normalized 0–100. Momentum: ROC(30) blended with trend score. Value: position
within the trailing-365-day high/low range (V-shaped — best at 20–40% of range). Liquidity: data
availability + spread + provider-count. Risk-adjusted: normalized Sharpe (from metric 2). Scarcity:
exponential decay on `pop_reports.total_pop`, defaulting to a neutral 50 when a card has no
pop-report rows.

**Source of truth today:** `modules/analytics/arca-score.ts` (`computeArcaScore`,
`computeAllArcaScores`), reading `card_ohlc_daily`, `card_analytics`, `pop_reports`, writing
`card_analytics.arca_score`.

**Decision it changes:** which cards to prioritize for watchlist/acquisition research.

**Real vs. synthetic today:** mostly synthetic, plus one sub-component that's effectively **not
instrumented**. Four of five sub-scores (momentum, value, liquidity, risk-adjusted) trace back to
the same synthetic OHLC as metric 2. The fifth, scarcity (15% weight), has no real data feed —
ARCA-28 (automated PSA pop-report ingestion) is still Planned, `pop_reports` is populated for
essentially no cards, so scarcity silently defaults to neutral (50) for nearly every card rather
than reflecting real population data.

---

## 4. Daily portfolio P&L / EOD value

**Question:** Did my portfolio go up or down today, and by how much?

**Definition:** `mktvalue_eod_cents` = Σ over holdings of `quantity × latest card_prices.market_price_cents
(fallback mid_price_cents) × FX rate to base currency`. `pnl_cents = eod − prior day's eod`.
Single-day window; no historical backfill — the job only computes "today" each time it runs, so a
gap in running it is a gap in the series. A holding with no price row contributes 0, silently.

**Source of truth today:** `modules/performance/calculator.ts` (`computeDailyPerformance`),
reading `holdings`, `card_prices`, `fx_rates`, writing `daily_performance`.

**Decision it changes:** whether to intervene today — trim, add, or flag portfolio drift.

**Real vs. synthetic today:** partially real. Holdings and current spot prices
(`card_prices.market_price_cents`) are real — fetched live from TCGdex. But the P&L breakdown is
not: 100% of P&L is attributed to price (`price_pnl_cents = pnl_cents`), with `fx_pnl_cents` and
`transaction_pnl_cents` hardcoded to 0 regardless of actual FX moves or same-day trades (source
comment: "Simplified: attribute all to price for now" — open as ARCA-23). The headline number is
real; "why it moved" is not yet decomposed.

---

## 5. Portfolio concentration & risk snapshot

**Question:** Am I too concentrated in a handful of cards, and how risky is this portfolio overall?

**Definition:** `concentration_hhi_bp` = Σ (value-weight)² × 10,000. `top5_concentration_bp` =
top-5 holdings' value ÷ total value × 10,000. `weighted_volatility_e6` / `weighted_sharpe_e6` =
value-weighted average of each holding's card-level volatility/Sharpe (simple-weighted, not
covariance-aware — noted as such in the source). `max_drawdown_bp` = the single worst individual
holding's max drawdown, not a portfolio-level drawdown. Point-in-time, current holdings
(`quantity > 0`) only.

**Source of truth today:** `modules/analytics/portfolio-analytics.ts` (`computePortfolioRisk`),
reading `holdings`, `card_prices`, `card_analytics`; computed on request, not persisted.

**Decision it changes:** diversify (trim concentrated positions) vs. accept current concentration.

**Real vs. synthetic today:** mixed, and the two halves should not be flattened to one label.
Value, HHI, top-5 concentration, and currency exposure are real (real holdings × real current spot
prices). `weighted_volatility_e6`, `weighted_sharpe_e6`, and `max_drawdown_bp` are synthetic —
inherited unchanged from metric 2's OHLC-derived numbers. Trust the concentration figures today;
treat the weighted risk figures as illustrative only.

---

## 6. ARCA Market Index

**Question:** Is the Pokemon card market broadly up or down right now?

**Definition:** `index_value_e6` = 1,000,000 on day 1, then `base × (today's total market cap ÷
day-1 total market cap)`, where total market cap = Σ `close_cents` across all cards with an OHLC
row for that date. Also tracks avg/median price and top-10 concentration (top-10 cards' close-price
share, in bp).

**Source of truth today:** `modules/analytics/market-index.ts` (`computeMarketIndex`,
`backfillMarketIndex`), reading `card_ohlc_daily`, writing `market_index_daily`.

**Decision it changes:** whether/when to lean on market-timing language in founder or user-facing
messaging ("the market is up this month") — and, given the coverage gap below, whether to
prioritize widening card/price coverage (ARCA-24) before trusting this number for that at all.

**Real vs. synthetic today:** synthetic, and not representative even setting synthetic data aside.
Every input `close_cents` is the same synthetic OHLC as metric 2. On top of that, per
`ARCA-024-market-coverage.md`, pricing today only refreshes held cards and the catalog seed is
capped at ~1,250 of ~19k cards — so even with real OHLC, this index would track a small,
held-card-biased slice, not the market.
