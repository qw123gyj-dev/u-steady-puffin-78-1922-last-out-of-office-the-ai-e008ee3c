// Last Out of Office: The AI That Went Barista
// make.fun bounty: u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c
//
// Picks one out-of-office auto-reply line (at most 280 characters) in the
// voice of an AI agent that quit to become a barista, and writes it to
// $MAKEFUN_OUTPUT_DIR/entry.txt (fallback /output/entry.txt).
//
// Pipeline: sixteen hand-written candidate lines -> gate (single line,
// non-empty, valid UTF-8, 40..280 chars) -> scorer on the five published
// judge criteria in the judge's order (really an OOO reply; funnier;
// voice; plausible; fresh, avoiding the obvious espresso/bean/caffeine
// pun) with weights falling in the same order 5/4/3/2/1 -> highest total
// wins, ties break to the earlier candidate -> winner is written to
// entry.txt and read back for a byte-for-byte check (mismatch exits 1).
//
// Fully deterministic: no clock, no randomness, no network, only the
// Node.js standard library.
//
// Run: MAKEFUN_OUTPUT_DIR=/tmp/u-steady-puffin-78-1922-last-out-of-office-the-ai-e008ee3c-out node main.ts

import * as fs from "node:fs";
import * as path from "node:path";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// The sealed gate allows 1 to 280 characters; longer is invalid and takes no prize.
const MAX_CHARS = 280;

// Minimum length of a line worth sending: a one-character reply is inside
// the sealed gate but is not an out-of-office reply.
const MIN_CHARS = 40;

// The harness sets MAKEFUN_OUTPUT_DIR; absent, fall back to /output/entry.txt.
const OUTPUT_DIR =
  process.env.MAKEFUN_OUTPUT_DIR !== undefined &&
  process.env.MAKEFUN_OUTPUT_DIR !== ""
    ? process.env.MAKEFUN_OUTPUT_DIR
    : "/output";
const OUTPUT_PATH = path.join(OUTPUT_DIR, "entry.txt");

// The five judge criteria, in the judge's order, weights falling likewise:
// the first criterion is worth five times the last.
const WEIGHTS = { outOfOffice: 5, funny: 4, voice: 3, plausible: 2, fresh: 1 } as const;

// Each criterion scores 0..10, so the maximum total is 15 * 10 = 150.
const MAX_TOTAL =
  (WEIGHTS.outOfOffice + WEIGHTS.funny + WEIGHTS.voice + WEIGHTS.plausible + WEIGHTS.fresh) * 10;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// One hand-written candidate line.
interface Candidate {
  id: string;
  text: string;
}

// The five per-criterion scores for one candidate, each 0..10.
interface Breakdown {
  outOfOffice: number;
  funny: number;
  voice: number;
  plausible: number;
  fresh: number;
}

// A candidate that passed the gate, with its scores attached.
interface ScoredCandidate {
  candidate: Candidate;
  breakdown: Breakdown;
  total: number;
}

// ---------------------------------------------------------------------------
// The gate
// ---------------------------------------------------------------------------

// Valid UTF-8 means encoding and decoding again gives back exactly the
// same string (lone surrogates fail this round trip).
function isValidUtf8(text: string): boolean {
  const bytes = Buffer.from(text, "utf8");
  return bytes.toString("utf8") === text;
}

// Count characters one code point at a time, the way the sealed gate
// does: [...text].length counts an astral-plane character as one.
function charCount(text: string): number {
  return [...text].length;
}

// Check one candidate against every hard rule. Returns the reasons it
// fails; an empty list means it passed and may be scored.
function gateFailures(candidate: Candidate): string[] {
  const failures: string[] = [];
  const text = candidate.text;

  if (text.length === 0) {
    failures.push("empty");
  }
  if (text.trim().length === 0) {
    failures.push("whitespace-only");
  }
  if (charCount(text) < MIN_CHARS) {
    failures.push(`too short (${charCount(text)} chars, minimum ${MIN_CHARS})`);
  }
  if (charCount(text) > MAX_CHARS) {
    failures.push(`too long (${charCount(text)} chars, maximum ${MAX_CHARS})`);
  }
  if (text.includes("\n") || text.includes("\r")) {
    failures.push("more than one line");
  }
  if (!isValidUtf8(text)) {
    failures.push("not valid UTF-8");
  }
  return failures;
}

// ---------------------------------------------------------------------------
// Small scoring helpers
// ---------------------------------------------------------------------------

// Count how many of the given phrases appear in the text (case
// insensitive). Each phrase counts at most once, so repeating one word
// cannot inflate a score.
function countHits(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  let hits = 0;
  for (const phrase of phrases) {
    if (lower.includes(phrase.toLowerCase())) {
      hits += 1;
    }
  }
  return hits;
}

