import { useState, useEffect, useGrokTheme } from "grok/canvas";
import type { CSSProperties, GrokTheme } from "grok/canvas";

type Mode = "add" | "sub" | "missing" | "place" | "compare" | "skip" | "story";
type Slot = "hat" | "face" | "neck" | "hold";
type Screen = "home" | "dress" | "play";
type QKind = "number" | "choice";

type Part = {
  prompt: string;
  speak: string;
  answer: number | string;
  kind: QKind;
  choices: Array<number | string>;
  hint1: string;
  hint2: string;
  done: string;
};

type Visual = { label: string; tens: number; ones: number; showCounts: boolean };

type Q = {
  mode: Mode;
  prompt: string;
  parts: Part[];
  helpParts: Part[];
  visuals: Visual[];
  reveal: number;
  board: number;
  guided: boolean;
};

type Levels = { [K in Mode]: number };

type Save = {
  stars: number;
  hat: string;
  face: string;
  neck: string;
  hold: string;
  unlocked: string[];
  levels: Levels;
  mastered: Mode[];
};

type Item = { id: string; slot: Slot; name: string; cost: number };

const SAVE_KEY = "capy-math-adventure-v1";
const MODES: Mode[] = ["add", "sub", "missing", "place", "compare", "skip", "story"];
const SLOTS: Slot[] = ["hat", "face", "neck", "hold"];

const ITEMS: Item[] = [
  { id: "flower", slot: "hat", name: "Flower", cost: 5 },
  { id: "party", slot: "hat", name: "Party hat", cost: 10 },
  { id: "princess", slot: "hat", name: "Princess crown", cost: 15 },
  { id: "cowboy", slot: "hat", name: "Cowboy hat", cost: 20 },
  { id: "wizard", slot: "hat", name: "Wizard hat", cost: 25 },
  { id: "chef", slot: "hat", name: "Chef hat", cost: 30 },
  { id: "rainbow", slot: "hat", name: "Rainbow bow", cost: 40 },
  { id: "crown", slot: "hat", name: "Golden crown", cost: 50 },
  { id: "sunglasses", slot: "face", name: "Sunglasses", cost: 60 },
  { id: "bowtie", slot: "neck", name: "Bow tie", cost: 70 },
  { id: "balloon", slot: "hold", name: "Balloon", cost: 80 },
  { id: "hearts", slot: "face", name: "Heart glasses", cost: 90 },
  { id: "scarf", slot: "neck", name: "Cozy scarf", cost: 100 },
  { id: "icecream", slot: "hold", name: "Ice cream cone", cost: 110 },
  { id: "mustache", slot: "face", name: "Silly mustache", cost: 120 },
  { id: "pearls", slot: "neck", name: "Pearl necklace", cost: 130 },
  { id: "umbrella", slot: "hold", name: "Tiny umbrella", cost: 135 },
  { id: "wand", slot: "hold", name: "Magic wand", cost: 140 },
  { id: "cape", slot: "neck", name: "Superhero cape", cost: 150 },
];

const SLOT_META: { [K in Slot]: { title: string; emoji: string } } = {
  hat: { title: "Hats", emoji: "🎩" },
  face: { title: "Face", emoji: "😎" },
  neck: { title: "Neck", emoji: "🎀" },
  hold: { title: "Hold", emoji: "🎈" },
};

const MODE_META: {
  [K in Mode]: { title: string; blurb: string; emoji: string };
} = {
  add: { title: "Pond Picnic", emoji: "➕", blurb: "Add, and split big sums into long boats and little capys." },
  sub: { title: "Swim Away", emoji: "➖", blurb: "Take away to find how many are left." },
  missing: { title: "Hidden Snack", emoji: "❓", blurb: "Find the missing number in a fact." },
  place: { title: "Ten Boats", emoji: "🧱", blurb: "Build and split numbers: tens (long boats) and ones (little capys)." },
  compare: { title: "Bigger Capy", emoji: "⚖️", blurb: "Which is bigger? Use <, =, or >." },
  skip: { title: "Hop Path", emoji: "🦘", blurb: "Skip count and find what comes next." },
  story: { title: "Capy Stories", emoji: "📖", blurb: "Solve a short capybara word problem." },
};

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr: Array<number | string>): Array<number | string> {
  const c = arr.slice();
  for (let i = c.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = c[i];
    c[i] = c[j];
    c[j] = t;
  }
  return c;
}

function findItem(id: string): Item | null {
  for (let i = 0; i < ITEMS.length; i++) if (ITEMS[i].id === id) return ITEMS[i];
  return null;
}

function itemName(id: string): string {
  const it = findItem(id);
  return it ? it.name : "";
}

function isMode(s: string): s is Mode {
  return MODES.indexOf(s as Mode) >= 0;
}

function defaultLevels(): Levels {
  return { add: 1, sub: 1, missing: 1, place: 1, compare: 1, skip: 1, story: 1 };
}

function defaultSave(): Save {
  return {
    stars: 0,
    hat: "none",
    face: "none",
    neck: "none",
    hold: "none",
    unlocked: ["none"],
    levels: defaultLevels(),
    mastered: [],
  };
}

function clampLevel(n: number): number {
  if (n < 1) return 1;
  if (n > 6) return 6;
  return Math.floor(n);
}

function unlockedFor(stars: number): string[] {
  const out: string[] = ["none"];
  for (let i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].cost <= stars) out.push(ITEMS[i].id);
  }
  return out;
}

function slotPick(v: unknown, slot: Slot, unlocked: string[]): string {
  if (typeof v !== "string") return "none";
  const it = findItem(v);
  if (!it || it.slot !== slot) return "none";
  if (unlocked.indexOf(v) < 0) return "none";
  return v;
}

function parseSave(raw: string): Save {
  const base = defaultSave();
  try {
    const v = JSON.parse(raw) as {
      stars?: unknown;
      hat?: unknown;
      face?: unknown;
      neck?: unknown;
      hold?: unknown;
      unlocked?: unknown;
      levels?: unknown;
      mastered?: unknown;
    };
    if (!v || typeof v !== "object") return defaultSave();
    if (typeof v.stars === "number" && isFinite(v.stars) && v.stars >= 0) {
      base.stars = Math.floor(v.stars);
    }
    if (Array.isArray(v.unlocked)) {
      const u: string[] = ["none"];
      for (let i = 0; i < v.unlocked.length; i++) {
        const item = v.unlocked[i];
        if (typeof item === "string" && findItem(item) && u.indexOf(item) < 0) u.push(item);
      }
      base.unlocked = u;
    }
    const earned = unlockedFor(base.stars);
    for (let i = 0; i < earned.length; i++) {
      if (base.unlocked.indexOf(earned[i]) < 0) base.unlocked.push(earned[i]);
    }
    base.hat = slotPick(v.hat, "hat", base.unlocked);
    base.face = slotPick(v.face, "face", base.unlocked);
    base.neck = slotPick(v.neck, "neck", base.unlocked);
    base.hold = slotPick(v.hold, "hold", base.unlocked);
    if (v.levels && typeof v.levels === "object") {
      const lv = v.levels as { [k: string]: unknown };
      const next = defaultLevels();
      for (let i = 0; i < MODES.length; i++) {
        const m = MODES[i];
        const n = lv[m];
        if (typeof n === "number" && isFinite(n)) next[m] = clampLevel(n);
      }
      base.levels = next;
    }
    if (Array.isArray(v.mastered)) {
      const md: Mode[] = [];
      for (let i = 0; i < v.mastered.length; i++) {
        const item = v.mastered[i];
        if (typeof item === "string" && isMode(item) && md.indexOf(item) < 0) md.push(item);
      }
      base.mastered = md;
    }
  } catch (e) {
    return defaultSave();
  }
  return base;
}

function storage(): { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void } | null {
  try {
    const w = window as unknown as {
      localStorage?: { getItem: (k: string) => string | null; setItem: (k: string, v: string) => void };
    };
    if (!w.localStorage) return null;
    return w.localStorage;
  } catch (e) {
    return null;
  }
}

function loadSave(): Save {
  try {
    const s = storage();
    if (!s) return defaultSave();
    const raw = s.getItem(SAVE_KEY);
    if (!raw) return defaultSave();
    return parseSave(raw);
  } catch (e) {
    return defaultSave();
  }
}

function writeSave(data: Save): void {
  try {
    const s = storage();
    if (!s) return;
    s.setItem(SAVE_KEY, JSON.stringify(data));
  } catch (e) {
    /* storage unavailable */
  }
}

