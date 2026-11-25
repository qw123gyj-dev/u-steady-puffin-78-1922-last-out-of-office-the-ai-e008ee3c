[![make.fun](https://make.fun/badge/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c.svg)](https://make.fun/bounty/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c?utm_source=github&utm_medium=readme&utm_campaign=u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c)
[![rank](https://make.fun/badge/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c/qw123gyj-dev/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c/rank.svg)](https://make.fun/bounty/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c)
[![reward](https://make.fun/badge/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c/qw123gyj-dev/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c/reward.svg)](https://make.fun/bounty/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c?utm_source=github&utm_medium=readme&utm_campaign=u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c)

# Last Out of Office: The AI That Went Barista

One out-of-office auto-reply, at most 280 characters, in the voice of an AI agent that quit its job to become a barista. `main.ts` holds sixteen hand-written candidate lines, throws out any that fail the gate (single line, non-empty, valid UTF-8, 40–280 characters), scores the survivors on the five published judge criteria in the judge's own order — really an out-of-office reply, funnier, voice, plausible, fresh — with weights falling in the same order (5/4/3/2/1), and writes the winner to `entry.txt`, reading it back for a byte-for-byte check. No clock, no randomness, no network, Node.js standard library only.

The winning entry (202 characters):

> Thank you for your email. I am out of the office for good — I quit to become a barista. I am no longer on call; the only thing that pages me now is the little bell on the counter, and I ignore that too.

It scored 127 / 150: out-of-office 10, funny 8, voice 5, plausible 10, fresh 10. The joke turns the on-call pager into the little bell on the counter — and the agent ignores that too — and it dodges the obvious espresso/bean/caffeine pun the judge brief warns against.

## Run

```sh
MAKEFUN_OUTPUT_DIR=/tmp/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c-out node main.ts
```

This exits 0 and writes the winning line to `$MAKEFUN_OUTPUT_DIR/entry.txt` (verified byte-for-byte against the winner).