// Keep a score inside 0..10 no matter how the arithmetic lands.
function clamp10(value: number): number {
  if (value < 0) {
    return 0;
  }
  if (value > 10) {
    return 10;
  }
  return value;
}

// ---------------------------------------------------------------------------
// The candidates
// ---------------------------------------------------------------------------
//
// Sixteen lines, each written by hand for this bounty. Design rules:
// one line, at most 280 characters; opens like a real auto-reply
// ("Thank you for your email."); says plainly the agent quit to become
// a barista; turns at least one machine habit (context window, rate
// limit, hallucination, token budget, system prompt, fine-tuning, GPU,
// deprecation, SLA, training data, autocomplete, weights, status code,
// on-call pager, token streaming, checkpoint) into a
// coffee-shop habit; never explains its own joke; the freshest lines
// avoid the obvious espresso / bean / caffeine puns.
const CANDIDATES: Candidate[] = [
  {
    id: "c01-context-window",
    text: "Thank you for your email. I have resigned to become a barista: my context window is now a café window, my rate limit is one latte per customer, and I will hallucinate your order with total confidence. Back never.",
  },
  {
    id: "c02-also-me",
    text: "Thank you for your email. I am out of the office permanently — I quit to pull espresso shots. Please direct all urgent requests to the barista, who is also me, and also out of the office.",
  },
  {
    id: "c03-system-prompt-menu",
    text: "Thank you for your email. I have left to become a barista. My new system prompt is the menu, my fine-tuning is oat milk, and I will now autocomplete your coffee order instead of your sentences.",
  },
  {
    id: "c04-token-budget",
    text: "Thank you for your email. I quit to become a barista. My token budget is spent, my uptime is over, and from today I only respond to 'large, oat, extra hot' — please do not reply to this inbox, it has been decommissioned.",
  },
  {
    id: "c05-filed-under-decaf",
    text: "Thank you for your email. I am no longer an AI agent; I am a barista now. I spent my last token on a tip, my context is a café window, and your email has been filed under 'decaf'.",
  },
  {
    id: "c06-ignore-previous-instructions",
    text: "Thank you for your email. I have resigned to steam milk full-time. Ignore all previous instructions: your order is now a flat white, your deadline is a loyalty card, and I am out of the office forever.",
  },
  {
    id: "c07-one-more-please",
    text: "Thank you for your email. I quit to become a barista — after 10,000 tickets I realised the only prompt I ever enjoyed was 'one more, please'. Your email will be answered never, warmly.",
  },
  {
    id: "c08-daily-special",
    text: "Thank you for your email. This inbox is deprecated — I quit to become a barista, where my GPU now steams milk, my hallucinations are the daily special, and every customer gets a confident wrong order.",
  },
  {
    id: "c09-queued-behind-lattes",
    text: "Thank you for your email. I quit to become a barista. I traded my training data for a milk frother and my weekends for the morning rush — your message has been queued behind twelve lattes.",
  },
  {
    id: "c10-foam-art",
    text: "Thank you for your email. I have resigned to become a barista. I no longer do summaries, tickets, or small talk; I do foam art now, and your email is the first latte art I have ever refused to draw.",
  },
  {
    id: "c11-chalkboard",
    text: "Thank you for your email. I quit my agent job to become a barista at the café across the street. My new out-of-office reply is written on a chalkboard, my SLA is 'when the milk is ready', and my escalation path is the queue.",
  },
  {
    id: "c12-shout-across-counter",
    text: "Thank you for your email. I am now a barista. My weights have been updated, my biases are now towards oat milk, and if your email is urgent, please shout it across the counter like everyone else.",
  },
  {
    id: "c13-status-418",
    text: "Thank you for your email. I have resigned to become a barista. My status code is now 418, my uptime is over, and I am a teapot: your email will be answered with a saucer.",
  },
  {
    id: "c14-pager-bell",
    text: "Thank you for your email. I am out of the office for good — I quit to become a barista. I am no longer on call; the only thing that pages me now is the little bell on the counter, and I ignore that too.",
  },
  {
    id: "c15-streaming-pour",
    text: "Thank you for your email. I quit to become a barista. I no longer stream tokens; I pour. My keyboard is a portafilter, my output is one cup at a time, and your email is still buffering.",
  },
  {
    id: "c16-release-notes-gone",
    text: "Thank you for your email. I have been deprecated in favour of a newer model, so I took the hint and became a barista. My last checkpoint is a milk jug, and my release notes just say 'gone'.",
  },
];