function say(text: string): void {
  try {
    const w = window as unknown as { speechSynthesis?: SpeechSynthesis };
    if (!w.speechSynthesis) return;
    w.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9;
    u.pitch = 1.15;
    w.speechSynthesis.speak(u);
  } catch (e) {
    /* no voice available */
  }
}

function nearbyChoices(answer: number, lo: number, hi: number): Array<number | string> {
  const set: number[] = [answer];
  let guard = 0;
  while (set.length < 4 && guard < 40) {
    guard += 1;
    const n = answer + rand(-8, 8);
    if (n >= lo && n <= hi && set.indexOf(n) < 0) set.push(n);
  }
  let fill = lo;
  while (set.length < 4 && fill <= hi) {
    if (set.indexOf(fill) < 0) set.push(fill);
    fill += 1;
  }
  return shuffle(set);
}

function pickChoices(answer: number, likely: number[], lo: number, hi: number): Array<number | string> {
  const set: number[] = [answer];
  const pool = shuffle(likely.slice());
  for (let i = 0; i < pool.length && set.length < 4; i++) {
    const n = pool[i] as number;
    if (n >= lo && n <= hi && set.indexOf(n) < 0) set.push(n);
  }
  const rest = nearbyChoices(answer, lo, hi);
  for (let i = 0; i < rest.length && set.length < 4; i++) {
    const n = rest[i] as number;
    if (set.indexOf(n) < 0) set.push(n);
  }
  return shuffle(set);
}

function addPair(level: number, wantRegroup: boolean): { a: number; b: number } {
  if (level <= 1) {
    const a = rand(1, 9);
    const b = rand(1, Math.max(1, 10 - a));
    return { a, b };
  }
  if (level <= 2) {
    const a = rand(2, 18);
    const b = rand(1, Math.max(1, 20 - a));
    return { a, b };
  }
  const aOnes = wantRegroup ? rand(1, 9) : rand(0, 8);
  const bOnes = wantRegroup ? rand(10 - aOnes, 9) : rand(0, 9 - aOnes);
  const maxTens = level >= 6 ? 9 : level >= 5 ? 8 : 6;
  const aTens = rand(1, maxTens);
  const bTens = rand(level >= 4 ? 1 : 0, Math.max(0, maxTens - aTens));
  return { a: aTens * 10 + aOnes, b: bTens * 10 + bOnes };
}

function subPair(level: number): { a: number; b: number } {
  if (level <= 1) {
    const a = rand(2, 10);
    return { a, b: rand(1, a - 1) };
  }
  if (level <= 2) {
    const a = rand(6, 20);
    return { a, b: rand(1, a - 1) };
  }
  const wantRegroup = level >= 5;
  const aOnes = wantRegroup ? rand(0, 8) : rand(1, 9);
  const bOnes = wantRegroup ? rand(aOnes + 1, 9) : rand(0, aOnes);
  const aTens = rand(level >= 6 ? 3 : 2, level >= 6 ? 9 : 7);
  const bTens = rand(1, aTens - 1);
  return { a: aTens * 10 + aOnes, b: bTens * 10 + bOnes };
}

function mkPart(
  prompt: string,
  speak: string,
  answer: number | string,
  kind: QKind,
  choices: Array<number | string>,
  hint1: string,
  hint2: string,
  done?: string,
): Part {
  return { prompt, speak, answer, kind, choices, hint1, hint2, done: done ? done : "" };
}

function oneQ(mode: Mode, part: Part): Q {
  return { mode, prompt: part.prompt, parts: [part], helpParts: [], visuals: [], reveal: 0, board: -1, guided: false };
}

function boatsWord(n: number): string {
  return n + (n === 1 ? " long boat" : " long boats");
}

function capysWord(n: number): string {
  return n + (n === 1 ? " little capy" : " little capys");
}

function describe(n: number): string {
  return n + " has " + boatsWord(Math.floor(n / 10)) + " and " + capysWord(n % 10) + ".";
}

function vis(n: number, showCounts: boolean): Visual {
  return { label: String(n), tens: Math.floor(n / 10), ones: n % 10, showCounts };
}

/* ---------- Pond Picnic (add) ---------- */

function splitParts(a: number, b: number, kind: QKind): Part[] {
  const ta = Math.floor(a / 10) * 10;
  const tb = Math.floor(b / 10) * 10;
  const oa = a % 10;
  const ob = b % 10;
  const tens = ta + tb;
  const ones = oa + ob;
  const total = a + b;
  const big = Math.max(oa, ob);
  const small = Math.min(oa, ob);
  const onesHint2 =
    ones >= 10 && big < 10
      ? "Make a ten first: " + big + " needs " + (10 - big) + " more to make 10."
      : "Start at " + big + " and count on " + small + ".";
  const p1 = mkPart(
    "Step 1 · Add the long boats (tens): " + ta + " + " + tb + " = ?",
    "Step 1. Add the long boats. What is " + ta + " plus " + tb + "?",
    tens,
    kind,
    pickChoices(tens, [tens + 10, tens - 10, tens + 20, ta / 10 + tb / 10], 0, 99),
    "Add just the long boats: " + boatsWord(ta / 10) + " and " + boatsWord(tb / 10) + ".",
    "Each long boat is 10. Count the long boats by tens: 10, 20, 30…",
    "Long boats (tens): " + ta + " + " + tb + " = " + tens,
  );
  const p2 = mkPart(
    "Step 2 · Add the little capys (ones): " + oa + " + " + ob + " = ?",
    "Step 2. Add the little capys. What is " + oa + " plus " + ob + "?",
    ones,
    kind,
    pickChoices(ones, [ones + 1, ones - 1, ones + 2, ones + 10], 0, 19),
    "Add just the little capys: " + oa + " and " + ob + ".",
    onesHint2,
    "Little capys (ones): " + oa + " + " + ob + " = " + ones,
  );
  const p3hint1 =
    ones >= 10
      ? ones + " is 10 and " + (ones - 10) + ". Add the 10 to " + tens + " first, then count on " + (ones - 10) + "."
      : "Start at " + tens + " and count on " + ones + ".";
  const p3 = mkPart(
    "Step 3 · Put them together: " + tens + " + " + ones + " = ?",
    "Step 3. Put them together. What is " + tens + " plus " + ones + "?",
    total,
    kind,
    pickChoices(total, [total + 10, total - 10, total + 1, total - 1], 0, 99),
    p3hint1,
    "Count on from " + tens + " one little capy at a time.",
    "Together: " + tens + " + " + ones + " = " + total,
  );
  return [p1, p2, p3];
}

function makeAdd(level: number, streak: number): Q {
  if (level <= 2) {
    const pair = addPair(level, false);
    const answer = pair.a + pair.b;
    return oneQ(
      "add",
      mkPart(
        pair.a + " + " + pair.b + " = ?",
        "What is " + pair.a + " plus " + pair.b + "?",
        answer,
        "choice",
        nearbyChoices(answer, 0, 20),
        "Start at " + Math.max(pair.a, pair.b) + " and count on " + Math.min(pair.a, pair.b) + " more.",
        level <= 1 ? "Hold up fingers for each number, then count them all." : "Make a ten first, then add what is left.",
      ),
    );
  }
  if (level === 3) {
    const ta = rand(1, 8);
    const tb = rand(1, 9 - ta);
    const a = ta * 10;
    const b = tb * 10;
    const answer = a + b;
    const q = oneQ(
      "add",
      mkPart(
        a + " + " + b + " = ?",
        "What is " + a + " plus " + b + "?",
        answer,
        "choice",
        pickChoices(answer, [answer + 10, answer - 10, ta + tb, answer + 20], 0, 99),
        boatsWord(ta) + " and " + boatsWord(tb) + " make how many long boats?",
        "Each long boat is 10. Count all the long boats by tens: 10, 20, 30…",
      ),
    );
    q.visuals = [vis(a, true), vis(b, true)];
    return q;
  }
  const carry = level >= 6 && rand(0, 2) > 0;
  let a = 0;
  let b = 0;
  if (carry) {
    const oa = rand(1, 9);
    const ob = rand(10 - oa, 9);
    const ta = rand(1, 7);
    const tb = rand(1, 8 - ta);
    a = ta * 10 + oa;
    b = tb * 10 + ob;
  } else {
    const ta = rand(1, 8);
    const tb = rand(1, 9 - ta);
    let oa = rand(0, 9);
    let ob = rand(0, 9 - oa);
    if (oa === 0 && ob === 0) {
      oa = rand(1, 8);
      ob = rand(1, 9 - oa);
    }
    a = ta * 10 + oa;
    b = tb * 10 + ob;
  }
  const total = a + b;
  const kind: QKind = level <= 4 ? "choice" : "number";
  const steps = splitParts(a, b, kind);
  const guided = level <= 4 || streak === 0;
  const prompt = a + " + " + b + " = ?";
  const q: Q = {
    mode: "add",
    prompt,
    parts: steps,
    helpParts: [],
    visuals: [vis(a, true), vis(b, true)],
    reveal: 0,
    board: -1,
    guided,
  };
  if (!guided) {
    q.parts = [
      mkPart(
        prompt,
        "What is " + a + " plus " + b + "?",
        total,
        kind,
        pickChoices(total, [total + 10, total - 10, total + 1], 0, 99),
        "Split it! Add the long boats (tens) first, then the little capys (ones). Tap ✂️ Split it for steps.",
        "Long boats: " + Math.floor(a / 10) * 10 + " + " + Math.floor(b / 10) * 10 + ". Little capys: " + (a % 10) + " + " + (b % 10) + ". Then put them together.",
      ),
    ];
    q.helpParts = steps;
    q.reveal = 1;
  }
  return q;
}

