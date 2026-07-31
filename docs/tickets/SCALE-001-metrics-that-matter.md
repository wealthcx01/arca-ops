# SCALE-001 — Define the handful of numbers ARCA is actually run on

**Status:** In progress · **Owner:** lane · **Gate:** tbd-fb012

## Why this matters
A dashboard with forty numbers on it tells you nothing. Before anything gets built here, the venture
needs an agreed short list: which numbers would change a decision, how each is defined precisely
enough that two people compute the same answer, and where the data for it actually comes from today.

## Scope
- Read the `arca` repo's analytics and data-model docs and establish what is *measurable now* versus
  what would need new instrumentation. Be explicit about which is which.
- Write `context/metrics.md` with, for each metric:
  - the plain-English question it answers,
  - the precise definition (numerator, denominator, window, exclusions),
  - the source of truth today, or "not instrumented",
  - what decision it would change. A metric that changes no decision does not belong on the list.
- Keep the list short. If it runs past about six, the ticket has not done its job.
- Call out where the numbers currently rest on **synthetic seed data** rather than real activity —
  a metric computed from fixtures is a metric that will mislead the founder the day it is trusted.

## Out of scope
Building a dashboard. Adding instrumentation. Changing anything in the product repo.

## Acceptance criteria
- [x] `context/metrics.md` exists with the four fields above for every metric listed.
- [x] Each metric names its source of truth, or says plainly that it is not instrumented.
- [x] Anything backed by synthetic data is labelled as such.