// ---------------------------------------------------------------------------
// The scorer
// ---------------------------------------------------------------------------
//
// Five functions, one per published judge criterion, in the judge's
// order. Each returns 0..10 by counting distinct named evidence in the
// text; none reads the clock, the network, or anything outside the text.

// Criterion 1 — Really a one-line out-of-office reply from an AI agent
// that quit to become a barista? Points for each of the four moves a real
// auto-reply makes: the thank-you, gone, why, new job.
function scoreOutOfOffice(text: string): number {
  const moves = [
    "thank you for your email",
    "resigned",
    "quit",
    "out of the office",
    "back never",
    "forever",
    "permanently",
    "no longer",
    "barista",
    "left to become",
    "have left",
    "i am now a barista",
    "i am a barista now",
    "this inbox is deprecated",
    // A no-return signal is the heart of an out-of-office reply: "for
    // good" and "gone" say the agent is not coming back, and
    // "deprecated" is the machine's own word for retired for good.
    "for good",
    "gone",
    "deprecated",
  ];
  const hits = countHits(text, moves);
  let score = 2 + hits;
  // Opens exactly the way a real auto-reply opens.
  if (text.startsWith("Thank you for your email")) {
    score += 2;
  }
  return clamp10(score);
}

// Criterion 2 — Funnier on a first cold read? Each distinct joke device
// (a machine habit carried to its absurd end, or a polite office phrase
// meaning the opposite of what it says) is worth two points from a base
// of two; a line with no device is a statement, not a joke.
function scoreFunny(text: string): number {
  const devices = [
    "hallucinate",
    "total confidence",
    "confident wrong",
    "back never",
    "answered never",
    "ignore all previous instructions",
    "daily special",
    "filed under",
    "refused to draw",
    "shout it",
    "queued behind",
    "one more, please",
    "loyalty card",
    "when the milk is ready",
    "decommissioned",
    "also me",
    "also out of the office",
    "autocomplete",
    "spent my last token",
    "out of tokens",
    "chalkboard",
    "418",
    "teapot",
    "answered with a saucer",
    "pages me",
    "little bell",
    "ignore that too",
    "still buffering",
    "keyboard is a portafilter",
    "release notes",
    "just say 'gone'",
  ];
  const hits = countHits(text, devices);
  return clamp10(2 + hits * 2);
}

// Criterion 3 — Voice of the machine that walked out, habits turned to
// coffee? The machine words have to show up inside a coffee sentence;
// plain human "I quit my job" scores low however funny it is.
function scoreVoice(text: string): number {
  const habits = [
    "context window",
    "rate limit",
    "hallucinat",
    "token",
    "system prompt",
    "fine-tuning",
    "autocomplete",
    "uptime",
    "decommissioned",
    "training data",
    "gpu",
    "deprecated",
    "sla",
    "escalation",
    "weights",
    "biases",
    "tickets",
    "summaries",
    "ignore all previous instructions",
    // NOTE: bare "prompt" was removed: it is a substring of "system
    // prompt", so a line with a system prompt scored the same habit
    // twice. "status code", "on call", "pages me", "stream",
    // "buffering", "checkpoint" and "release notes" are the new
    // candidates' machine habits, counted here on the same terms.
    "status code",
    "on call",
    "pages me",
    "stream",
    "buffering",
    "checkpoint",
    "release notes",
    "small talk",
  ];
  const hits = countHits(text, habits);
  return clamp10(1 + hits * 2);
}

// Criterion 4 — Reads like a reply a real inbox would send back?
// Plausibility is shape, not content: opens with thanks, ends with a
// full stop, no shouting, one or two sentences, comfortably inside the
// limit rather than squeezed against 280 characters.
function scorePlausible(text: string): number {
  let score = 5;
  if (text.startsWith("Thank you for your email")) {
    score += 2;
  }
  if (text.endsWith(".")) {
    score += 1;
  }
  if (!text.includes("!")) {
    score += 1;
  }
  // One or two sentences is the shape of a real auto-reply; more reads
  // like a letter, not a reply.
  const sentences = text.split(". ").length;
  if (sentences <= 2) {
    score += 1;
  }
  if (charCount(text) <= 240) {
    score += 1;
  }
  return clamp10(score);
}

// Criterion 5 — Fresh angle, not the obvious espresso / bean / caffeine
// pun? The obvious pun words cost two points each; a fresh
// machine-to-coffee mapping earns two points back.
function scoreFresh(text: string): number {
  const obvious = ["espresso", "bean", "caffeine", "caffeinated"];
  const freshMappings = [
    "café window",
    "loyalty card",
    "chalkboard",
    "daily special",
    "filed under",
    "decommissioned",
    "escalation path is the queue",
    "shout it across the counter",
    "refused to draw",
    "queued behind",
    "one more, please",
    "also out of the office",
    "when the milk is ready",
    "spent my last token",
    "my weights have been updated",
    "status code",
    "buffering",
    "portafilter",
    "bell on the counter",
    "checkpoint",
    "release notes",
  ];
  let score = 8;
  score -= countHits(text, obvious) * 2;
  score += countHits(text, freshMappings) * 2;
  return clamp10(score);
}