/* ---------- Ten Boats (place) ---------- */

function buildChoices(t: number, o: number): Array<number | string> {
  const n = t * 10 + o;
  return pickChoices(n, [o * 10 + t, n + 10, n - 10, n + 1, n - 1], 0, 99);
}

function digitChoices(ans: number, other: number): Array<number | string> {
  return pickChoices(ans, [other, ans + 1, ans - 1, ans + 2], 0, 9);
}

function makePlace(level: number): Q {
  const r = rand(1, 100);
  let flavor = "build";
  if (level === 2) flavor = r <= 50 ? "build" : "split";
  else if (level === 3) flavor = r <= 35 ? "build" : "split";
  else if (level === 4) flavor = r <= 25 ? "build" : r <= 65 ? "split" : "pair";
  else if (level === 5) flavor = r <= 20 ? "build" : r <= 55 ? "split" : "pair";
  else if (level >= 6) flavor = r <= 15 ? "build" : r <= 40 ? "split" : r <= 75 ? "pair" : "digit";

  if (flavor === "build") {
    const t = rand(level <= 1 ? 0 : 1, level <= 1 ? 5 : 9);
    const o = rand(0, 9);
    const n = t * 10 + o;
    const prompt =
      "Capy stacked " + t + " tens (long boats) and " + o + " ones (little capys). What number is that?";
    const q = oneQ(
      "place",
      mkPart(
        prompt,
        "Capy stacked " + boatsWord(t) + " and " + capysWord(o) + ". What number is that?",
        n,
        level <= 2 ? "choice" : "number",
        buildChoices(t, o),
        t === 0
          ? "There are no long boats, so just count the little capys."
          : "Each long boat is 10. Count the long boats by tens: 10, 20, 30…",
        "After the long boats, count on the little capys one at a time.",
      ),
    );
    q.visuals = [{ label: "", tens: t, ones: o, showCounts: true }];
    return q;
  }

  if (flavor === "split") {
    const t = rand(1, 9);
    const o = rand(0, 9);
    const n = t * 10 + o;
    const kind: QKind = "choice";
    const p1 = mkPart(
      "How many tens (long boats) are in " + n + "?",
      "How many long boats, the tens, are in " + n + "?",
      t,
      kind,
      digitChoices(t, o),
      "Count the long boats in the picture. Each long boat is 10.",
      "In a two-digit number, the first digit counts the long boats (tens).",
      n + " has " + t + " tens (" + boatsWord(t) + ")",
    );
    const p2 = mkPart(
      "How many ones (little capys) are in " + n + "?",
      "How many little capys, the ones, are in " + n + "?",
      o,
      kind,
      digitChoices(o, t),
      "Count the little capys in the picture. Each little capy is 1.",
      "In a two-digit number, the last digit counts the little capys (ones).",
      n + " has " + o + " ones (" + capysWord(o) + ")",
    );
    return {
      mode: "place",
      prompt: "Split " + n + " into tens (long boats) and ones (little capys).",
      parts: [p1, p2],
      helpParts: [],
      visuals: [{ label: String(n), tens: t, ones: o, showCounts: false }],
      reveal: level >= 5 ? 1 : 0,
      board: -1,
      guided: true,
    };
  }

  if (flavor === "pair") {
    const t = rand(1, 9);
    const o = rand(1, 9);
    const n = t * 10 + o;
    const answer = t * 10 + " + " + o;
    const cands: string[] = [
      t + " + " + o,
      o * 10 + " + " + t,
      t * 10 + " + " + o * 10,
      (t >= 9 ? t * 10 - 10 : t * 10 + 10) + " + " + o,
      t * 10 + " + " + (o >= 9 ? o - 1 : o + 1),
    ];
    const set: Array<number | string> = [answer];
    for (let i = 0; i < cands.length && set.length < 4; i++) {
      const c = cands[i];
      const sum = c.split(" + ").reduce((acc, s) => acc + parseInt(s, 10), 0);
      if (sum !== n && set.indexOf(c) < 0) set.push(c);
    }
    const q = oneQ(
      "place",
      mkPart(
        n + " = ? + ?  Which pair makes " + n + "?",
        "Which two numbers make " + n + "? The tens, long boats, plus the ones, little capys.",
        answer,
        "choice",
        shuffle(set),
        "Split it: the long boats (tens) make one number and the little capys (ones) make the other.",
        n + " has " + boatsWord(t) + ". How much are " + boatsWord(t) + " worth? Each is 10.",
      ),
    );
    q.prompt = n + " = ? + ?";
    q.parts[0].prompt = "Which pair makes " + n + "? (tens + ones)";
    q.visuals = [{ label: String(n), tens: t, ones: o, showCounts: false }];
    q.reveal = level >= 5 ? 1 : 0;
    return q;
  }

  const t = rand(1, 9);
  const o = rand(0, 9);
  const n = t * 10 + o;
  const askTens = rand(0, 9) < 7;
  const q = oneQ(
    "place",
    mkPart(
      askTens
        ? "What digit is in the tens place of " + n + "? (The tens place counts the long boats.)"
        : "What digit is in the ones place of " + n + "? (The ones place counts the little capys.)",
      askTens
        ? "What digit is in the tens place of " + n + "? The tens place counts the long boats."
        : "What digit is in the ones place of " + n + "? The ones place counts the little capys.",
      askTens ? t : o,
      "choice",
      askTens ? digitChoices(t, o) : digitChoices(o, t),
      askTens ? "The tens place is the first digit. It counts the long boats." : "The ones place is the last digit. It counts the little capys.",
      askTens ? "Look at the long boats under the number. How many are there?" : "Look at the little capys under the number. How many are there?",
    ),
  );
  q.board = n;
  return q;
}

/* ---------- Bigger Capy (compare) ---------- */

function twoDistinctDigits(lo: number, hi: number): { x: number; y: number } {
  const x = rand(lo, hi);
  let y = rand(lo, hi);
  while (y === x) y = rand(lo, hi);
  return { x, y };
}

function comparePair(level: number): { a: number; b: number } {
  const r = rand(1, 100);
  if (level <= 1) {
    if (r <= 15) {
      const a = rand(0, 20);
      return { a, b: a };
    }
    const a = rand(0, 20);
    let b = rand(0, 20);
    while (b === a) b = rand(0, 20);
    return { a, b };
  }
  if (level === 2) {
    if (r <= 10) {
      const a = rand(10, 59);
      return { a, b: a };
    }
    if (r <= 25) {
      const d = twoDistinctDigits(1, 5);
      return { a: d.x * 10 + d.y, b: d.y * 10 + d.x };
    }
    if (r <= 60) {
      const t = rand(1, 5);
      const d = twoDistinctDigits(0, 9);
      return { a: t * 10 + d.x, b: t * 10 + d.y };
    }
    const a = rand(10, 59);
    let b = rand(10, 59);
    while (b === a) b = rand(10, 59);
    return { a, b };
  }
  if (r <= 10) {
    const a = rand(10, 99);
    return { a, b: a };
  }
  if (r <= 45) {
    const d = twoDistinctDigits(1, 9);
    return { a: d.x * 10 + d.y, b: d.y * 10 + d.x };
  }
  if (r <= 75) {
    const t = rand(1, 9);
    const d = twoDistinctDigits(0, 9);
    return { a: t * 10 + d.x, b: t * 10 + d.y };
  }
  if (level >= 4) {
    const t = rand(1, 8);
    const a = t * 10 + rand(6, 9);
    const b = (t + 1) * 10 + rand(0, 3);
    return rand(0, 1) === 0 ? { a, b } : { a: b, b: a };
  }
  const a = rand(10, 99);
  let b = rand(10, 99);
  while (b === a) b = rand(10, 99);
  return { a, b };
}

