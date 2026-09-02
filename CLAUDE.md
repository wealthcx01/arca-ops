# ARCA — Scale

The venture's operations surface: infrastructure, runbooks, and paid growth once it is connected.

This repository is worked by its own agent lane on the venture box. Git is the record: work
arrives as tickets in `docs/tickets/`, one ticket to a branch to a pull request.

## How work here is done

Two rules, set by Bruntsfield across every venture. They exist because both were learned expensively,
and neither is the kind of thing a test can catch.

### 1. Look at the screen before saying it works

**Any change that touches a screen is not verified until the screen has been rendered in a browser,
at desktop (1440×1000) and phone (393×851) size, and looked at as a picture.** Where there is a
design to compare against, render that too and put them side by side. Record each page's height in
the pull request.

Why this is a rule rather than a habit: on the Foundry Studio, thirty pieces of work shipped with
every automated check green — types, 1,459 unit tests, 250 browser tests — while the founder's main
screen was **9,908 pixels tall against a design of 1,900**, half of it finished work nobody needed to
see, and another screen was printing the same sentence twenty times. The tests asserted that every
section was present, in the right order, with correct data. All of that was true. The screen was
unusable anyway.

A screen can be entirely correct and completely unusable. Only looking finds that.

Take the screenshot, then actually look at it. Height is a cheap signal that a screen shows more than
it was meant to; the picture tells you what the problem is.

### 2. Write for the founder

**Simple, clear, detailed, direct English.** This covers tickets, pull request descriptions, commit
messages, code comments, and every word this venture puts in front of the person who owns it.

The founder reads these. They are not required to be technical. So:

- Short sentences.
- The plain word rather than the clever one.
- Say what happened, then what it means, then what to do. In that order.
- Name the thing instead of gesturing at it.
- Detailed is not the opposite of simple. The founder needs specifics; they need them in words they
  already know.

What this forbids: unexplained jargon, a table where a sentence would do, density that saves the
writer's time at the reader's expense, and burying the answer at the end.