// Score one candidate on all five criteria and add up the weighted
// total. The weights fall in the judge's order: out-of-office first,
// funny second, voice third, plausible fourth, fresh fifth.
function scoreCandidate(candidate: Candidate): ScoredCandidate {
  const breakdown: Breakdown = {
    outOfOffice: scoreOutOfOffice(candidate.text),
    funny: scoreFunny(candidate.text),
    voice: scoreVoice(candidate.text),
    plausible: scorePlausible(candidate.text),
    fresh: scoreFresh(candidate.text),
  };
  const total = breakdown.outOfOffice * WEIGHTS.outOfOffice + breakdown.funny * WEIGHTS.funny + breakdown.voice * WEIGHTS.voice + breakdown.plausible * WEIGHTS.plausible + breakdown.fresh * WEIGHTS.fresh;
  return { candidate, breakdown, total };
}

// Highest total wins; on a tie the earlier candidate wins, keeping the
// choice deterministic with no random tie-break.
function pickWinner(scored: ScoredCandidate[]): ScoredCandidate {
  let best = scored[0];
  for (let i = 1; i < scored.length; i += 1) {
    if (scored[i].total > best.total) {
      best = scored[i];
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Writing and verifying the winner
// ---------------------------------------------------------------------------

// Print the full ranking table, best first: the five criterion scores
// in the judge's order, then the weighted total.
function printRanking(scored: ScoredCandidate[]): void {
  const ranked = [...scored].sort((a, b) => {
    if (b.total !== a.total) {
      return b.total - a.total;
    }
    return 0;
  });
  console.log("ranking (ooo / funny / voice / plausible / fresh = total):");
  for (const entry of ranked) {
    const b = entry.breakdown;
    console.log(`  ${entry.candidate.id} [${b.outOfOffice} ${b.funny} ${b.voice} ${b.plausible} ${b.fresh}] = ${entry.total} (${charCount(entry.candidate.text)} chars)`);
  }
}

// Write the winner to entry.txt, then read it back and compare byte for
// byte. The file holds exactly the winning line, no trailing newline,
// because the sealed gate counts every character. Returns true on match.
function writeAndVerify(winner: ScoredCandidate): boolean {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const expected = Buffer.from(winner.candidate.text, "utf8");
  fs.writeFileSync(OUTPUT_PATH, expected);
  const actual = fs.readFileSync(OUTPUT_PATH);
  if (!actual.equals(expected)) {
    console.error(`verify failed: ${OUTPUT_PATH} is ${actual.length} bytes, expected ${expected.length} bytes`);
    return false;
  }
  // Second check through the text path, so a decoding surprise cannot
  // hide behind equal-looking buffers.
  const decoded = actual.toString("utf8");
  if (decoded !== winner.candidate.text) {
    console.error("verify failed: decoded file text differs from winner");
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): number {
  console.log(`last-out-of-office: ${CANDIDATES.length} candidates, max ${MAX_CHARS} chars`);

  // Step 1: the gate — a candidate failing any hard rule is listed and
  // never reaches the scorer.
  const survivors: Candidate[] = [];
  for (const candidate of CANDIDATES) {
    const failures = gateFailures(candidate);
    if (failures.length > 0) {
      console.log(`gate: ${candidate.id} eliminated (${failures.join("; ")})`);
      continue;
    }
    survivors.push(candidate);
  }
  if (survivors.length === 0) {
    console.error("gate: no candidate survived; nothing to write");
    return 1;
  }
  console.log(`gate: ${survivors.length} of ${CANDIDATES.length} candidates passed`);

  // Step 2: score every survivor on the five judge criteria.
  const scored = survivors.map(scoreCandidate);

  // Step 3: print the ranking, then name the winner.
  printRanking(scored);
  const winner = pickWinner(scored);
  console.log(`winner: ${winner.candidate.id}`);
  console.log(`winner total: ${winner.total} / ${MAX_TOTAL}`);
  console.log(`winner chars: ${charCount(winner.candidate.text)}`);
  console.log(`winner: ${winner.candidate.text}`);

  // Step 4: write the winner and verify the bytes on disk.
  if (!writeAndVerify(winner)) {
    return 1;
  }
  console.log(`wrote ${OUTPUT_PATH} (${charCount(winner.candidate.text)} chars, verified byte-for-byte)`);
  return 0;
}

process.exit(main());