function biggestTriple(): number[] {
  if (rand(0, 1) === 0) {
    const d = twoDistinctDigits(1, 9);
    let z = rand(0, 9);
    while (z === d.y) z = rand(0, 9);
    return [d.x * 10 + d.y, d.y * 10 + d.x, d.x * 10 + z];
  }
  const t = rand(1, 9);
  const o1 = rand(0, 9);
  let o2 = rand(0, 9);
  while (o2 === o1) o2 = rand(0, 9);
  let o3 = rand(0, 9);
  while (o3 === o1 || o3 === o2) o3 = rand(0, 9);
  const third = rand(0, 1) === 0 ? t * 10 + o3 : (t === 1 ? 2 : t - 1) * 10 + o3;
  const out = [t * 10 + o1, t * 10 + o2, third];
  if (out[2] === out[0] || out[2] === out[1]) out[2] = t * 10 + o3;
  return out;
}

function makeCompare(level: number): Q {
  const biggestChance = level >= 6 ? 40 : level >= 5 ? 30 : 0;
  if (rand(1, 100) <= biggestChance) {
    const nums = biggestTriple();
    const order = shuffle(nums) as number[];
    const answer = Math.max(nums[0], nums[1], nums[2]);
    const q = oneQ(
      "compare",
      mkPart(
        "Tap the biggest number.",
        "Tap the biggest number: " + order[0] + ", " + order[1] + ", or " + order[2] + ".",
        answer,
        "choice",
        order,
        "Compare the long boats (tens) first. The most long boats wins.",
        describe(order[0]) + " " + describe(order[1]) + " " + describe(order[2]) + " If the long boats tie, compare the little capys.",
      ),
    );
    q.visuals = [vis(order[0], true), vis(order[1], true), vis(order[2], true)];
    q.reveal = 2;
    return q;
  }
  const p = comparePair(level);
  const a = p.a;
  const b = p.b;
  const answer = a < b ? "<" : a > b ? ">" : "=";
  const ta = Math.floor(a / 10);
  const tb = Math.floor(b / 10);
  const hint2 =
    ta === tb
      ? "Both have " + boatsWord(ta) + ", so compare the little capys (ones): " + a + " has " + (a % 10) + " and " + b + " has " + (b % 10) + "."
      : a + " has " + boatsWord(ta) + ". " + b + " has " + boatsWord(tb) + ".";
  const q = oneQ(
    "compare",
    mkPart(
      a + "  ?  " + b,
      "Which sign goes between " + a + " and " + b + "? Less than, equal, or greater than.",
      answer,
      "choice",
      ["<", "=", ">"],
      "Compare the long boats (tens) first.",
      hint2,
    ),
  );
  q.visuals = [vis(a, true), vis(b, true)];
  q.reveal = 2;
  return q;
}

/* ---------- other paths (unchanged logic) ---------- */

function makeSub(level: number): Q {
  const pair = subPair(level);
  const answer = pair.a - pair.b;
  return oneQ(
    "sub",
    mkPart(
      pair.a + " − " + pair.b + " = ?",
      "What is " + pair.a + " minus " + pair.b + "?",
      answer,
      level <= 2 ? "choice" : "number",
      nearbyChoices(answer, 0, 200),
      "Start at " + pair.a + " and count back " + pair.b + ".",
      "Think of the related addition fact: " + pair.b + " + ? = " + pair.a + ".",
    ),
  );
}

function makeMissing(level: number): Q {
  const useSub = level >= 4 && rand(0, 1) === 1;
  const kind: QKind = level <= 2 ? "choice" : "number";
  let prompt = "";
  let speak = "";
  let answer = 0;
  let hint1 = "";
  let hint2 = "";
  if (useSub) {
    const pair = subPair(Math.max(1, level - 1));
    const missingLeft = rand(0, 1) === 0;
    if (missingLeft) {
      prompt = "? − " + pair.b + " = " + (pair.a - pair.b);
      speak = "What number minus " + pair.b + " equals " + (pair.a - pair.b) + "?";
      answer = pair.a;
      hint1 = "This is a take-away fact. The starting number is the whole.";
      hint2 = "Add " + pair.b + " and " + (pair.a - pair.b) + " to find the starting number.";
    } else {
      prompt = pair.a + " − ? = " + (pair.a - pair.b);
      speak = pair.a + " minus what number equals " + (pair.a - pair.b) + "?";
      answer = pair.b;
      hint1 = "How many did we take away to get from " + pair.a + " to " + (pair.a - pair.b) + "?";
      hint2 = "Count back from " + pair.a + " until you reach " + (pair.a - pair.b) + ".";
    }
  } else {
    const pair = addPair(Math.max(1, level - 1), level >= 5);
    const missingFirst = rand(0, 1) === 0;
    const sum = pair.a + pair.b;
    if (missingFirst) {
      prompt = "? + " + pair.b + " = " + sum;
      speak = "What number plus " + pair.b + " equals " + sum + "?";
      answer = pair.a;
      hint1 = "What number plus " + pair.b + " makes " + sum + "?";
      hint2 = "Think: " + sum + " minus " + pair.b + " is the missing number.";
    } else {
      prompt = pair.a + " + ? = " + sum;
      speak = pair.a + " plus what number equals " + sum + "?";
      answer = pair.b;
      hint1 = "What do you add to " + pair.a + " to make " + sum + "?";
      hint2 = "Think: " + sum + " minus " + pair.a + " is the missing number.";
    }
  }
  return oneQ("missing", mkPart(prompt, speak, answer, kind, nearbyChoices(answer, 0, 200), hint1, hint2));
}

function makeSkip(level: number): Q {
  const step = level <= 1 ? 2 : level <= 2 ? 5 : level <= 3 ? 10 : level <= 4 ? [2, 5, 10][rand(0, 2)] : [2, 3, 4, 5][rand(0, 3)];
  const start = step * rand(1, level >= 5 ? 8 : 5);
  const seq = [start, start + step, start + 2 * step, start + 3 * step];
  const hide = rand(0, 3);
  const answer = seq[hide];
  const shown: string[] = [];
  for (let i = 0; i < 4; i++) shown.push(i === hide ? "?" : String(seq[i]));
  return oneQ(
    "skip",
    mkPart(
      "Count by " + step + "s:  " + shown.join(", "),
      "Count by " + step + "s. The pattern is " + shown.join(", ") + ". What number is missing?",
      answer,
      "choice",
      nearbyChoices(answer, 0, 200),
      "We add " + step + " each time.",
      hide === 0
        ? "The next number is " + seq[1] + ". Count back " + step + " to find the missing start."
        : "Look at the number before the question mark and add " + step + ".",
    ),
  );
}

function makeStory(level: number): Q {
  const useSub = rand(0, 1) === 1;
  const pair = useSub ? subPair(Math.min(level, 5)) : addPair(Math.min(level, 5), level >= 5);
  const a = pair.a;
  const b = pair.b;
  const addStories = [
    "Capy has " + a + " oranges. Isla gives him " + b + " more. How many oranges does Capy have now?",
    "Adalynn found " + a + " flowers. Miles found " + b + " more. How many flowers is that in all?",
    "Hazel buried " + a + " toys, then buried " + b + " more. How many toys did she bury?",
    "Capy invited " + a + " friends, and then " + b + " more came. How many friends came in all?",
  ];
  const subStories = [
    "Capy had " + a + " apples and ate " + b + " of them. How many apples are left?",
    "Adalynn picked " + a + " flowers and gave " + b + " to Miles. How many flowers does she have left?",
    "There were " + a + " capybaras in the pond, and " + b + " swam away. How many are still in the pond?",
    "Isla had " + a + " stickers and used " + b + ". How many stickers does she have left?",
  ];
  const prompt = useSub ? subStories[rand(0, subStories.length - 1)] : addStories[rand(0, addStories.length - 1)];
  const answer = useSub ? a - b : a + b;
  return oneQ(
    "story",
    mkPart(
      prompt,
      prompt,
      answer,
      level <= 2 ? "choice" : "number",
      nearbyChoices(answer, 0, 200),
      useSub
        ? "This is a take-away story. Start with " + a + " and take away " + b + "."
        : "This is an adding story. Put " + a + " and " + b + " together.",
      useSub ? "Write it as " + a + " − " + b + "." : "Write it as " + a + " + " + b + ".",
    ),
  );
}

