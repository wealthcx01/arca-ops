# arca-ops — ARCA's **Scale** surface

This is where ARCA's growth, analytics, operations and finance work lives. It is a normal git repo
worked by the Foundry lane on ARCA's venture box, under the same discipline as the product repo —
**one ticket = one branch = one PR**.

It is the *Scale* department declared in `ventures/arca.yaml` in the Foundry Studio. The studio
renders this queue on ARCA's board.

## How work gets done here

1. **A ticket lands in `docs/tickets/`** — filed by the founder through the studio composer, or by
   hand. `**Status:** Todo` is the signal that the lane may pick it up.
2. **The lane works it** — research (from `context/` and the venture brain) → plan → implement →
   review and test its own work → open a PR. A human merges.
3. **Reads are free; mutations gate.** Pulling numbers, building a dashboard, writing an analysis —
   ordinary work, done in a PR. Changing something outside the repo — moving money, altering a live
   system, touching a third-party account — is not.

## The gate

The Scale department's gate is `tbd-fb012`: the operational gate is still being specified (the
research that governs it is `docs/research-gtm.md` in the studio). Until it is, the lane treats any
ticket that would mutate something outside this repo as high-impact: it plans the work, writes the
plan for the founder to read, and stops. No PR, nothing performed.

The lane box holds no deploy or payment credentials at all, so this is structural rather than a
promise.

## Layout

| Path | What lives there |
| --- | --- |
| `docs/tickets/` | The work queue. One markdown file per ticket, in the house format. |
| `context/` | Durable background the lane should know: metric definitions, unit economics, tooling. |
| `library/` | Outputs and artefacts — analyses, models, dashboards, runbooks. |

Heavy binaries and large exports belong in object storage with a pointer here, not committed.

## Ticket format

```markdown
# SCALE-001 — A short, plain title

**Status:** Todo · **Owner:** lane

## Why this matters
One paragraph a non-technical founder would recognise as their own problem.

## Scope
- What to do, concretely.

## Acceptance criteria
- [ ] How we will know it is done.
```

`Status` is one of `Todo`, `Ready`, `In progress`, `Blocked`, `Shipped`, `Planned`. The lane only ever
picks up `Todo` and `Ready` — a `Planned` backlog is safe from it.