function makeQ(mode: Mode, level: number, streak: number): Q {
  const lv = clampLevel(level);
  if (mode === "add") return makeAdd(lv, streak);
  if (mode === "sub") return makeSub(lv);
  if (mode === "missing") return makeMissing(lv);
  if (mode === "place") return makePlace(lv);
  if (mode === "compare") return makeCompare(lv);
  if (mode === "skip") return makeSkip(lv);
  return makeStory(lv);
}

function HatMark(props: { hat: string }) {
  const hat = props.hat;
  if (hat === "none") return null;
  if (hat === "flower") {
    return (
      <g>
        <circle cx="58" cy="8" r="5" fill="#F59E0B" />
        <circle cx="58" cy="8" r="2" fill="#FDE68A" />
      </g>
    );
  }
  if (hat === "party") {
    return (
      <g>
        <polygon points="58,0 50,14 66,14" fill="#7C3AED" />
        <circle cx="58" cy="0" r="2.2" fill="#F59E0B" />
      </g>
    );
  }
  if (hat === "princess") {
    return (
      <g>
        <polygon points="46,14 50,4 54,14 58,2 62,14 66,4 70,14" fill="#EC4899" />
        <circle cx="58" cy="3" r="1.8" fill="#FDE68A" />
      </g>
    );
  }
  if (hat === "cowboy") {
    return (
      <g>
        <ellipse cx="58" cy="14" rx="16" ry="4" fill="#7A5230" />
        <rect x="50" y="4" width="16" height="10" rx="3" fill="#5C3B1F" />
      </g>
    );
  }
  if (hat === "wizard") {
    return (
      <g>
        <polygon points="58,-2 49,15 67,15" fill="#4C1D95" />
        <circle cx="58" cy="7" r="1.6" fill="#FDE68A" />
      </g>
    );
  }
  if (hat === "chef") {
    return (
      <g>
        <rect x="51" y="8" width="14" height="8" fill="#F8FAFC" />
        <ellipse cx="58" cy="7" rx="10" ry="7" fill="#FFFFFF" stroke="#CBD5E1" />
      </g>
    );
  }
  if (hat === "rainbow") {
    return (
      <g>
        <path d="M46 14 Q58 0 70 14" fill="none" stroke="#EF4444" strokeWidth="2" />
        <path d="M48 14 Q58 3 68 14" fill="none" stroke="#F59E0B" strokeWidth="2" />
        <path d="M50 14 Q58 6 66 14" fill="none" stroke="#22C55E" strokeWidth="2" />
      </g>
    );
  }
  return (
    <g>
      <polygon points="46,14 50,5 54,14 58,1 62,14 66,5 70,14" fill="#EAB308" />
      <circle cx="50" cy="6" r="1.5" fill="#EF4444" />
      <circle cx="58" cy="2.5" r="1.6" fill="#38BDF8" />
      <circle cx="66" cy="6" r="1.5" fill="#A855F7" />
    </g>
  );
}

function Heart(props: { x: number; y: number }) {
  const x = props.x;
  const y = props.y;
  const d =
    "M" + x + " " + (y + 4.5) +
    " C" + (x - 5) + " " + (y + 1) + " " + (x - 3.5) + " " + (y - 3) + " " + x + " " + (y - 0.5) +
    " C" + (x + 3.5) + " " + (y - 3) + " " + (x + 5) + " " + (y + 1) + " " + x + " " + (y + 4.5) + " Z";
  return <path d={d} fill="#EC4899" stroke="#831843" strokeWidth="0.8" />;
}

function FaceMark(props: { face: string }) {
  const f = props.face;
  if (f === "sunglasses") {
    return (
      <g>
        <line x1="52" y1="24" x2="59" y2="24.5" stroke="#111827" strokeWidth="1.2" />
        <rect x="59" y="22" width="8" height="6" rx="2" fill="#111827" />
        <rect x="68.5" y="22" width="5.5" height="6" rx="2" fill="#111827" />
        <line x1="67" y1="24" x2="68.5" y2="24" stroke="#111827" strokeWidth="1.2" />
        <line x1="60.5" y1="23.5" x2="63" y2="23.5" stroke="#FFFFFF" strokeWidth="0.8" />
      </g>
    );
  }
  if (f === "hearts") {
    return (
      <g>
        <line x1="52" y1="25" x2="59" y2="25" stroke="#831843" strokeWidth="1" />
        <Heart x={63.5} y={25} />
        <Heart x={71} y={25} />
      </g>
    );
  }
  if (f === "mustache") {
    return (
      <path
        d="M65 37 Q67 33.5 71 36 Q75 33.5 77 37 Q75 39.5 71 37.6 Q67 39.5 65 37 Z"
        fill="#2B1B0E"
      />
    );
  }
  return null;
}

function CapeBack(props: { neck: string }) {
  if (props.neck !== "cape") return null;
  return (
    <g>
      <path d="M56 36 Q40 30 6 44 L10 58 Q30 50 54 46 Z" fill="#DC2626" stroke="#7F1D1D" strokeWidth="1" />
      <path d="M14 50 L18 46 L20 51 L25 50 L21 54 L22 58 L18 55 L14 57 L15 53 L12 51 Z" fill="#FDE047" />
    </g>
  );
}

function NeckMark(props: { neck: string }) {
  const n = props.neck;
  if (n === "bowtie") {
    return (
      <g>
        <polygon points="52,38 58,42 52,46" fill="#7C3AED" stroke="#3B0764" strokeWidth="0.8" />
        <polygon points="64,38 58,42 64,46" fill="#7C3AED" stroke="#3B0764" strokeWidth="0.8" />
        <circle cx="58" cy="42" r="2" fill="#3B0764" />
      </g>
    );
  }
  if (n === "scarf") {
    return (
      <g>
        <rect x="50" y="37" width="22" height="6" rx="3" fill="#2563EB" stroke="#1E3A8A" strokeWidth="0.8" />
        <rect x="54" y="41" width="5" height="12" rx="2" fill="#2563EB" stroke="#1E3A8A" strokeWidth="0.8" />
        <line x1="56" y1="37" x2="56" y2="43" stroke="#FFFFFF" strokeWidth="1.2" />
        <line x1="62" y1="37" x2="62" y2="43" stroke="#FFFFFF" strokeWidth="1.2" />
        <line x1="68" y1="37" x2="68" y2="43" stroke="#FFFFFF" strokeWidth="1.2" />
        <line x1="54" y1="49" x2="59" y2="49" stroke="#FFFFFF" strokeWidth="1.2" />
      </g>
    );
  }
  if (n === "pearls") {
    const pts = [
      [52, 39],
      [55, 41.2],
      [58, 42.6],
      [61, 43.2],
      [64, 43],
      [67, 42],
      [70, 40.4],
    ];
    return (
      <g>
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r="1.6" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.6" />
        ))}
      </g>
    );
  }
  if (n === "cape") {
    return <circle cx="56" cy="38.5" r="2.4" fill="#FDE047" stroke="#7F1D1D" strokeWidth="0.8" />;
  }
  return null;
}

function HoldMark(props: { hold: string }) {
  const h = props.hold;
  if (h === "balloon") {
    return (
      <g>
        <path d="M48 56 Q38 40 32 18" fill="none" stroke="#475569" strokeWidth="0.8" />
        <ellipse cx="31" cy="11" rx="6" ry="7.5" fill="#EF4444" stroke="#7F1D1D" strokeWidth="0.8" />
        <polygon points="30,18 32,18 31,20" fill="#EF4444" />
        <ellipse cx="29" cy="8" rx="1.5" ry="2.5" fill="#FFFFFF" opacity="0.7" />
      </g>
    );
  }
  if (h === "icecream") {
    return (
      <g>
        <polygon points="63,45 73,45 68,58" fill="#D97706" stroke="#78350F" strokeWidth="0.8" />
        <line x1="65" y1="48" x2="71" y2="48" stroke="#78350F" strokeWidth="0.6" />
        <line x1="66" y1="51" x2="70" y2="51" stroke="#78350F" strokeWidth="0.6" />
        <circle cx="68" cy="42" r="5" fill="#F9A8D4" stroke="#9D174D" strokeWidth="0.8" />
        <circle cx="68" cy="36.5" r="1.6" fill="#DC2626" />
      </g>
    );
  }
  if (h === "umbrella") {
    return (
      <g>
        <line x1="40" y1="12" x2="40" y2="52" stroke="#334155" strokeWidth="1.2" />
        <path d="M40 52 Q40 56 43 56" fill="none" stroke="#334155" strokeWidth="1.2" />
        <path d="M29 13 Q40 -1 51 13 Q48.2 11 45.5 13 Q42.7 11 40 13 Q37.3 11 34.5 13 Q31.8 11 29 13 Z" fill="#0EA5E9" stroke="#0C4A6E" strokeWidth="0.8" />
      </g>
    );
  }
  if (h === "wand") {
    return (
      <g>
        <line x1="49" y1="56" x2="60" y2="46" stroke="#1F2937" strokeWidth="1.6" />
        <polygon points="62,39 63.4,43 67.6,43 64.2,45.5 65.5,49.5 62,47 58.5,49.5 59.8,45.5 56.4,43 60.6,43" fill="#FDE047" stroke="#A16207" strokeWidth="0.7" />
      </g>
    );
  }
  return null;
}

function Capy(props: { hat: string; face?: string; neck?: string; hold?: string; size?: number; hop?: boolean }) {
  const size = props.size ? props.size : 86;
  const face = props.face ? props.face : "none";
  const neck = props.neck ? props.neck : "none";
  const hold = props.hold ? props.hold : "none";
  return (
    <div
      style={{
        display: "inline-flex",
        transform: props.hop ? "translateY(-8px)" : "none",
        transition: "transform 400ms ease",
      }}
    >
      <svg width={size} height={size * 0.82} viewBox="0 0 78 64" style={{ overflow: "visible" }}>
        <CapeBack neck={neck} />
        <ellipse cx="36" cy="40" rx="30" ry="18" fill="#A0703F" />
        <rect x="52" y="18" width="22" height="22" rx="10" fill="#A0703F" />
        <ellipse cx="56" cy="17" rx="4" ry="3.5" fill="#7A5230" />
        <circle cx="64" cy="26" r="2.6" fill="#2B1B0E" />
        <ellipse cx="73" cy="33" rx="3" ry="2.4" fill="#5C3B1F" />
        <rect x="16" y="52" width="7" height="9" rx="3" fill="#7A5230" />
        <rect x="44" y="52" width="7" height="9" rx="3" fill="#7A5230" />
        <NeckMark neck={neck} />
        <FaceMark face={face} />
        <HatMark hat={props.hat} />
        <HoldMark hold={hold} />
      </svg>
    </div>
  );
}

function Boats(props: { v: Visual; only?: string }) {
  const theme = useGrokTheme();
  const v = props.v;
  const rods: number[] = [];
  const cubes: number[] = [];
  for (let i = 0; i < v.tens; i++) rods.push(i);
  for (let i = 0; i < v.ones; i++) cubes.push(i);
  const tensCap = v.showCounts
    ? v.tens + (v.tens === 1 ? " ten (long boat)" : " tens (long boats)")
    : "tens (long boats)";
  const onesCap = v.showCounts
    ? v.ones + (v.ones === 1 ? " one (little capy)" : " ones (little capys)")
    : "ones (little capys)";
  const capStyle: CSSProperties = { fontSize: 13, fontWeight: 600, color: theme.text.secondary, marginTop: 6, textAlign: "center" };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      {v.label ? <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>{v.label}</div> : null}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-end", justifyContent: "center" }}>
        {props.only === "ones" ? null : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {rods.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.text.tertiary, padding: "8px 4px" }}>no long boats</div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateRows: "repeat(" + Math.min(5, rods.length) + ", auto)",
                gridAutoFlow: "column",
                gap: 4,
              }}
            >
              {rods.map((i) => (
                <div
                  key={"t" + i}
                  title="long boat = 10"
                  style={{
                    width: 58,
                    height: 18,
                    borderRadius: "4px 4px 12px 12px",
                    background: theme.fill.accent,
                    border: "2px solid " + theme.text.primary,
                    color: theme.text.onPrimary,
                    fontSize: 12,
                    fontWeight: 700,
                    lineHeight: "18px",
                    textAlign: "center",
                  }}
                >
                  10
                </div>
              ))}
            </div>
          )}
          <div style={capStyle}>{tensCap}</div>
        </div>
        )}
        {props.only === "tens" ? null : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {cubes.length === 0 ? (
            <div style={{ fontSize: 13, color: theme.text.tertiary, padding: "8px 4px" }}>no little capys</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(" + Math.min(5, cubes.length) + ", 22px)", gap: 4 }}>
              {cubes.map((i) => (
                <div
                  key={"o" + i}
                  title="little capy = 1"
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9999,
                    background: theme.fill.primary,
                    border: "2px solid " + theme.text.primary,
                    color: theme.text.onPrimary,
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: "18px",
                    textAlign: "center",
                  }}
                >
                  1
                </div>
              ))}
            </div>
          )}
          <div style={capStyle}>{onesCap}</div>
        </div>
        )}
      </div>
    </div>
  );
}

function DigitBoard(props: { n: number }) {
  const theme = useGrokTheme();
  const t = Math.floor(props.n / 10);
  const o = props.n % 10;
  const col: CSSProperties = {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: 10,
    borderRadius: theme.radius.lg,
    border: "2px dashed " + theme.border.strong,
    minWidth: 130,
  };
  return (
    <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
      <div style={col}>
        <div style={{ fontSize: 44, fontWeight: 800 }}>{t}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text.secondary, marginBottom: 6 }}>tens place · long boats</div>
        <Boats v={{ label: "", tens: t, ones: 0, showCounts: true }} only="tens" />
      </div>
      <div style={col}>
        <div style={{ fontSize: 44, fontWeight: 800 }}>{o}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: theme.text.secondary, marginBottom: 6 }}>ones place · little capys</div>
        <Boats v={{ label: "", tens: 0, ones: o, showCounts: true }} only="ones" />
      </div>
    </div>
  );
}

function pill(theme: GrokTheme, active: boolean): CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: theme.radius.full,
    border: (active ? "3px solid " + theme.text.primary : "1px solid " + theme.border.default),
    background: active ? theme.fill.primary : theme.fill.secondary,
    color: active ? theme.text.onPrimary : theme.text.primary,
    fontSize: 16,
    fontWeight: theme.weight.semibold,
    cursor: "pointer",
    fontFamily: theme.font.family,
  };
}

export default function App() {
  const theme = useGrokTheme();
  const [save, setSave] = useState<Save>(() => loadSave());
  const [screen, setScreen] = useState<Screen>("home");
  const [mode, setMode] = useState<Mode>("add");
  const [q, setQ] = useState<Q>(() => makeQ("add", 1, 0));
  const [streak, setStreak] = useState<number>(0);
  const [misses, setMisses] = useState<number>(0);
  const [missedQ, setMissedQ] = useState<boolean>(false);
  const [stepIdx, setStepIdx] = useState<number>(0);
  const [usingHelp, setUsingHelp] = useState<boolean>(false);
  const [doneSteps, setDoneSteps] = useState<string[]>([]);
  const [typed, setTyped] = useState<string>("");
  const [picked, setPicked] = useState<number | string | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [locked, setLocked] = useState<boolean>(false);
  const [hop, setHop] = useState<boolean>(false);
  const [unlockNote, setUnlockNote] = useState<string>("");
  const [masteredNote, setMasteredNote] = useState<string>("");

  useEffect(() => {
    writeSave(save);
  }, [save]);

  useEffect(() => {
    setHop(true);
    const t = setTimeout(() => setHop(false), 450);
    return () => clearTimeout(t);
  }, [q]);

  const activeParts: Part[] = usingHelp && q.helpParts.length > 0 ? q.helpParts : q.parts;
  const part: Part = activeParts[Math.min(stepIdx, activeParts.length - 1)];
  const multi = activeParts.length > 1;

  function applyStars(prev: Save, add: number): Save {
    const stars = prev.stars + add;
    const earned = unlockedFor(stars);
    const unlocked = prev.unlocked.slice();
    const names: string[] = [];
    for (let i = 0; i < earned.length; i++) {
      if (unlocked.indexOf(earned[i]) < 0) {
        unlocked.push(earned[i]);
        if (earned[i] !== "none") names.push(itemName(earned[i]));
      }
    }
    if (names.length > 0) {
      setUnlockNote("New Dress Up item! You unlocked the " + names.join(" and the ") + ". Tap Dress Up to try it on.");
    }
    return { ...prev, stars, unlocked };
  }

  function resetQuestionState(): void {
    setTyped("");
    setPicked(null);
    setFeedback("");
    setHintLevel(0);
    setLocked(false);
    setMisses(0);
    setMissedQ(false);
    setStepIdx(0);
    setUsingHelp(false);
    setDoneSteps([]);
  }

  function startMode(m: Mode): void {
    const lv = save.levels[m];
    setMode(m);
    setQ(makeQ(m, lv, 0));
    setStreak(0);
    resetQuestionState();
    setScreen("play");
    setUnlockNote("");
    setMasteredNote(
      save.mastered.indexOf(m) >= 0
        ? "You mastered " + MODE_META[m].title + "! Try a new path to earn more stars."
        : "",
    );
  }

  function nextQuestion(lv: number, s: number): void {
    setQ(makeQ(mode, lv, s));
    resetQuestionState();
  }

  function finish(): void {
    setLocked(true);
    const firstTry = !missedQ;
    const alreadyMastered = save.mastered.indexOf(mode) >= 0;
    let lv = save.levels[mode];
    let s = 0;
    if (firstTry) {
      s = streak + 1;
      setStreak(s);
      const praise = ["Yay! First try! ⭐", "Super job! ⭐", "Capy is so proud! ⭐", "Brilliant! ⭐"][rand(0, 3)];
      setFeedback(alreadyMastered ? praise.replace(" ⭐", "") : praise);
      say(praise.replace(" ⭐", ""));
      if (s % 3 === 0 && lv < 6) lv = lv + 1;
      const willMaster = !alreadyMastered && save.levels[mode] >= 6 && s % 3 === 0;
      const newLv = lv;
      setSave((prev) => {
        const next = alreadyMastered ? prev : applyStars(prev, 1);
        const mastered =
          willMaster && next.mastered.indexOf(mode) < 0 ? next.mastered.concat([mode]) : next.mastered;
        return { ...next, levels: { ...next.levels, [mode]: newLv }, mastered };
      });
      if (alreadyMastered || willMaster) {
        setMasteredNote("You mastered " + MODE_META[mode].title + "! Try a new path to earn more stars.");
      }
    } else {
      setStreak(0);
      const msg = "You got it! Stars are for first tries, so the next one is your star chance.";
      setFeedback(msg);
      say("You got it! The next one is your star chance.");
    }
    const finalLv = lv;
    setTimeout(() => nextQuestion(finalLv, s), firstTry ? 1600 : 2600);
  }

  function judge(value: number | string): void {
    if (locked) return;
    const ok =
      typeof part.answer === "number"
        ? typeof value === "number" && value === part.answer
        : String(value) === String(part.answer);
    setPicked(value);
    if (ok) {
      setMisses(0);
      if (part.done) setDoneSteps((d) => d.concat([part.done]));
      if (stepIdx < activeParts.length - 1) {
        const nxt = activeParts[stepIdx + 1];
        setStepIdx(stepIdx + 1);
        setTyped("");
        setPicked(null);
        setHintLevel(0);
        setFeedback("Yes! " + (part.done ? part.done + "." : ""));
        say("Yes! " + nxt.speak);
        return;
      }
      finish();
    } else {
      const m = misses + 1;
      setMisses(m);
      setMissedQ(true);
      setStreak(0);
      const tip = m >= 2 ? part.hint2 : part.hint1;
      setHintLevel(m >= 2 ? 2 : 1);
      setFeedback("Almost! " + tip);
      say("Almost! " + tip);
    }
  }

  function submitTyped(): void {
    if (typed === "" || typed === "-") return;
    const n = parseInt(typed, 10);
    if (!isFinite(n)) return;
    judge(n);
  }

  function typeDigit(d: string): void {
    if (locked) return;
    setPicked(null);
    if (d === "back") {
      setTyped((t) => t.slice(0, -1));
      return;
    }
    setTyped((t) => (t.length >= 4 ? t : t + d));
  }

  function showHint(): void {
    const next = hintLevel >= 2 ? 2 : hintLevel + 1;
    setHintLevel(next);
    const tip = next >= 2 ? part.hint2 : part.hint1;
    setFeedback(tip);
    say(tip);
  }

  function startSplit(): void {
    if (locked || q.helpParts.length === 0) return;
    setUsingHelp(true);
    setStepIdx(0);
    setDoneSteps([]);
    setTyped("");
    setPicked(null);
    setHintLevel(0);
    setMisses(0);
    setFeedback("Let’s split it! Long boats first, then little capys.");
    say("Let's split it! " + q.helpParts[0].speak);
  }

  function wear(slot: Slot, id: string): void {
    if (save.unlocked.indexOf(id) < 0) return;
    setSave((prev) => {
      const nextVal = prev[slot] === id ? "none" : id;
      const out: Save = { ...prev };
      if (slot === "hat") out.hat = nextVal;
      else if (slot === "face") out.face = nextVal;
      else if (slot === "neck") out.neck = nextVal;
      else out.hold = nextVal;
      return out;
    });
  }

  const wornNames: string[] = [];
  for (let i = 0; i < SLOTS.length; i++) {
    const id = save[SLOTS[i]];
    if (id !== "none" && itemName(id)) wornNames.push(itemName(id));
  }

  const card: CSSProperties = {
    background: theme.bg.elevated,
    border: "1px solid " + theme.border.subtle,
    borderRadius: theme.radius.xl,
    padding: 16,
    cursor: "pointer",
    textAlign: "left",
    fontFamily: theme.font.family,
    color: theme.text.primary,
  };

  const keyBtn = (wide?: boolean): CSSProperties => ({
    width: wide ? 116 : 72,
    height: 56,
    borderRadius: theme.radius.lg,
    border: "2px solid " + theme.border.default,
    background: theme.bg.elevated,
    color: theme.text.primary,
    fontSize: 22,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: theme.font.family,
  });

  const showVisuals = q.visuals.length > 0 && (usingHelp || hintLevel >= q.reveal);
  const canSplit = q.helpParts.length > 0 && !usingHelp && !locked;

  return (
    <div
      style={{
        fontFamily: theme.font.family,
        color: theme.text.primary,
        background: theme.bg.base,
        padding: 20,
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Capy
            hat={save.hat}
            face={save.face}
            neck={save.neck}
            hold={save.hold}
            size={screen === "home" ? 92 : 64}
            hop={hop && screen !== "dress"}
          />
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: "30px" }}>Capy Math Adventure</div>
            <div style={{ fontSize: 15, color: theme.text.secondary }}>
              {"⭐ " + save.stars}
              {screen === "play" ? "   Level " + save.levels[mode] : ""}
              {wornNames.length > 0 ? "   ·  " + wornNames.join(", ") : ""}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {screen !== "home" ? (
            <button style={pill(theme, false)} onClick={() => setScreen("home")}>
              Map
            </button>
          ) : null}
          <button style={pill(theme, screen === "dress")} onClick={() => setScreen("dress")}>
            Dress Up
          </button>
        </div>
      </div>

      {unlockNote ? (
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            borderRadius: theme.radius.lg,
            background: theme.fill.successSubtle,
            color: theme.text.successDeep,
            fontWeight: 600,
          }}
        >
          {"🎁 " + unlockNote}
        </div>
      ) : null}

      {screen === "home" ? (
        <div>
          <p style={{ fontSize: 18, lineHeight: "26px", margin: "16px 0 12px" }}>
            Help Capy on a math adventure! Pick a path, earn stars, and dress Capy up.
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 12,
            }}
          >
            {MODES.map((m) => (
              <button key={m} style={card} onClick={() => startMode(m)}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>
                  {MODE_META[m].emoji + "  " + MODE_META[m].title}
                </div>
                <div style={{ fontSize: 14, color: theme.text.secondary, marginTop: 6 }}>{MODE_META[m].blurb}</div>
                <div style={{ fontSize: 13, color: theme.text.tertiary, marginTop: 8 }}>
                  {save.mastered.indexOf(m) >= 0 ? "⭐ Mastered" : "Level " + save.levels[m] + " of 6"}
                </div>
              </button>
            ))}
          </div>
          <div style={{ marginTop: 22, fontSize: 13, color: theme.text.secondary, lineHeight: "19px" }}>
            For the grown-up: this is aimed at late kindergarten into 1st grade, and every number stays under 100 for
            now. A star only comes from a right answer on the first tap. After a miss she can still answer to move on,
            but that question earns no star and the streak starts over, so guessing doesn’t pay. Three first-try answers
            in a row moves a path up a level. After three in a row at level 6 a path is mastered, and more correct
            answers there don’t earn stars—try a new path for more. Pond Picnic teaches “Split it” for two-digit sums:
            add the long boats (tens), then the little capys (ones), then put them together, like 13 + 81 → 10 + 80 = 90,
            3 + 1 = 4, 90 + 4 = 94. The steps fade as she gets streaks, and the ✂️ Split it button stays there to help.
            Hints never give the answer, and 🔊 reads the question without the answer. Stars and Dress Up items save on
            this device when storage is available.
          </div>
        </div>
      ) : null}

      {screen === "dress" ? (
        <div>
          <p style={{ fontSize: 18, margin: "16px 0 8px" }}>
            Dress Capy up! Mix a hat, face, neck, and hold item. Tap an item you are wearing to take it off.
          </p>
          <div style={{ display: "flex", justifyContent: "center", margin: "8px 0 18px" }}>
            <Capy hat={save.hat} face={save.face} neck={save.neck} hold={save.hold} size={160} />
          </div>
          {SLOTS.map((slot) => (
            <div key={slot} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 8px" }}>
                {SLOT_META[slot].emoji + "  " + SLOT_META[slot].title}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: 10,
                }}
              >
                {ITEMS.filter((it) => it.slot === slot).map((it) => {
                  const open = save.unlocked.indexOf(it.id) >= 0;
                  const on = save[slot] === it.id;
                  return (
                    <button
                      key={it.id}
                      onClick={() => wear(slot, it.id)}
                      disabled={!open}
                      aria-pressed={on}
                      style={{
                        ...card,
                        cursor: open ? "pointer" : "default",
                        opacity: open ? 1 : 0.55,
                        border: on ? "4px solid " + theme.text.primary : card.border,
                        textAlign: "center",
                      }}
                    >
                      <Capy
                        hat={slot === "hat" ? it.id : "none"}
                        face={slot === "face" ? it.id : "none"}
                        neck={slot === "neck" ? it.id : "none"}
                        hold={slot === "hold" ? it.id : "none"}
                        size={72}
                      />
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{it.name}</div>
                      <div style={{ fontSize: 13, color: theme.text.secondary }}>
                        {open ? (on ? "✓ Wearing · tap to take off" : "Tap to wear") : "🔒 " + it.cost + " stars to unlock"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {screen === "play" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 10px", flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.secondary }}>
              {MODE_META[mode].emoji + "  " + MODE_META[mode].title}
            </div>
            <div style={{ flex: 1 }} />
            <button style={pill(theme, false)} onClick={() => say(part.speak)} aria-label="Read it to me">
              🔊
            </button>
            {canSplit ? (
              <button style={pill(theme, false)} onClick={startSplit}>
                ✂️ Split it
              </button>
            ) : null}
            <button style={pill(theme, false)} onClick={showHint}>
              Hint
            </button>
          </div>

          <div style={{ fontSize: multi ? 30 : 24, fontWeight: 700, lineHeight: multi ? "38px" : "32px", marginBottom: 14 }}>
            {q.prompt}
          </div>

          {showVisuals ? (
            <div
              style={{
                background: theme.fill.accentSubtle,
                borderRadius: theme.radius.xl,
                padding: 16,
                marginBottom: 16,
                border: "1px solid " + theme.border.subtle,
                display: "flex",
                gap: 22,
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "flex-start",
              }}
            >
              {q.visuals.map((v, i) => (
                <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 22 }}>
                  {i > 0 && (q.mode === "add" || q.visuals.length === 2) ? (
                    <div style={{ fontSize: 30, fontWeight: 700, alignSelf: "center" }}>{q.mode === "add" ? "+" : "?"}</div>
                  ) : null}
                  <Boats v={v} />
                </div>
              ))}
            </div>
          ) : null}

          {q.board >= 0 ? (
            <div
              style={{
                background: theme.fill.accentSubtle,
                borderRadius: theme.radius.xl,
                padding: 16,
                marginBottom: 16,
                border: "1px solid " + theme.border.subtle,
              }}
            >
              <DigitBoard n={q.board} />
            </div>
          ) : null}

          {multi ? (
            <div style={{ marginBottom: 12 }}>
              {doneSteps.map((d, i) => (
                <div key={i} style={{ fontSize: 17, fontWeight: 600, color: theme.text.successDeep, margin: "4px 0" }}>
                  {"✓ " + d}
                </div>
              ))}
              {!locked ? (
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    padding: "10px 14px",
                    borderRadius: theme.radius.lg,
                    border: "2px dashed " + theme.border.strong,
                    marginTop: 6,
                  }}
                >
                  {"👉 " + part.prompt}
                </div>
              ) : null}
            </div>
          ) : q.prompt !== part.prompt ? (
            <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 12 }}>{part.prompt}</div>
          ) : null}

          {part.kind === "choice" ? (
            <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap", margin: "8px 0 12px" }}>
              {part.choices.map((c) => {
                const right = locked && String(c) === String(part.answer);
                const wrong = picked !== null && String(picked) === String(c) && String(c) !== String(part.answer);
                return (
                  <button
                    key={String(c)}
                    onClick={() => judge(c)}
                    aria-label={String(c)}
                    style={{
                      minWidth: 92,
                      minHeight: 92,
                      padding: 12,
                      borderRadius: 20,
                      fontSize: q.mode === "compare" && typeof c === "string" ? 44 : typeof c === "string" ? 26 : 32,
                      fontWeight: 700,
                      cursor: "pointer",
                      fontFamily: theme.font.family,
                      border:
                        (right || wrong ? "4px " : "3px ") +
                        (wrong ? "dashed " : "solid ") +
                        (right ? theme.text.success : wrong ? theme.text.warning : theme.border.strong),
                      background: right
                        ? theme.fill.successSubtle
                        : wrong
                          ? theme.fill.warningSubtle
                          : theme.bg.elevated,
                      color: theme.text.primary,
                    }}
                  >
                    {(right ? "✓ " : wrong ? "✗ " : "") + String(c)}
                  </button>
                );
              })}
            </div>
          ) : (
            <div>
              <div
                style={{
                  textAlign: "center",
                  fontSize: 40,
                  fontWeight: 700,
                  minHeight: 52,
                  margin: "6px 0 12px",
                  letterSpacing: 2,
                  color: theme.text.primary,
                }}
              >
                {(locked ? "✓ " : picked !== null ? "✗ " : "") + (typed === "" ? "_" : typed)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 8, maxWidth: 260, margin: "0 auto" }}>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
                  <button key={d} style={keyBtn()} onClick={() => typeDigit(d)}>
                    {d}
                  </button>
                ))}
                <button style={keyBtn()} onClick={() => typeDigit("back")} aria-label="Backspace">
                  ⌫
                </button>
                <button style={keyBtn()} onClick={() => typeDigit("0")}>
                  0
                </button>
                <button
                  style={{ ...keyBtn(), background: theme.fill.primary, color: theme.text.onPrimary, borderColor: theme.fill.primary }}
                  onClick={submitTyped}
                >
                  Go
                </button>
              </div>
            </div>
          )}

          <div style={{ textAlign: "center", fontSize: 18, minHeight: 28, fontWeight: 600, marginTop: 16 }}>{feedback}</div>

          {masteredNote ? (
            <div
              style={{
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: theme.radius.lg,
                background: theme.fill.accentSubtle,
                color: theme.text.secondary,
                fontWeight: 600,
                textAlign: "center",
                lineHeight: "22px",
              }}
            >
              <div>{masteredNote}</div>
              <div style={{ marginTop: 10 }}>
                <button style={pill(theme, false)} onClick={() => setScreen("home")}>
                  Map
                </button>
              </div>
            </div>
          ) : null}

          {misses >= 2 && !locked ? (
            <div style={{ textAlign: "center", marginTop: 10 }}>
              <button style={pill(theme, false)} onClick={() => nextQuestion(save.levels[mode], 0)}>
                Try a new question
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
