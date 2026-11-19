import { useState, useEffect, useGrokTheme } from "grok/canvas";
import type { CSSProperties, GrokTheme } from "grok/canvas";

/* ===================== WORD POND WORD LIST (easy to update) =====================
   Adalynn's reading words, from /workspace/reading/progress.md (Books 1-5, Nov 18).
   To add words from a new book: APPEND them to the END of WORD_LIST (save codes refer to
   list positions, so don't reorder or delete), and add a LOOKALIKES entry for each.
   SHAKY_WORDS start out shown more often until she gets them right. */
const WORD_LIST: string[] = [
  "I", "see", "is", "the", "in", "can", "a", "and", "on", "has", "go", "goes",
  "sat", "sun", "hot", "mud", "dig", "wet", "nap", "hug", "dog", "big", "run", "hop",
  "bus", "bag", "mat", "pen", "top", "fun", "sit",
];
const SHAKY_WORDS: string[] = ["goes", "has", "top"];
/* Look-alike wrong answers (no sound-alike words such as sun/son or see/sea).
   Distractors may be words she hasn't learned yet. */
const LOOKALIKES: { [w: string]: string[] } = {
  I: ["a", "it", "if", "in"],
  see: ["seed", "set", "she", "bee"],
  is: ["it", "in", "his", "as"],
  the: ["then", "they", "them", "she"],
  in: ["on", "it", "is", "an"],
  can: ["cat", "cap", "man", "car"],
  a: ["an", "at", "I", "as"],
  and: ["an", "end", "sand", "hand"],
  on: ["no", "in", "an", "of"],
  has: ["hat", "his", "had", "ham"],
  go: ["no", "so", "got", "do"],
  goes: ["go", "gets", "does", "toes"],
  sat: ["sit", "set", "mat", "bat"],
  sun: ["run", "bun", "sit", "fun"],
  hot: ["hat", "hit", "pot", "hop"],
  mud: ["mad", "bud", "mug", "map"],
  dig: ["dog", "big", "pig", "did"],
  wet: ["web", "pet", "wit", "net"],
  nap: ["map", "nip", "cap", "tap"],
  hug: ["bug", "hum", "mug", "hut"],
  dog: ["dig", "log", "dot", "fog"],
  big: ["bag", "pig", "bug", "dig"],
  run: ["ran", "sun", "rug", "rub"],
  hop: ["hip", "top", "hot", "mop"],
  bus: ["bug", "but", "bun", "us"],
  bag: ["big", "bat", "rag", "beg"],
  mat: ["man", "cat", "met", "map"],
  pen: ["pin", "ten", "pan", "peg"],
  top: ["tap", "tip", "pot", "toy"],
  fun: ["fan", "fin", "sun", "bun"],
  sit: ["sat", "set", "pit", "sip"],
};
/* Sound-alike words that must never be a wrong answer for the key word. */
const HOMOPHONES: { [w: string]: string[] } = {
  sun: ["son"], see: ["sea", "c"], I: ["eye"], a: ["uh"], in: ["inn"], hop: [], bus: [], hug: [], hot: [],
};
const WORD_ROUND = 8;
const MERMAID_NAME = "Marina";

type Mode = "add" | "sub" | "missing" | "place" | "compare" | "skip" | "story";
type Path = Mode | "word";
type Slot = "hat" | "face" | "neck" | "hold";
type MSlot = "friend" | "hair" | "mhead" | "mneck" | "mtail" | "mhold" | "pet" | "scene";
type Screen = "home" | "dress" | "play" | "words" | "grownup";
type Friend = "capy" | "mermaid";
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

type Levels = { [K in Path]: number };

/* Word Pond spaced-repetition stats per word: b = box 0-5 (0 = shaky), c/m = right/missed (capped 15),
   d = the card number when it is due again (never below wtick). */
type WStat = { b: number; c: number; m: number; d: number };

type Save = {
  stars: number;
  hat: string;
  face: string;
  neck: string;
  hold: string;
  unlocked: string[];
  levels: Levels;
  mastered: Mode[];
  friend: Friend;
  hair: string;
  mhead: string;
  mneck: string;
  mtail: string;
  mhold: string;
  seahorse: boolean;
  dolphin: boolean;
  ocean: boolean;
  castle: boolean;
  words: { [w: string]: WStat };
  wtick: number;
  last: Path;
};

type Item = { id: string; slot: Slot; name: string; cost: number };
type MItem = { id: string; slot: MSlot; name: string; cost: number; big?: boolean; color?: string };

const SAVE_KEY = "capy-math-adventure-v1";
const MODES: Mode[] = ["add", "sub", "missing", "place", "compare", "skip", "story"];
const PATHS: Path[] = ["add", "sub", "missing", "place", "compare", "skip", "story", "word"];
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

/* Mermaid reward ladder: lifetime stars only go up, Capy and the mermaid share one star pool.
   160-250: a small prize about every 10 stars; 250-500: every 15-20; big milestones at 200/250/300/400/500. */
const MITEMS: MItem[] = [
  { id: "mermaid", slot: "friend", name: MERMAID_NAME + " the Mermaid", cost: 160, big: true },
  { id: "h_pink", slot: "hair", name: "Pink", cost: 160, color: "#F472B6" },
  { id: "h_purple", slot: "hair", name: "Purple", cost: 160, color: "#8B5CF6" },
  { id: "h_blue", slot: "hair", name: "Blue", cost: 160, color: "#3B82F6" },
  { id: "h_gold", slot: "hair", name: "Gold", cost: 160, color: "#FACC15" },
  { id: "h_red", slot: "hair", name: "Red", cost: 160, color: "#DC2626" },
  { id: "h_black", slot: "hair", name: "Black", cost: 160, color: "#1F1B24" },
  { id: "h_brown", slot: "hair", name: "Brown", cost: 160, color: "#7C4A21" },
  { id: "h_teal", slot: "hair", name: "Teal", cost: 160, color: "#0D9488" },
  { id: "m_shellcrown", slot: "mhead", name: "Shell crown", cost: 170 },
  { id: "m_pearls", slot: "mneck", name: "Mermaid pearls", cost: 180 },
  { id: "m_starfish", slot: "mhead", name: "Starfish clip", cost: 190 },
  { id: "seahorse", slot: "pet", name: "Seahorse pet", cost: 200, big: true },
  { id: "m_sparkletail", slot: "mtail", name: "Sparkly tail", cost: 210 },
  { id: "m_bubblewand", slot: "mhold", name: "Bubble wand", cost: 220 },
  { id: "h_rainbow", slot: "hair", name: "Rainbow", cost: 230 },
  { id: "m_shellnecklace", slot: "mneck", name: "Seashell necklace", cost: 240 },
  { id: "ocean", slot: "scene", name: "Ocean map", cost: 250, big: true },
  { id: "h_galaxy", slot: "hair", name: "Galaxy", cost: 265 },
  { id: "m_tiara", slot: "mhead", name: "Pearl tiara", cost: 280 },
  { id: "dolphin", slot: "pet", name: "Dolphin friend", cost: 300, big: true },
  { id: "m_rainbowtail", slot: "mtail", name: "Rainbow tail", cost: 315 },
  { id: "m_treasure", slot: "mhold", name: "Treasure chest", cost: 330 },
  { id: "h_cotton", slot: "hair", name: "Cotton candy", cost: 345 },
  { id: "m_seaglass", slot: "mneck", name: "Sea glass necklace", cost: 360 },
  { id: "m_goldtail", slot: "mtail", name: "Golden tail", cost: 380 },
  { id: "castle", slot: "scene", name: "Coral castle", cost: 400, big: true },
  { id: "h_sunset", slot: "hair", name: "Sunset", cost: 415 },
  { id: "m_moon", slot: "mhead", name: "Moon clip", cost: 430 },
  { id: "m_conch", slot: "mhold", name: "Shell trumpet", cost: 450 },
  { id: "h_silver", slot: "hair", name: "Silver", cost: 465, color: "#CBD5E1" },
  { id: "m_gem", slot: "mneck", name: "Ocean gem necklace", cost: 480 },
  { id: "m_queen", slot: "mhead", name: "Mermaid Queen crown", cost: 500, big: true },
];
const ALL_IDS: string[] = ITEMS.map((i) => i.id).concat(MITEMS.map((i) => i.id));
const MSLOT_META: { [k: string]: { title: string; emoji: string } } = {
  mhead: { title: "Head", emoji: "👑" },
  mneck: { title: "Necklace", emoji: "📿" },
  mtail: { title: "Tail", emoji: "🧜" },
  mhold: { title: "Hold", emoji: "🫧" },
};
const MSLOTS: Array<"mhead" | "mneck" | "mtail" | "mhold"> = ["mhead", "mneck", "mtail", "mhold"];

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
const WORD_META = { title: "Word Pond", emoji: "🔤", blurb: "Listen to the word, then tap it. Reading practice!" };

function pathTitle(p: Path): string {
  return p === "word" ? WORD_META.title : MODE_META[p].title;
}

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

function findReward(id: string): MItem | Item | null {
  const it = findItem(id);
  if (it) return it;
  for (let i = 0; i < MITEMS.length; i++) if (MITEMS[i].id === id) return MITEMS[i];
  return null;
}

function findM(id: string): MItem | null {
  for (let i = 0; i < MITEMS.length; i++) if (MITEMS[i].id === id) return MITEMS[i];
  return null;
}

function isPath(s: unknown): s is Path {
  return typeof s === "string" && PATHS.indexOf(s as Path) >= 0;
}

function defaultLevels(): Levels {
  return { add: 1, sub: 1, missing: 1, place: 1, compare: 1, skip: 1, story: 1, word: 1 };
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
    friend: "capy",
    hair: "h_pink",
    mhead: "none",
    mneck: "none",
    mtail: "none",
    mhold: "none",
    seahorse: false,
    dolphin: false,
    ocean: false,
    castle: false,
    words: {},
    wtick: 0,
    last: "add",
  };
}

function clampLevel(n: number): number {
  if (n < 1) return 1;
  if (n > 6) return 6;
  return Math.floor(n);
}

/* Canonical order: "none", then Capy items, then mermaid ladder (so saves and codes compare exactly). */
function canonUnlocked(ids: string[]): string[] {
  const out: string[] = ["none"];
  for (let i = 0; i < ALL_IDS.length; i++) if (ids.indexOf(ALL_IDS[i]) >= 0) out.push(ALL_IDS[i]);
  return out;
}

function unlockedFor(stars: number): string[] {
  const out: string[] = ["none"];
  for (let i = 0; i < ITEMS.length; i++) {
    if (ITEMS[i].cost <= stars) out.push(ITEMS[i].id);
  }
  for (let i = 0; i < MITEMS.length; i++) {
    if (MITEMS[i].cost <= stars) out.push(MITEMS[i].id);
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

function mPick(v: unknown, slot: MSlot, unlocked: string[]): string {
  if (typeof v !== "string") return "none";
  const it = findM(v);
  if (!it || it.slot !== slot) return "none";
  if (unlocked.indexOf(v) < 0) return "none";
  return v;
}

function clampInt(v: unknown, lo: number, hi: number, dflt: number): number {
  if (typeof v !== "number" || !isFinite(v)) return dflt;
  const n = Math.floor(v);
  return n < lo ? lo : n > hi ? hi : n;
}

/* Keeps every word's due card at or after the current card count (overdue = due now). */
function normWords(words: { [w: string]: WStat }, tick: number): { [w: string]: WStat } {
  const out: { [w: string]: WStat } = {};
  for (let i = 0; i < WORD_LIST.length; i++) {
    const w = WORD_LIST[i];
    const st = words[w];
    if (!st) continue;
    out[w] = { b: st.b, c: st.c, m: st.m, d: Math.min(tick + 31, Math.max(tick, st.d)) };
  }
  return out;
}

function parseSave(raw: string): Save {
  const base = defaultSave();
  try {
    const v = JSON.parse(raw) as { [k: string]: unknown };
    if (!v || typeof v !== "object") return defaultSave();
    if (typeof v.stars === "number" && isFinite(v.stars) && v.stars >= 0) {
      base.stars = Math.min(65535, Math.floor(v.stars));
    }
    const u: string[] = ["none"];
    if (Array.isArray(v.unlocked)) {
      for (let i = 0; i < v.unlocked.length; i++) {
        const item = v.unlocked[i];
        if (typeof item === "string" && findReward(item) && u.indexOf(item) < 0) u.push(item);
      }
    }
    const earned = unlockedFor(base.stars);
    for (let i = 0; i < earned.length; i++) {
      if (u.indexOf(earned[i]) < 0) u.push(earned[i]);
    }
    base.unlocked = canonUnlocked(u);
    base.hat = slotPick(v.hat, "hat", base.unlocked);
    base.face = slotPick(v.face, "face", base.unlocked);
    base.neck = slotPick(v.neck, "neck", base.unlocked);
    base.hold = slotPick(v.hold, "hold", base.unlocked);
    if (v.levels && typeof v.levels === "object") {
      const lv = v.levels as { [k: string]: unknown };
      const next = defaultLevels();
      for (let i = 0; i < PATHS.length; i++) {
        const m = PATHS[i];
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
      base.mastered = MODES.filter((m) => md.indexOf(m) >= 0);
    }
    const hasMermaid = base.unlocked.indexOf("mermaid") >= 0;
    base.friend = v.friend === "mermaid" && hasMermaid ? "mermaid" : "capy";
    const hair = mPick(v.hair, "hair", base.unlocked);
    base.hair = hair === "none" ? "h_pink" : hair;
    base.mhead = mPick(v.mhead, "mhead", base.unlocked);
    base.mneck = mPick(v.mneck, "mneck", base.unlocked);
    base.mtail = mPick(v.mtail, "mtail", base.unlocked);
    base.mhold = mPick(v.mhold, "mhold", base.unlocked);
    const flag = (k: string, id: string): boolean =>
      base.unlocked.indexOf(id) >= 0 && (typeof v[k] === "boolean" ? (v[k] as boolean) : true);
    base.seahorse = flag("seahorse", "seahorse");
    base.dolphin = flag("dolphin", "dolphin");
    base.ocean = flag("ocean", "ocean");
    base.castle = flag("castle", "castle");
    base.wtick = clampInt(v.wtick, 0, 60000, 0);
    if (v.words && typeof v.words === "object") {
      const wv = v.words as { [k: string]: unknown };
      const out: { [w: string]: WStat } = {};
      for (let i = 0; i < WORD_LIST.length; i++) {
        const w = WORD_LIST[i];
        const st = wv[w] as { [k: string]: unknown } | undefined;
        if (!st || typeof st !== "object") continue;
        out[w] = {
          b: clampInt(st.b, 0, 5, 1),
          c: clampInt(st.c, 0, 15, 0),
          m: clampInt(st.m, 0, 15, 0),
          d: clampInt(st.d, 0, 60031, base.wtick),
        };
      }
      base.words = normWords(out, base.wtick);
    }
    base.last = isPath(v.last) ? v.last : "add";
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

let speakToken = 0;

/* Speaks, then calls done() when the voice finishes, or after a fallback timeout if the
   device never reports the end (or has no voice). Only the latest call's done() runs. */
function sayThen(text: string, done: () => void, fallbackMs: number): void {
  speakToken += 1;
  const tok = speakToken;
  let fired = false;
  const fire = (): void => {
    if (fired || tok !== speakToken) return;
    fired = true;
    done();
  };
  setTimeout(fire, fallbackMs);
  try {
    const w = window as unknown as { speechSynthesis?: SpeechSynthesis };
    if (!w.speechSynthesis) {
      setTimeout(fire, 700);
      return;
    }
    w.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.85;
    u.pitch = 1.15;
    u.onend = () => setTimeout(fire, 150);
    u.onerror = () => setTimeout(fire, 700);
    w.speechSynthesis.speak(u);
  } catch (e) {
    setTimeout(fire, 700);
  }
}

/* ---------- Save code: packed bytes -> Crockford base32, version byte + CRC-16 ---------- */

const CODE_VERSION = 1;
const B32 = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function crc16(bytes: number[]): number {
  let crc = 0xffff;
  for (let i = 0; i < bytes.length; i++) {
    crc ^= bytes[i] << 8;
    for (let k = 0; k < 8; k++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc;
}

function idxOf(list: Array<{ id: string }>, id: string): number {
  for (let i = 0; i < list.length; i++) if (list[i].id === id) return i + 1;
  return 0;
}

function encodeSave(sv: Save): string {
  const b: number[] = [CODE_VERSION];
  const stars = Math.min(65535, sv.stars);
  b.push(stars >> 8, stars & 255);
  for (let i = 0; i < 8; i += 2) b.push((sv.levels[PATHS[i]] << 4) | sv.levels[PATHS[i + 1]]);
  let mm = 0;
  for (let i = 0; i < MODES.length; i++) if (sv.mastered.indexOf(MODES[i]) >= 0) mm |= 1 << i;
  b.push(mm);
  const lastIdx = Math.max(0, PATHS.indexOf(sv.last));
  b.push(lastIdx | (sv.friend === "mermaid" ? 16 : 0) | (sv.ocean ? 32 : 0) | (sv.castle ? 64 : 0) | (sv.seahorse ? 128 : 0));
  b.push((Math.max(0, idxOf(MITEMS, sv.hair) - 1) & 63) | (sv.dolphin ? 128 : 0));
  b.push(idxOf(ITEMS, sv.hat), idxOf(ITEMS, sv.face), idxOf(ITEMS, sv.neck), idxOf(ITEMS, sv.hold));
  b.push(idxOf(MITEMS, sv.mhead), idxOf(MITEMS, sv.mneck), idxOf(MITEMS, sv.mtail), idxOf(MITEMS, sv.mhold));
  /* unlocks are earned by stars; only list any extra ones */
  const earned = unlockedFor(sv.stars);
  const extra: number[] = [];
  for (let i = 0; i < sv.unlocked.length; i++) {
    const id = sv.unlocked[i];
    if (id !== "none" && earned.indexOf(id) < 0 && ALL_IDS.indexOf(id) >= 0) extra.push(ALL_IDS.indexOf(id));
  }
  b.push(extra.length);
  for (let i = 0; i < extra.length; i++) b.push(extra[i]);
  const tick = Math.min(65535, sv.wtick);
  b.push(tick >> 8, tick & 255);
  const n = WORD_LIST.length;
  b.push(n);
  const bitmap: number[] = [];
  for (let i = 0; i < Math.ceil(n / 8); i++) bitmap.push(0);
  const stats: number[] = [];
  for (let i = 0; i < n; i++) {
    const st = sv.words[WORD_LIST[i]];
    if (!st) continue;
    bitmap[i >> 3] |= 1 << (i & 7);
    const dd = Math.max(0, Math.min(31, st.d - sv.wtick));
    stats.push((st.b << 5) | dd, (Math.min(15, st.c) << 4) | Math.min(15, st.m));
  }
  for (let i = 0; i < bitmap.length; i++) b.push(bitmap[i]);
  for (let i = 0; i < stats.length; i++) b.push(stats[i]);
  const c = crc16(b);
  b.push(c >> 8, c & 255);
  let bits = 0;
  let val = 0;
  let out = "";
  for (let i = 0; i < b.length; i++) {
    val = (val << 8) | b[i];
    bits += 8;
    while (bits >= 5) {
      out += B32[(val >> (bits - 5)) & 31];
      bits -= 5;
    }
    val &= 255;
  }
  if (bits > 0) out += B32[(val << (5 - bits)) & 31];
  const groups: string[] = [];
  for (let i = 0; i < out.length; i += 4) groups.push(out.slice(i, i + 4));
  return "CAPY-" + groups.join("-");
}

function decodeSave(code: string): Save | null {
  try {
    let t = String(code).toUpperCase().replace(/[^0-9A-Z]/g, "");
    if (t.indexOf("CAPY") === 0) t = t.slice(4);
    t = t.replace(/O/g, "0").replace(/[IL]/g, "1");
    if (t.length < 20 || t.length > 400) return null;
    const bytes: number[] = [];
    let bits = 0;
    let val = 0;
    for (let i = 0; i < t.length; i++) {
      const d = B32.indexOf(t[i]);
      if (d < 0) return null;
      val = (val << 5) | d;
      bits += 5;
      if (bits >= 8) {
        bytes.push((val >> (bits - 8)) & 255);
        bits -= 8;
      }
      val &= 255;
    }
    /* leftover padding bits must be zero (catches a changed last letter) */
    if (bits >= 5 || (val & ((1 << bits) - 1)) !== 0) return null;
    if (bytes.length < 22) return null;
    const body = bytes.slice(0, bytes.length - 2);
    const c = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
    if (crc16(body) !== c) return null;
    if (body[0] !== CODE_VERSION) return null;
    let p = 1;
    const next = (): number => {
      if (p >= body.length) throw new Error("short");
      return body[p++];
    };
    const sv = defaultSave();
    sv.stars = (next() << 8) | next();
    for (let i = 0; i < 8; i += 2) {
      const x = next();
      sv.levels[PATHS[i]] = clampLevel(x >> 4);
      sv.levels[PATHS[i + 1]] = clampLevel(x & 15);
    }
    const mm = next();
    sv.mastered = MODES.filter((m, i) => (mm & (1 << i)) !== 0);
    const f1 = next();
    sv.last = PATHS[Math.min(7, f1 & 15)];
    const f2 = next();
    const item = (list: Array<{ id: string }>, k: number): string => (k > 0 && k <= list.length ? list[k - 1].id : "none");
    const hat = item(ITEMS, next());
    const face = item(ITEMS, next());
    const neck = item(ITEMS, next());
    const hold = item(ITEMS, next());
    const mhead = item(MITEMS, next());
    const mneck = item(MITEMS, next());
    const mtail = item(MITEMS, next());
    const mhold = item(MITEMS, next());
    const ne = next();
    const u = unlockedFor(sv.stars);
    for (let i = 0; i < ne; i++) {
      const k = next();
      if (k < ALL_IDS.length && u.indexOf(ALL_IDS[k]) < 0) u.push(ALL_IDS[k]);
    }
    sv.wtick = (next() << 8) | next();
    const n = next();
    const bitmap: number[] = [];
    for (let i = 0; i < Math.ceil(n / 8); i++) bitmap.push(next());
    const words: { [w: string]: WStat } = {};
    for (let i = 0; i < n; i++) {
      if ((bitmap[i >> 3] & (1 << (i & 7))) === 0) continue;
      const x = next();
      const y = next();
      if (i < WORD_LIST.length) words[WORD_LIST[i]] = { b: Math.min(5, x >> 5), c: y >> 4, m: y & 15, d: sv.wtick + (x & 31) };
    }
    if (p !== body.length) return null;
    /* run it through the normal save checks so a code can never load anything invalid */
    const raw = {
      ...sv,
      unlocked: u,
      hat, face, neck, hold, mhead, mneck, mtail, mhold,
      hair: (f2 & 63) < MITEMS.length ? MITEMS[f2 & 63].id : "h_pink",
      friend: f1 & 16 ? "mermaid" : "capy",
      ocean: (f1 & 32) !== 0,
      castle: (f1 & 64) !== 0,
      seahorse: (f1 & 128) !== 0,
      dolphin: (f2 & 128) !== 0,
      words,
    };
    return parseSave(JSON.stringify(raw));
  } catch (e) {
    return null;
  }
}

function codePreview(sv: Save): string {
  const parts = ["Adalynn: " + sv.stars + " stars", pathTitle(sv.last) + " L" + sv.levels[sv.last]];
  const seen = Object.keys(sv.words).length;
  if (seen > 0) parts.push(seen + " Word Pond words");
  if (sv.unlocked.indexOf("mermaid") >= 0) parts.push(MERMAID_NAME + " the Mermaid unlocked");
  return parts.join(", ");
}

/* ---------- Word Pond: spaced repetition + look-alike choices ---------- */

const WORD_GAPS = [1, 2, 4, 7, 12, 20];

function wordStat(sv: Save, w: string): WStat {
  const st = sv.words[w];
  if (st) return st;
  return { b: SHAKY_WORDS.indexOf(w) >= 0 ? 0 : 1, c: 0, m: 0, d: sv.wtick };
}

function wordWeight(sv: Save, w: string, tickAhead: number): number {
  const st = wordStat(sv, w);
  const base = [8, 5, 3, 2, 1, 1][Math.min(5, st.b)];
  return base * (st.d <= sv.wtick + tickAhead ? 3 : 1);
}

function pickWordRound(sv: Save, n: number): string[] {
  const out: string[] = [];
  for (let k = 0; k < n; k++) {
    const pool: string[] = [];
    const weights: number[] = [];
    for (let i = 0; i < WORD_LIST.length; i++) {
      const w = WORD_LIST[i];
      if (out.length > 0 && out[out.length - 1] === w) continue;
      if (out.filter((x) => x === w).length >= 2) continue;
      pool.push(w);
      weights.push(wordWeight(sv, w, k));
    }
    let total = 0;
    for (let i = 0; i < weights.length; i++) total += weights[i];
    let r = Math.random() * total;
    let pick = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) {
      r -= weights[i];
      if (r <= 0) {
        pick = pool[i];
        break;
      }
    }
    out.push(pick);
  }
  return out;
}

function wordChoices(w: string, level: number): string[] {
  const bad = (HOMOPHONES[w] || []).map((x) => x.toLowerCase());
  const ok = (x: string): boolean => x !== w && bad.indexOf(x.toLowerCase()) < 0;
  const looks = (shuffle((LOOKALIKES[w] || []).slice()) as string[]).filter(ok);
  const nLook = level <= 2 ? 2 : 3;
  const set: string[] = [w];
  for (let i = 0; i < looks.length && set.length < 1 + nLook; i++) if (set.indexOf(looks[i]) < 0) set.push(looks[i]);
  const others = (shuffle(WORD_LIST.slice()) as string[]).filter(
    (x) => ok(x) && x[0].toLowerCase() !== w[0].toLowerCase(),
  );
  for (let i = 0; i < others.length && set.length < 4; i++) if (set.indexOf(others[i]) < 0) set.push(others[i]);
  for (let i = 0; i < looks.length && set.length < 4; i++) if (set.indexOf(looks[i]) < 0) set.push(looks[i]);
  return shuffle(set) as string[];
}

function applyWordResult(sv: Save, w: string, firstTry: boolean): Save {
  const st = wordStat(sv, w);
  const tick = Math.min(60000, sv.wtick + 1);
  const b = firstTry ? Math.min(5, st.b + 1) : 0;
  const nst: WStat = {
    b,
    c: Math.min(15, st.c + (firstTry ? 1 : 0)),
    m: Math.min(15, st.m + (firstTry ? 0 : 1)),
    d: tick + WORD_GAPS[b],
  };
  const words = { ...sv.words, [w]: nst };
  return { ...sv, wtick: tick, words: normWords(words, tick) };
}

function wordGroup(sv: Save, w: string): "solid" | "learning" | "shaky" | "new" {
  const st = sv.words[w];
  if (!st) return "new";
  if (st.b >= 4) return "solid";
  if (st.b === 0) return "shaky";
  return "learning";
}

/* ---------- Reward ladder helpers ---------- */

function nextPrize(stars: number): { cost: number; id: string; label: string } | null {
  let best: { cost: number; id: string; label: string } | null = null;
  const all: Array<{ id: string; cost: number; name: string; slot: string }> = (ITEMS as Array<{ id: string; cost: number; name: string; slot: string }>).concat(MITEMS);
  for (let i = 0; i < all.length; i++) {
    const it = all[i];
    if (it.cost > stars && (!best || it.cost < best.cost)) best = { cost: it.cost, id: it.id, label: it.name };
  }
  return best;
}

function ladderRows(): Array<{ cost: number; text: string; big: boolean }> {
  const rows: Array<{ cost: number; text: string; big: boolean }> = [];
  for (let i = 0; i < MITEMS.length; i++) {
    const it = MITEMS[i];
    if (it.slot === "hair" && it.cost === 160) continue;
    const text =
      it.id === "mermaid"
        ? it.name + " + 8 free hair colors"
        : it.id === "m_queen"
          ? it.name + " + trophy, big celebration"
          : it.slot === "hair"
            ? it.name + " hair"
            : it.name;
    rows.push({ cost: it.cost, text, big: !!it.big });
  }
  return rows;
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

/* ---------- Mermaid friend art (friendly generic cartoon) ---------- */

const GRADS: { [id: string]: string[] } = {
  h_rainbow: ["#EF4444", "#F59E0B", "#FACC15", "#22C55E", "#3B82F6", "#8B5CF6"],
  h_galaxy: ["#1E1B4B", "#4C1D95", "#7C3AED", "#312E81"],
  h_cotton: ["#F9A8D4", "#F0ABFC", "#A5B4FC", "#93C5FD"],
  h_sunset: ["#FB923C", "#F97316", "#F472B6", "#C026D3"],
  m_rainbowtail: ["#EF4444", "#F59E0B", "#22C55E", "#3B82F6", "#8B5CF6"],
  m_goldtail: ["#FDE68A", "#F59E0B", "#FCD34D", "#B45309"],
};

function GradDef(props: { id: string }) {
  const stops = GRADS[props.id];
  if (!stops) return null;
  return (
    <linearGradient id={"g-" + props.id} x1="0" y1="0" x2="0" y2="1">
      {stops.map((c, i) => (
        <stop key={i} offset={String(i / (stops.length - 1))} stopColor={c} />
      ))}
    </linearGradient>
  );
}

function hairFill(id: string): string {
  if (GRADS[id]) return "url(#g-" + id + ")";
  const it = findM(id);
  return it && it.color ? it.color : "#F472B6";
}

function MHead(props: { id: string }) {
  const id = props.id;
  if (id === "m_shellcrown") {
    return (
      <g>
        <path d="M38 22 Q50 2 62 22 Z" fill="#FBCFE8" stroke="#9D174D" strokeWidth="1.2" />
        <path d="M50 22 L50 8 M44 21 L46 10 M56 21 L54 10" stroke="#9D174D" strokeWidth="1" />
      </g>
    );
  }
  if (id === "m_starfish") {
    return (
      <polygon
        points="66,18 68.5,23.5 74,24 70,28 71.5,33.5 66,30.5 60.5,33.5 62,28 58,24 63.5,23.5"
        fill="#FB923C"
        stroke="#9A3412"
        strokeWidth="1"
      />
    );
  }
  if (id === "m_tiara") {
    return (
      <g>
        <path d="M34 24 Q50 12 66 24" fill="none" stroke="#E5E7EB" strokeWidth="2" />
        {[36, 42, 50, 58, 64].map((x, i) => (
          <circle key={i} cx={x} cy={i === 2 ? 14 : i === 1 || i === 3 ? 17 : 21} r={i === 2 ? 3.2 : 2.4} fill="#FFFFFF" stroke="#64748B" strokeWidth="0.8" />
        ))}
      </g>
    );
  }
  if (id === "m_moon") {
    return (
      <g>
        <path d="M30 20 A8 8 0 1 0 40 30 A6 6 0 1 1 30 20 Z" fill="#FDE68A" stroke="#92400E" strokeWidth="1" />
        <polygon points="41,16 42.2,19 45,19.3 42.8,21.2 43.5,24 41,22.4 38.5,24 39.2,21.2 37,19.3 39.8,19" fill="#FEF3C7" stroke="#92400E" strokeWidth="0.6" />
      </g>
    );
  }
  if (id === "m_queen") {
    return (
      <g>
        <polygon points="34,24 36,8 43,17 50,4 57,17 64,8 66,24" fill="#FACC15" stroke="#92400E" strokeWidth="1.2" />
        <circle cx="50" cy="6" r="2.6" fill="#38BDF8" stroke="#075985" strokeWidth="0.6" />
        <circle cx="36" cy="10" r="2" fill="#F472B6" />
        <circle cx="64" cy="10" r="2" fill="#A78BFA" />
        <rect x="40" y="19" width="20" height="3" rx="1.5" fill="#FDE68A" />
      </g>
    );
  }
  return null;
}

function MNeck(props: { id: string }) {
  const id = props.id;
  if (id === "m_pearls") {
    return (
      <g>
        {[41, 44.5, 48, 51.5, 55, 58.5].map((x, i) => (
          <circle key={i} cx={x + 0.5} cy={56 + (i === 0 || i === 5 ? 0 : i === 1 || i === 4 ? 1.6 : 2.3)} r="1.9" fill="#FFFFFF" stroke="#64748B" strokeWidth="0.6" />
        ))}
      </g>
    );
  }
  if (id === "m_shellnecklace") {
    return (
      <g>
        <path d="M41 55 Q50 62 59 55" fill="none" stroke="#7C2D12" strokeWidth="0.9" />
        <path d="M46.5 64 Q50 56 53.5 64 Z" fill="#FDBA74" stroke="#7C2D12" strokeWidth="0.8" />
      </g>
    );
  }
  if (id === "m_seaglass") {
    return (
      <g>
        <path d="M41 55 Q50 62 59 55" fill="none" stroke="#334155" strokeWidth="0.9" />
        <rect x="43.5" y="57" width="3" height="3" rx="1" fill="#5EEAD4" stroke="#134E4A" strokeWidth="0.5" />
        <rect x="48.5" y="59" width="3" height="3" rx="1" fill="#93C5FD" stroke="#1E3A8A" strokeWidth="0.5" />
        <rect x="53.5" y="57" width="3" height="3" rx="1" fill="#A7F3D0" stroke="#065F46" strokeWidth="0.5" />
      </g>
    );
  }
  if (id === "m_gem") {
    return (
      <g>
        <path d="M41 55 Q50 62 59 55" fill="none" stroke="#B45309" strokeWidth="1" />
        <path d="M50 58 L54 62 L50 68 L46 62 Z" fill="#38BDF8" stroke="#075985" strokeWidth="0.9" />
      </g>
    );
  }
  return null;
}

function MHold(props: { id: string }) {
  const id = props.id;
  if (id === "m_bubblewand") {
    return (
      <g>
        <line x1="74" y1="62" x2="80" y2="44" stroke="#A855F7" strokeWidth="2" strokeLinecap="round" />
        <circle cx="81.5" cy="40" r="4.5" fill="none" stroke="#A855F7" strokeWidth="1.8" />
        <circle cx="88" cy="32" r="3" fill="#E0F2FE" stroke="#0284C7" strokeWidth="0.8" />
        <circle cx="92" cy="24" r="2" fill="#E0F2FE" stroke="#0284C7" strokeWidth="0.8" />
      </g>
    );
  }
  if (id === "m_treasure") {
    return (
      <g>
        <rect x="70" y="56" width="18" height="12" rx="2" fill="#92400E" stroke="#451A03" strokeWidth="1" />
        <path d="M70 58 Q79 49 88 58 Z" fill="#B45309" stroke="#451A03" strokeWidth="1" />
        <rect x="77.5" y="58" width="3" height="4" fill="#FACC15" />
        <circle cx="74" cy="54" r="1.6" fill="#FACC15" />
        <circle cx="84" cy="54" r="1.6" fill="#FFFFFF" />
      </g>
    );
  }
  if (id === "m_conch") {
    return (
      <g>
        <path d="M72 62 L90 48 Q94 56 86 62 Q80 66 72 62 Z" fill="#FBCFE8" stroke="#9D174D" strokeWidth="1" />
        <path d="M80 60 L88 52 M77 61 L85 55" stroke="#9D174D" strokeWidth="0.7" />
      </g>
    );
  }
  return null;
}

function Seahorse(props: { size?: number }) {
  const sz = props.size ? props.size : 40;
  return (
    <svg width={sz} height={sz * 1.4} viewBox="0 0 30 42" aria-label="Seahorse pet">
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -3; 0 0" dur="2.4s" repeatCount="indefinite" />
        <path d="M10 18 Q4 21 9 26 Z" fill="#FDE68A" stroke="#9A3412" strokeWidth="0.9" />
        <path d="M15 28 Q11 37 17 38 Q22 38 21 33 Q20 30 17 31.5" fill="none" stroke="#9A3412" strokeWidth="4.6" strokeLinecap="round" />
        <path d="M15 28 Q11 37 17 38 Q22 38 21 33 Q20 30 17 31.5" fill="none" stroke="#FDBA74" strokeWidth="2.8" strokeLinecap="round" />
        <ellipse cx="15" cy="21" rx="5.5" ry="8.5" fill="#FDBA74" stroke="#9A3412" strokeWidth="1" />
        <path d="M13 15 Q15 21 13 27 M15.5 15 Q17.5 21 15.5 27" fill="none" stroke="#9A3412" strokeWidth="0.6" opacity="0.6" />
        <rect x="18" y="8.6" width="9" height="3.6" rx="1.8" fill="#FDBA74" stroke="#9A3412" strokeWidth="1" />
        <circle cx="16" cy="10" r="5.2" fill="#FDBA74" stroke="#9A3412" strokeWidth="1" />
        <path d="M12 6 L13 3 L15 5.2 L16.5 2.5 L17.6 5.4" fill="#FDE68A" stroke="#9A3412" strokeWidth="0.8" />
        <circle cx="17.2" cy="9.4" r="1.3" fill="#2B1B0E" />
        <circle cx="17.6" cy="9" r="0.4" fill="#FFFFFF" />
      </g>
    </svg>
  );
}

function Dolphin(props: { size?: number }) {
  const sz = props.size ? props.size : 56;
  return (
    <svg width={sz} height={sz * 0.7} viewBox="0 0 60 42" aria-label="Dolphin friend">
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -4; 0 0" dur="2s" repeatCount="indefinite" />
        <path d="M6 26 Q14 10 34 12 Q48 13 54 22 Q50 24 46 23 Q40 30 26 30 Q18 30 12 28 L4 34 L6 26 Z" fill="#7DD3FC" stroke="#075985" strokeWidth="1.2" />
        <path d="M28 12 L32 4 L36 13" fill="#7DD3FC" stroke="#075985" strokeWidth="1.2" />
        <circle cx="44" cy="18" r="1.4" fill="#0C4A6E" />
        <path d="M46 22 Q49 23 52 22" fill="none" stroke="#075985" strokeWidth="0.9" />
      </g>
    </svg>
  );
}

function CoralCastle(props: { size?: number }) {
  const sz = props.size ? props.size : 70;
  return (
    <svg width={sz} height={sz} viewBox="0 0 60 60" aria-label="Coral castle">
      <rect x="10" y="26" width="40" height="30" fill="#FDA4AF" stroke="#9F1239" strokeWidth="1.2" />
      <rect x="6" y="16" width="12" height="40" fill="#FB7185" stroke="#9F1239" strokeWidth="1.2" />
      <rect x="42" y="16" width="12" height="40" fill="#FB7185" stroke="#9F1239" strokeWidth="1.2" />
      <polygon points="6,16 12,6 18,16" fill="#C084FC" stroke="#6B21A8" strokeWidth="1" />
      <polygon points="42,16 48,6 54,16" fill="#C084FC" stroke="#6B21A8" strokeWidth="1" />
      <polygon points="22,26 30,12 38,26" fill="#C084FC" stroke="#6B21A8" strokeWidth="1" />
      <path d="M25 56 L25 44 Q30 38 35 44 L35 56 Z" fill="#7F1D1D" />
      <circle cx="12" cy="30" r="2" fill="#FEF3C7" />
      <circle cx="48" cy="30" r="2" fill="#FEF3C7" />
    </svg>
  );
}

function Trophy(props: { size?: number }) {
  const sz = props.size ? props.size : 44;
  return (
    <svg width={sz} height={sz} viewBox="0 0 40 40" aria-label="Mermaid Queen trophy">
      <path d="M11 6 L29 6 L28 16 Q27 24 20 25 Q13 24 12 16 Z" fill="#FACC15" stroke="#92400E" strokeWidth="1.2" />
      <path d="M11 9 Q4 9 6 15 Q8 19 12 18 M29 9 Q36 9 34 15 Q32 19 28 18" fill="none" stroke="#92400E" strokeWidth="1.4" />
      <rect x="17" y="25" width="6" height="6" fill="#EAB308" />
      <rect x="12" y="31" width="16" height="5" rx="1.5" fill="#92400E" />
      <polygon points="20,9 21.5,13 25.5,13 22.3,15.5 23.5,19.5 20,17 16.5,19.5 17.7,15.5 14.5,13 18.5,13" fill="#FEF3C7" />
    </svg>
  );
}

function Mermaid(props: {
  hair: string;
  head?: string;
  neck?: string;
  tail?: string;
  hold?: string;
  size?: number;
  hop?: boolean;
  seahorse?: boolean;
  dolphin?: boolean;
}) {
  const size = props.size ? props.size : 86;
  const tail = props.tail ? props.tail : "none";
  const hf = hairFill(props.hair);
  const tailFill = GRADS[tail] ? "url(#g-" + tail + ")" : "#14B8A6";
  const skin = "#F7D2B0";
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "flex-end",
        gap: 2,
        transform: props.hop ? "translateY(-8px)" : "none",
        transition: "transform 400ms ease",
      }}
    >
      {props.dolphin ? <Dolphin size={size * 0.5} /> : null}
      <svg width={size * 0.78} height={size} viewBox="0 0 100 128" style={{ overflow: "visible" }} aria-label={MERMAID_NAME + " the Mermaid"}>
        <defs>
          <GradDef id={props.hair} />
          <GradDef id={tail} />
        </defs>
        <path d="M30 40 Q22 14 50 12 Q78 14 70 40 L76 80 Q66 86 60 74 L40 74 Q34 86 24 80 Z" fill={hf} stroke="#00000033" strokeWidth="1" />
        {props.hair === "h_galaxy" ? (
          <g fill="#FFFFFF">
            <circle cx="30" cy="62" r="1" />
            <circle cx="70" cy="56" r="1.2" />
            <circle cx="66" cy="72" r="0.9" />
            <circle cx="33" cy="48" r="0.8" />
          </g>
        ) : null}
        <path d="M38 76 L62 76 Q67 98 57 113 Q53 119 55 125 L45 125 Q44 112 40 101 Q35 88 38 76 Z" fill={tailFill} stroke="#134E4A" strokeWidth="1.2" />
        <path d="M50 121 Q37 125 30 136 Q45 135 50 128 Q55 135 70 136 Q63 125 50 121 Z" fill={tailFill} stroke="#134E4A" strokeWidth="1.2" />
        <path d="M43 88 Q46 91 49 88 M51 88 Q54 91 57 88 M45 99 Q48 102 51 99 M47 110 Q50 113 53 110" fill="none" stroke="#134E4A" strokeWidth="0.8" opacity="0.6" />
        {tail === "m_sparkletail" || tail === "m_goldtail" ? (
          <g fill="#FFFFFF" stroke="#0F766E" strokeWidth="0.4">
            <polygon points="44,92 45,94.5 47.5,95 45,96 44,98.5 43,96 40.5,95 43,94.5" />
            <polygon points="56,100 57,102.5 59.5,103 57,104 56,106.5 55,104 52.5,103 55,102.5" />
            <polygon points="50,82 50.8,84 52.8,84.4 50.8,85.2 50,87.2 49.2,85.2 47.2,84.4 49.2,84" />
            <polygon points="48,116 48.8,118 50.8,118.4 48.8,119.2 48,121.2 47.2,119.2 45.2,118.4 47.2,118" />
          </g>
        ) : null}
        <path d="M40 54 Q50 58 60 54 L63 78 L37 78 Z" fill={skin} />
        <path d="M37 76 Q43 73 50 76 Q57 73 63 76 L63 80 L37 80 Z" fill="#0F766E" />
        <path d="M41 58 Q30 68 34 80" fill="none" stroke={skin} strokeWidth="6" strokeLinecap="round" />
        <path d="M59 58 Q70 68 74 62" fill="none" stroke={skin} strokeWidth="6" strokeLinecap="round" />
        <path d="M40 66 Q45 58 50 66 Q45 69 40 66 Z" fill="#C4B5FD" stroke="#5B21B6" strokeWidth="0.9" />
        <path d="M50 66 Q55 58 60 66 Q55 69 50 66 Z" fill="#C4B5FD" stroke="#5B21B6" strokeWidth="0.9" />
        <rect x="46" y="48" width="8" height="8" fill={skin} />
        <circle cx="50" cy="37" r="16" fill={skin} />
        <path d="M33 36 Q34 19 50 20 Q66 19 67 36 Q61 27 50 29 Q39 27 33 36 Z" fill={hf} />
        <ellipse cx="44" cy="38" rx="2.3" ry="2.8" fill="#2B1B0E" />
        <ellipse cx="56" cy="38" rx="2.3" ry="2.8" fill="#2B1B0E" />
        <circle cx="44.8" cy="37" r="0.8" fill="#FFFFFF" />
        <circle cx="56.8" cy="37" r="0.8" fill="#FFFFFF" />
        <circle cx="40" cy="44" r="2.6" fill="#F9A8D4" opacity="0.6" />
        <circle cx="60" cy="44" r="2.6" fill="#F9A8D4" opacity="0.6" />
        <path d="M45 45 Q50 49 55 45" fill="none" stroke="#7C2D12" strokeWidth="1.4" strokeLinecap="round" />
        <MNeck id={props.neck ? props.neck : "none"} />
        <MHead id={props.head ? props.head : "none"} />
        <MHold id={props.hold ? props.hold : "none"} />
      </svg>
      {props.seahorse ? <Seahorse size={size * 0.34} /> : null}
    </div>
  );
}

function HairSwatch(props: { id: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
      <defs>
        <GradDef id={props.id} />
      </defs>
      <circle cx="17" cy="17" r="15" fill={hairFill(props.id)} stroke="#334155" strokeWidth="2" />
    </svg>
  );
}

/* Small picture of a prize, used for the "next prize" silhouette. */
function PrizeArt(props: { id: string; size: number }) {
  const id = props.id;
  const sz = props.size;
  const ci = findItem(id);
  if (ci) {
    return (
      <Capy
        hat={ci.slot === "hat" ? id : "none"}
        face={ci.slot === "face" ? id : "none"}
        neck={ci.slot === "neck" ? id : "none"}
        hold={ci.slot === "hold" ? id : "none"}
        size={sz}
      />
    );
  }
  const m = findM(id);
  if (!m) return null;
  if (m.slot === "pet") return id === "dolphin" ? <Dolphin size={sz} /> : <Seahorse size={sz * 0.7} />;
  if (id === "castle") return <CoralCastle size={sz} />;
  if (id === "ocean") return <div style={{ fontSize: sz * 0.6, lineHeight: 1 }}>🌊</div>;
  return (
    <Mermaid
      hair={m.slot === "hair" ? id : "h_pink"}
      head={m.slot === "mhead" ? id : "none"}
      neck={m.slot === "mneck" ? id : "none"}
      tail={m.slot === "mtail" ? id : "none"}
      hold={m.slot === "mhold" ? id : "none"}
      size={sz}
    />
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
  const [armed, setArmed] = useState<boolean>(false);
  const [celebrate, setCelebrate] = useState<{ title: string; sub: string; queen: boolean } | null>(null);
  const [holdPct, setHoldPct] = useState<number>(0);
  const [myCode, setMyCode] = useState<string>("");
  const [copied, setCopied] = useState<string>("");
  const [codeInput, setCodeInput] = useState<string>("");
  const [codeMsg, setCodeMsg] = useState<string>("");
  const [pending, setPending] = useState<Save | null>(null);
  const [dressTab, setDressTab] = useState<Friend>(() => loadSave().friend);
  const [wpCards, setWpCards] = useState<string[]>([]);
  const [wpIdx, setWpIdx] = useState<number>(0);
  const [wpChoices, setWpChoices] = useState<string[]>([]);
  const [wpWrong, setWpWrong] = useState<string[]>([]);
  const [wpSolved, setWpSolved] = useState<boolean>(false);
  const [wpRoundStars, setWpRoundStars] = useState<number>(0);
  const [wpSummary, setWpSummary] = useState<boolean>(false);
  const [wpFeedback, setWpFeedback] = useState<string>("");
  const [wpStreak, setWpStreak] = useState<number>(0);
  /* Plain mutable box (works like a ref) so rapid taps in the same moment see the latest state. */
  const [R] = useState(() => ({
    armed: false,
    busy: false,
    miss: false,
    armTimer: 0 as unknown as ReturnType<typeof setTimeout>,
    holdTimer: 0 as unknown as ReturnType<typeof setInterval>,
    wpArmed: false,
    wpBusy: false,
    wpMiss: false,
    wpToken: 0,
    cards: [] as string[],
  }));
  const friendName = save.friend === "mermaid" ? MERMAID_NAME : "Capy";

  useEffect(() => {
    writeSave(save);
  }, [save]);

  useEffect(() => {
    setHop(true);
    const t = setTimeout(() => setHop(false), 450);
    return () => clearTimeout(t);
  }, [q]);

  /* Answers stay off for a moment when a new question or step appears, so taps carried over
     from the last question can't count. */
  useEffect(() => {
    if (screen !== "play") return;
    disarm(650);
  }, [q, stepIdx, usingHelp, screen]);

  useEffect(() => {
    return () => {
      clearTimeout(R.armTimer);
      clearInterval(R.holdTimer);
    };
  }, []);

  function disarm(ms: number): void {
    R.armed = false;
    setArmed(false);
    clearTimeout(R.armTimer);
    R.armTimer = setTimeout(() => {
      R.armed = true;
      setArmed(true);
    }, ms);
  }

  const activeParts: Part[] = usingHelp && q.helpParts.length > 0 ? q.helpParts : q.parts;
  const part: Part = activeParts[Math.min(stepIdx, activeParts.length - 1)];
  const multi = activeParts.length > 1;

  function applyStars(prev: Save, add: number): Save {
    const stars = Math.min(65535, prev.stars + add);
    const earned = unlockedFor(stars);
    const unlocked = prev.unlocked.slice();
    const names: string[] = [];
    const fresh: string[] = [];
    for (let i = 0; i < earned.length; i++) {
      if (unlocked.indexOf(earned[i]) < 0) {
        unlocked.push(earned[i]);
        fresh.push(earned[i]);
        const r = findReward(earned[i]);
        if (r && earned[i] !== "none" && !(r.slot === "hair" && r.cost === 160) && earned[i] !== "mermaid") {
          names.push(r.slot === "hair" ? r.name + " hair" : r.name);
        }
      }
    }
    const out: Save = { ...prev, stars, unlocked: canonUnlocked(unlocked) };
    if (fresh.indexOf("mermaid") >= 0) {
      setUnlockNote("New friend! " + MERMAID_NAME + " the Mermaid wants to play. Tap her on the map, then pick her hair color in Dress Up.");
      setCelebrate({ title: "Meet " + MERMAID_NAME + " the Mermaid!", sub: "A new friend, plus 8 hair colors to try.", queen: false });
      say("Yay! You unlocked a new friend, " + MERMAID_NAME + " the Mermaid!");
    } else if (names.length > 0) {
      setUnlockNote("New Dress Up item! You unlocked the " + names.join(" and the ") + ". Tap Dress Up to try it on.");
    }
    if (fresh.indexOf("seahorse") >= 0) {
      out.seahorse = true;
      setCelebrate({ title: "Big prize! A seahorse pet!", sub: "Your seahorse swims beside " + MERMAID_NAME + ".", queen: false });
    }
    if (fresh.indexOf("ocean") >= 0) {
      out.ocean = true;
      setCelebrate({ title: "Big prize! The Ocean map!", sub: "The map is now under the sea.", queen: false });
    }
    if (fresh.indexOf("dolphin") >= 0) {
      out.dolphin = true;
      setCelebrate({ title: "Big prize! A dolphin friend!", sub: "A dolphin joins " + MERMAID_NAME + ".", queen: false });
    }
    if (fresh.indexOf("castle") >= 0) {
      out.castle = true;
      setCelebrate({ title: "Big prize! A coral castle!", sub: "Look for it on the map.", queen: false });
    }
    if (fresh.indexOf("m_queen") >= 0) {
      out.mhead = "m_queen";
      setCelebrate({ title: "You are the Mermaid Queen!", sub: "500 stars! You won the Mermaid Queen crown and the trophy.", queen: true });
      say("Wow! Five hundred stars! You are the Mermaid Queen!");
    }
    return out;
  }

  function resetQuestionState(): void {
    R.busy = false;
    R.miss = false;
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
    setSave((prev) => (prev.last === m ? prev : { ...prev, last: m }));
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
    const firstTry = !R.miss && !missedQ;
    const alreadyMastered = save.mastered.indexOf(mode) >= 0;
    let lv = save.levels[mode];
    let s = 0;
    if (firstTry) {
      s = streak + 1;
      setStreak(s);
      const praise = ["Yay! First try! ⭐", "Super job! ⭐", friendName + " is so proud! ⭐", "Brilliant! ⭐"][rand(0, 3)];
      setFeedback(alreadyMastered ? praise.replace(" ⭐", "") : praise);
      say(praise.replace(" ⭐", ""));
      if (s % 3 === 0 && lv < 6) lv = lv + 1;
      const willMaster = !alreadyMastered && save.levels[mode] >= 6 && s % 3 === 0;
      const newLv = lv;
      setSave((prev) => {
        const next = alreadyMastered ? prev : applyStars(prev, 1);
        const mastered =
          willMaster && next.mastered.indexOf(mode) < 0 ? MODES.filter((x) => x === mode || next.mastered.indexOf(x) >= 0) : next.mastered;
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
    if (locked || R.busy || !R.armed) return;
    const ok =
      typeof part.answer === "number"
        ? typeof value === "number" && value === part.answer
        : String(value) === String(part.answer);
    setPicked(value);
    if (ok) {
      setMisses(0);
      if (part.done) setDoneSteps((d) => d.concat([part.done]));
      if (stepIdx < activeParts.length - 1) {
        R.armed = false;
        const nxt = activeParts[stepIdx + 1];
        setStepIdx(stepIdx + 1);
        setTyped("");
        setPicked(null);
        setHintLevel(0);
        setFeedback("Yes! " + (part.done ? part.done + "." : ""));
        say("Yes! " + nxt.speak);
        return;
      }
      R.busy = true;
      finish();
    } else {
      R.miss = true;
      disarm(900);
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
    if (locked || !R.armed) return;
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

  function wearM(slot: "mhead" | "mneck" | "mtail" | "mhold", id: string): void {
    if (save.unlocked.indexOf(id) < 0) return;
    setSave((prev) => ({ ...prev, [slot]: prev[slot] === id ? "none" : id }));
  }

  function setHair(id: string): void {
    if (save.unlocked.indexOf(id) < 0) return;
    setSave((prev) => ({ ...prev, hair: id }));
    const it = findM(id);
    if (it) say(it.name + " hair!");
  }

  function toggleFlag(k: "seahorse" | "dolphin" | "ocean" | "castle"): void {
    if (save.unlocked.indexOf(k) < 0) return;
    setSave((prev) => ({ ...prev, [k]: !prev[k] }));
  }

  function pickFriend(f: Friend): void {
    if (f === "mermaid" && save.unlocked.indexOf("mermaid") < 0) return;
    setSave((prev) => ({ ...prev, friend: f }));
    setDressTab(f);
    say(f === "mermaid" ? "Hi! I'm " + MERMAID_NAME + "!" : "Hi! I'm Capy!");
  }

  /* ---------- Word Pond ---------- */

  function wpStartCard(cards: string[], idx: number): void {
    const w = cards[idx];
    setWpIdx(idx);
    setWpChoices(wordChoices(w, save.levels.word));
    setWpWrong([]);
    setWpSolved(false);
    setWpFeedback("Listen…");
    R.wpBusy = false;
    R.wpMiss = false;
    wpListen(w);
  }

  /* Choices stay off until the word has been spoken (or a fallback timeout passes). */
  function wpListen(w: string): void {
    R.wpArmed = false;
    setArmed(false);
    R.wpToken += 1;
    const tok = R.wpToken;
    sayThen("Find the word: " + w, () => {
      if (tok !== R.wpToken) return;
      R.wpArmed = true;
      setArmed(true);
      setWpFeedback("Tap the word you heard.");
    }, 3200);
  }

  function startWords(): void {
    const cards = pickWordRound(save, WORD_ROUND);
    R.cards = cards.slice();
    setWpCards(cards);
    setWpRoundStars(0);
    setWpSummary(false);
    setWpStreak(0);
    setUnlockNote("");
    setSave((prev) => (prev.last === "word" ? prev : { ...prev, last: "word" }));
    setScreen("words");
    wpStartCard(cards, 0);
  }

  function wpJudge(c: string): void {
    if (!R.wpArmed || R.wpBusy || wpSolved || wpSummary) return;
    const w = R.cards[wpIdx];
    if (c === w) {
      R.wpBusy = true;
      R.wpArmed = false;
      setWpSolved(true);
      const firstTry = !R.wpMiss;
      let s = 0;
      if (firstTry) {
        s = wpStreak + 1;
        setWpStreak(s);
        setWpRoundStars((n) => n + 1);
        const lvUp = s % 3 === 0 && save.levels.word < 6;
        setSave((prev) => {
          const next = applyStars(applyWordResult(prev, w, true), 1);
          return lvUp ? { ...next, levels: { ...next.levels, word: Math.min(6, next.levels.word + 1) } } : next;
        });
        setWpFeedback("Yes! That says “" + w + "” ⭐");
        say("Yes! " + w + "!");
      } else {
        setWpStreak(0);
        setSave((prev) => applyWordResult(prev, w, false));
        setWpFeedback("You found it! That says “" + w + "”. Next one is your star chance.");
        say("You found it! " + w + ".");
      }
      const nextIdx = wpIdx + 1;
      const cards = R.cards;
      R.wpToken += 1;
      const tok = R.wpToken;
      setTimeout(() => {
        if (tok !== R.wpToken) return;
        if (nextIdx >= cards.length) {
          setWpSummary(true);
          say("Great reading!");
        } else wpStartCard(cards, nextIdx);
      }, firstTry ? 1500 : 2300);
      return;
    }
    if (wpWrong.indexOf(c) >= 0) return;
    if (!R.wpMiss) {
      /* a missed word comes back again later in this round */
      const at = Math.min(wpIdx + 3, R.cards.length - 1);
      if (at > wpIdx + 1 && R.cards.slice(wpIdx + 1).indexOf(w) < 0 && R.cards[at - 1] !== w && R.cards[at + 1] !== w) {
        R.cards[at] = w;
        setWpCards(R.cards.slice());
      }
    }
    R.wpMiss = true;
    setWpStreak(0);
    setWpWrong((ws) => ws.concat([c]));
    setWpFeedback("That one says “" + c + "”. Listen again!");
    R.wpArmed = false;
    setArmed(false);
    R.wpToken += 1;
    const tok = R.wpToken;
    sayThen("That says " + c + ". Find the word: " + w, () => {
      if (tok !== R.wpToken) return;
      R.wpArmed = true;
      setArmed(true);
    }, 4200);
  }

  function leaveWords(): void {
    R.wpToken += 1;
    R.wpArmed = false;
    setScreen("home");
  }

  /* ---------- Grown-up gate + save code ---------- */

  function holdStart(): void {
    clearInterval(R.holdTimer);
    const t0 = Date.now();
    setHoldPct(1);
    R.holdTimer = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - t0) / 2000) * 100);
      setHoldPct(pct);
      if (pct >= 100) {
        clearInterval(R.holdTimer);
        setHoldPct(0);
        setMyCode("");
        setCodeInput("");
        setCodeMsg("");
        setPending(null);
        setCopied("");
        setScreen("grownup");
      }
    }, 50);
  }

  function holdEnd(): void {
    clearInterval(R.holdTimer);
    setHoldPct(0);
  }

  function makeCode(): void {
    setMyCode(encodeSave(save));
    setCopied("");
  }

  function copyCode(): void {
    const code = myCode;
    const fallback = (): void => {
      try {
        const ta = document.createElement("textarea");
        ta.value = code;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopied("Copied!");
      } catch (e) {
        setCopied("Couldn't copy automatically. Press and hold the code to select it.");
      }
    };
    try {
      const nav = navigator as unknown as { clipboard?: { writeText: (t: string) => Promise<void> } };
      if (nav.clipboard && nav.clipboard.writeText) {
        nav.clipboard.writeText(code).then(() => setCopied("Copied!"), fallback);
      } else fallback();
    } catch (e) {
      fallback();
    }
  }

  function checkCode(): void {
    const sv = decodeSave(codeInput);
    if (!sv) {
      setPending(null);
      setCodeMsg("That code doesn't look right. Check the letters and try again. Nothing was changed.");
      return;
    }
    setPending(sv);
    setCodeMsg("");
  }

  function confirmCode(): void {
    if (!pending) return;
    const sv = pending;
    setSave(sv);
    setDressTab(sv.friend);
    setPending(null);
    setCodeInput("");
    setMyCode("");
    setCodeMsg("Loaded! " + codePreview(sv) + ".");
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

  const hasMermaid = save.unlocked.indexOf("mermaid") >= 0;
  const oceanOn = save.ocean && save.unlocked.indexOf("ocean") >= 0 && screen === "home";
  const prize = nextPrize(save.stars);
  const mWorn: string[] = [];
  for (let i = 0; i < MSLOTS.length; i++) {
    const id = save[MSLOTS[i]];
    const it = findM(id);
    if (id !== "none" && it) mWorn.push(it.name);
  }
  const headerWorn = save.friend === "mermaid" ? mWorn : wornNames;
  const hairName = findM(save.hair) ? (findM(save.hair) as MItem).name : "Pink";
  const queen = save.unlocked.indexOf("m_queen") >= 0;
  const wordFont = "Andika, 'Andika New Basic', 'Chalkboard SE', 'Comic Sans MS', 'Arial Rounded MT Bold', ui-rounded, sans-serif";
  const sectionTitle: CSSProperties = { fontSize: 20, fontWeight: 700, margin: "18px 0 8px" };
  const lockedCard = (open: boolean, on: boolean): CSSProperties => ({
    ...card,
    cursor: open ? "pointer" : "default",
    opacity: open ? 1 : 0.55,
    border: on ? "4px solid " + theme.text.primary : "1px solid " + theme.border.subtle,
    textAlign: "center",
  });
  const groups: { [k: string]: string[] } = { solid: [], learning: [], shaky: [], new: [] };
  for (let i = 0; i < WORD_LIST.length; i++) groups[wordGroup(save, WORD_LIST[i])].push(WORD_LIST[i]);
  const wordLine = (w: string): string => {
    const st = save.words[w];
    return st ? w + " (" + st.c + (st.c >= 15 ? "+" : "") + " right, " + st.m + (st.m >= 15 ? "+" : "") + " missed)" : w;
  };

  return (
    <div
      style={{
        fontFamily: theme.font.family,
        color: theme.text.primary,
        background: oceanOn ? "linear-gradient(180deg, #E0F5FC 0%, #B9E4F4 60%, #9FD8EE 100%)" : theme.bg.base,
        borderRadius: oceanOn ? 24 : 0,
        padding: 20,
        maxWidth: 800,
        margin: "0 auto",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {save.friend === "mermaid" && hasMermaid ? (
            <Mermaid
              hair={save.hair}
              head={save.mhead}
              neck={save.mneck}
              tail={save.mtail}
              hold={save.mhold}
              size={screen === "home" ? 100 : 70}
              hop={hop && screen !== "dress"}
              seahorse={save.seahorse && screen === "home"}
              dolphin={save.dolphin && screen === "home"}
            />
          ) : (
            <Capy
              hat={save.hat}
              face={save.face}
              neck={save.neck}
              hold={save.hold}
              size={screen === "home" ? 92 : 64}
              hop={hop && screen !== "dress"}
            />
          )}
          <div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: "30px" }}>Capy’s Learning Adventure</div>
            {screen === "home" ? (
              <div style={{ fontSize: 15, color: theme.text.secondary }}>Math and reading games for Adalynn</div>
            ) : null}
            <div style={{ fontSize: 15, color: theme.text.secondary }}>
              {"⭐ " + save.stars}
              {screen === "play" ? "   Level " + save.levels[mode] : ""}
              {screen === "words" ? "   Level " + save.levels.word : ""}
              {headerWorn.length > 0 ? "   ·  " + headerWorn.join(", ") : ""}
            </div>
          </div>
          {queen && screen === "home" ? <Trophy size={48} /> : null}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {screen !== "home" ? (
            <button
              style={pill(theme, false)}
              onClick={() => {
                R.wpToken += 1;
                R.wpArmed = false;
                setScreen("home");
              }}
            >
              Map
            </button>
          ) : null}
          <button
            style={pill(theme, screen === "dress")}
            onClick={() => {
              R.wpToken += 1;
              setDressTab(save.friend);
              setScreen("dress");
            }}
          >
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

      {celebrate ? (
        <div
          role="dialog"
          aria-label="Celebration"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 23, 42, 0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
            padding: 20,
          }}
        >
          <div
            style={{
              background: theme.bg.elevated,
              borderRadius: 28,
              padding: "24px 28px",
              maxWidth: 440,
              textAlign: "center",
              border: "4px solid " + theme.text.primary,
            }}
          >
            <div style={{ fontSize: 40 }}>{celebrate.queen ? "🎉👑🏆🎉" : "🎉⭐🎉"}</div>
            {celebrate.queen ? (
              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", gap: 8, margin: "8px 0" }}>
                <Mermaid hair={save.hair} head="m_queen" neck={save.mneck} tail={save.mtail} hold={save.mhold} size={130} />
                <Trophy size={70} />
              </div>
            ) : hasMermaid ? (
              <div style={{ display: "flex", justifyContent: "center", margin: "8px 0" }}>
                <Mermaid
                  hair={save.hair}
                  head={save.mhead}
                  neck={save.mneck}
                  tail={save.mtail}
                  hold={save.mhold}
                  size={110}
                  seahorse={save.seahorse}
                  dolphin={save.dolphin}
                />
                {save.castle ? <CoralCastle size={80} /> : null}
              </div>
            ) : null}
            <div style={{ fontSize: 26, fontWeight: 700, margin: "6px 0" }}>{celebrate.title}</div>
            <div style={{ fontSize: 17, color: theme.text.secondary, marginBottom: 14 }}>{celebrate.sub}</div>
            <button style={{ ...pill(theme, true), fontSize: 20, padding: "12px 28px" }} onClick={() => setCelebrate(null)}>
              Yay!
            </button>
          </div>
        </div>
      ) : null}

      {screen === "home" ? (
        <div>
          <p style={{ fontSize: 18, lineHeight: "26px", margin: "16px 0 12px" }}>
            {"Go on a learning adventure with " + friendName + "! Pick a path, earn stars, and dress up your friends."}
          </p>

          <div
            aria-label="Next prize"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              padding: "10px 16px",
              marginBottom: 12,
              borderRadius: theme.radius.xl,
              border: "2px dashed " + theme.border.strong,
              background: theme.bg.elevated,
            }}
          >
            {prize ? (
              <div style={{ filter: "brightness(0)", opacity: 0.35, display: "flex", alignItems: "center", minWidth: 70, justifyContent: "center" }}>
                <PrizeArt id={prize.id} size={64} />
              </div>
            ) : (
              <Trophy size={56} />
            )}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: theme.text.secondary }}>{prize ? "🎁 Next prize" : "👑 Every prize won!"}</div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>
                {prize ? (prize.cost - save.stars) + " more star" + (prize.cost - save.stars === 1 ? "" : "s") + "!" : "You are the Mermaid Queen!"}
              </div>
              <div style={{ fontSize: 13, color: theme.text.tertiary }}>
                {prize ? "Mystery prize at ⭐ " + prize.cost : "Keep playing to grow your star count."}
              </div>
            </div>
            {save.castle && save.unlocked.indexOf("castle") >= 0 ? (
              <div style={{ marginLeft: "auto" }}>
                <CoralCastle size={64} />
              </div>
            ) : null}
          </div>

          <div style={{ fontSize: 15, fontWeight: 700, margin: "4px 0 6px" }}>Play with</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <button
              onClick={() => pickFriend("capy")}
              aria-pressed={save.friend === "capy"}
              aria-label="Play with Capy"
              style={{ ...lockedCard(true, save.friend === "capy"), display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}
            >
              <Capy hat={save.hat} face={save.face} neck={save.neck} hold={save.hold} size={52} />
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>Capy</div>
                <div style={{ fontSize: 12, color: theme.text.secondary }}>{save.friend === "capy" ? "✓ Playing" : "Tap to play"}</div>
              </div>
            </button>
            <button
              onClick={() => pickFriend("mermaid")}
              disabled={!hasMermaid}
              aria-pressed={save.friend === "mermaid"}
              aria-label={"Play with " + MERMAID_NAME}
              style={{ ...lockedCard(hasMermaid, save.friend === "mermaid"), display: "flex", alignItems: "center", gap: 8, padding: "8px 14px" }}
            >
              <div style={hasMermaid ? {} : { filter: "brightness(0)", opacity: 0.35 }}>
                <Mermaid hair={save.hair} head={save.mhead} neck={save.mneck} tail={save.mtail} hold={save.mhold} size={60} />
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontWeight: 700 }}>{hasMermaid ? MERMAID_NAME + " the Mermaid" : "Secret friend"}</div>
                <div style={{ fontSize: 12, color: theme.text.secondary }}>
                  {hasMermaid ? (save.friend === "mermaid" ? "✓ Playing" : "Tap to play") : "🔒 160 stars to unlock"}
                </div>
              </div>
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: 12,
            }}
          >
            <button key="word" style={{ ...card, border: "2px solid " + theme.border.strong }} onClick={startWords}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{WORD_META.emoji + "  " + WORD_META.title}</div>
              <div style={{ fontSize: 14, color: theme.text.secondary, marginTop: 6 }}>{WORD_META.blurb}</div>
              <div style={{ fontSize: 13, color: theme.text.tertiary, marginTop: 8 }}>{"Level " + save.levels.word + " of 6"}</div>
            </button>
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
            Hints never give the answer, and 🔊 reads the question without the answer. Word Pond says one word from her
            reading books and she taps it from four look-alike words; missed words come back sooner. Stars, Dress Up,
            and word practice save on this device when storage is available. Hold the Grown-ups button for the save code
            and her word list.
          </div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end" }}>
            <button
              aria-label="Grown-ups: press and hold"
              onPointerDown={holdStart}
              onPointerUp={holdEnd}
              onPointerLeave={holdEnd}
              onPointerCancel={holdEnd}
              onContextMenu={(e) => e.preventDefault()}
              style={{
                ...pill(theme, false),
                position: "relative",
                overflow: "hidden",
                userSelect: "none",
                WebkitUserSelect: "none",
                touchAction: "none",
                fontSize: 14,
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 0,
                  top: 0,
                  bottom: 0,
                  width: holdPct + "%",
                  background: theme.fill.accentSubtle,
                }}
              />
              <span style={{ position: "relative" }}>
                {holdPct > 0 ? "🔒 Keep holding… " + Math.round(holdPct) + "%" : "🔒 Grown-ups (press and hold)"}
              </span>
            </button>
          </div>
        </div>
      ) : null}

      {screen === "dress" ? (
        <div>
          {hasMermaid ? (
            <div style={{ display: "flex", gap: 8, margin: "16px 0 4px" }}>
              <button style={pill(theme, dressTab === "capy")} aria-pressed={dressTab === "capy"} onClick={() => setDressTab("capy")}>
                {(dressTab === "capy" ? "✓ " : "") + "Capy"}
              </button>
              <button style={pill(theme, dressTab === "mermaid")} aria-pressed={dressTab === "mermaid"} onClick={() => setDressTab("mermaid")}>
                {(dressTab === "mermaid" ? "✓ " : "") + MERMAID_NAME}
              </button>
            </div>
          ) : null}

          {dressTab === "mermaid" && hasMermaid ? (
            <div>
              <p style={{ fontSize: 18, margin: "12px 0 8px" }}>
                {"Dress up " + MERMAID_NAME + "! Pick her hair color, then a head, necklace, tail, and hold item. Tap an item you are wearing to take it off."}
              </p>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "flex-end", margin: "8px 0 12px" }}>
                <Mermaid
                  hair={save.hair}
                  head={save.mhead}
                  neck={save.mneck}
                  tail={save.mtail}
                  hold={save.mhold}
                  size={180}
                  seahorse={save.seahorse}
                  dolphin={save.dolphin}
                />
              </div>
              <div style={{ textAlign: "center", fontSize: 15, color: theme.text.secondary }}>{"Hair: " + hairName}</div>
              <div style={sectionTitle}>💇 Hair color</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: 8 }}>
                {MITEMS.filter((it) => it.slot === "hair").map((it) => {
                  const open = save.unlocked.indexOf(it.id) >= 0;
                  const on = save.hair === it.id;
                  return (
                    <button
                      key={it.id}
                      onClick={() => setHair(it.id)}
                      disabled={!open}
                      aria-pressed={on}
                      aria-label={it.name + " hair"}
                      style={{ ...lockedCard(open, on), display: "flex", alignItems: "center", gap: 8, padding: "8px 10px" }}
                    >
                      <HairSwatch id={it.id} />
                      <div style={{ textAlign: "left" }}>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{it.name}</div>
                        <div style={{ fontSize: 12, color: theme.text.secondary }}>
                          {open ? (on ? "✓ On" : "Tap") : "🔒 " + it.cost + " ⭐"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {MSLOTS.map((slot) => (
                <div key={slot}>
                  <div style={sectionTitle}>{MSLOT_META[slot].emoji + "  " + MSLOT_META[slot].title}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                    {MITEMS.filter((it) => it.slot === slot).map((it) => {
                      const open = save.unlocked.indexOf(it.id) >= 0;
                      const on = save[slot] === it.id;
                      return (
                        <button key={it.id} onClick={() => wearM(slot, it.id)} disabled={!open} aria-pressed={on} style={lockedCard(open, on)}>
                          <Mermaid
                            hair={save.hair}
                            head={slot === "mhead" ? it.id : "none"}
                            neck={slot === "mneck" ? it.id : "none"}
                            tail={slot === "mtail" ? it.id : "none"}
                            hold={slot === "mhold" ? it.id : "none"}
                            size={80}
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
              <div style={sectionTitle}>🐠 Friends and places</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
                {(["seahorse", "dolphin", "ocean", "castle"] as Array<"seahorse" | "dolphin" | "ocean" | "castle">).map((k) => {
                  const it = findM(k) as MItem;
                  const open = save.unlocked.indexOf(k) >= 0;
                  const on = open && save[k];
                  return (
                    <button key={k} onClick={() => toggleFlag(k)} disabled={!open} aria-pressed={on} style={lockedCard(open, on)}>
                      <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <PrizeArt id={k} size={60} />
                      </div>
                      <div style={{ fontWeight: 700, marginTop: 4 }}>{it.name}</div>
                      <div style={{ fontSize: 13, color: theme.text.secondary }}>
                        {open ? (on ? "✓ On · tap to hide" : "Off · tap to show") : "🔒 " + it.cost + " stars to unlock"}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
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
                          style={lockedCard(open, on)}
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
          )}
        </div>
      ) : null}

      {screen === "words" ? (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 10px", flexWrap: "wrap" }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: theme.text.secondary }}>
              {WORD_META.emoji + "  " + WORD_META.title + (wpSummary ? "" : "   ·   Card " + Math.min(wpIdx + 1, wpCards.length) + " of " + wpCards.length)}
            </div>
            <div style={{ flex: 1 }} />
            {!wpSummary ? (
              <button
                style={pill(theme, false)}
                onClick={() => {
                  if (wpCards[wpIdx]) say(wpCards[wpIdx]);
                }}
                aria-label="Say the word again"
              >
                🔊 Hear it again
              </button>
            ) : null}
          </div>
          {wpSummary ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 30, fontWeight: 700 }}>Great reading!</div>
              <div style={{ fontSize: 22, margin: "10px 0" }}>{"You earned " + wpRoundStars + " star" + (wpRoundStars === 1 ? "" : "s") + " ⭐"}</div>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 14 }}>
                <button style={{ ...pill(theme, true), fontSize: 20, padding: "12px 24px" }} onClick={startWords}>
                  Play again
                </button>
                <button style={{ ...pill(theme, false), fontSize: 20, padding: "12px 24px" }} onClick={leaveWords}>
                  Map
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, textAlign: "center", marginBottom: 6 }}>
                {"👂 Listen to " + friendName + ", then tap the word."}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(140px, 1fr))",
                  gap: 14,
                  maxWidth: 520,
                  margin: "14px auto",
                }}
              >
                {wpChoices.map((c) => {
                  const target = wpCards[wpIdx];
                  const right = wpSolved && c === target;
                  const wrong = wpWrong.indexOf(c) >= 0;
                  const point = !wpSolved && wpWrong.length >= 3 && c === target;
                  return (
                    <button
                      key={c}
                      data-word={c}
                      aria-label={"word " + c}
                      onClick={() => wpJudge(c)}
                      disabled={!armed || wpSolved || wrong}
                      style={{
                        minHeight: 110,
                        borderRadius: 24,
                        fontSize: 52,
                        fontFamily: wordFont,
                        fontWeight: 700,
                        cursor: armed && !wpSolved && !wrong ? "pointer" : "default",
                        color: theme.text.primary,
                        opacity: wrong ? 0.45 : 1,
                        border:
                          (right || wrong || point ? "5px " : "3px ") +
                          (wrong ? "dashed " : "solid ") +
                          (right ? theme.text.success : wrong ? theme.text.warning : theme.border.strong),
                        background: right ? theme.fill.successSubtle : wrong ? theme.fill.warningSubtle : theme.bg.elevated,
                      }}
                    >
                      {(right ? "✓ " : wrong ? "✗ " : point ? "👉 " : "") + c}
                    </button>
                  );
                })}
              </div>
              <div style={{ textAlign: "center", fontSize: 18, minHeight: 28, fontWeight: 600 }}>
                {wpFeedback === "Listen…" ? "👂 Listen…" : wpFeedback}
              </div>
            </div>
          )}
        </div>
      ) : null}

      {screen === "grownup" ? (
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, margin: "16px 0 4px" }}>Grown-ups</div>
          <div style={{ fontSize: 14, color: theme.text.secondary }}>
            Move Adalynn’s progress to another device with a save code. Nothing is sent anywhere; the code holds it all.
          </div>

          <div style={sectionTitle}>📤 Get my code</div>
          <button style={pill(theme, true)} onClick={makeCode}>
            Get my code
          </button>
          {myCode ? (
            <div style={{ marginTop: 10 }}>
              <div
                aria-label="Save code"
                data-code={myCode}
                style={{
                  fontFamily: "ui-monospace, Menlo, monospace",
                  fontSize: 24,
                  fontWeight: 700,
                  letterSpacing: 1,
                  lineHeight: "34px",
                  wordBreak: "break-all",
                  userSelect: "all",
                  WebkitUserSelect: "all",
                  padding: "12px 14px",
                  borderRadius: theme.radius.lg,
                  border: "2px solid " + theme.border.strong,
                  background: theme.bg.elevated,
                }}
              >
                {myCode}
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 8 }}>
                <button style={pill(theme, false)} onClick={copyCode}>
                  📋 Copy
                </button>
                <span style={{ fontSize: 14, color: theme.text.secondary }}>{copied}</span>
              </div>
              <div style={{ fontSize: 13, color: theme.text.tertiary, marginTop: 6 }}>{"This code holds: " + codePreview(save) + "."}</div>
            </div>
          ) : null}

          <div style={sectionTitle}>📥 Enter a code</div>
          <textarea
            aria-label="Enter a save code"
            value={codeInput}
            onChange={(e) => {
              setCodeInput(e.target.value);
              setPending(null);
              setCodeMsg("");
            }}
            placeholder="CAPY-XXXX-XXXX-…"
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "ui-monospace, Menlo, monospace",
              fontSize: 18,
              padding: 10,
              borderRadius: theme.radius.lg,
              border: "2px solid " + theme.border.strong,
              background: theme.bg.elevated,
              color: theme.text.primary,
            }}
          />
          <div style={{ marginTop: 8 }}>
            <button style={pill(theme, false)} onClick={checkCode}>
              Check code
            </button>
          </div>
          {codeMsg ? (
            <div role="status" style={{ marginTop: 10, fontSize: 16, fontWeight: 600 }}>
              {(codeMsg.indexOf("Loaded") === 0 ? "✓ " : "⚠️ ") + codeMsg}
            </div>
          ) : null}
          {pending ? (
            <div
              style={{
                marginTop: 10,
                padding: 14,
                borderRadius: theme.radius.lg,
                border: "2px dashed " + theme.border.strong,
                background: theme.bg.elevated,
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700 }}>{codePreview(pending)}</div>
              <div style={{ fontSize: 14, color: theme.text.secondary, margin: "6px 0 10px" }}>
                {"Load this? It replaces the progress on this device (now ⭐ " + save.stars + ")." +
                  (pending.stars < save.stars ? " ⚠️ The code has fewer stars than this device." : "")}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button style={pill(theme, true)} onClick={confirmCode}>
                  Yes, load it
                </button>
                <button style={pill(theme, false)} onClick={() => setPending(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : null}

          <div style={sectionTitle}>🔤 Word Pond words</div>
          <div style={{ fontSize: 13, color: theme.text.secondary, marginBottom: 8 }}>
            Solid = right on the first try at least 3 times in a row. Shaky = missed last time (these come back sooner).
          </div>
          {[
            { k: "shaky", t: "⚠️ Shaky (practice these)" },
            { k: "learning", t: "🌱 Still learning" },
            { k: "solid", t: "✓ Solid" },
            { k: "new", t: "… Not seen in Word Pond yet" },
          ].map((g) => (
            <div key={g.k} aria-label={g.t} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{g.t + " (" + groups[g.k].length + ")"}</div>
              <div style={{ fontSize: 16, fontFamily: wordFont, lineHeight: "26px" }}>
                {groups[g.k].length ? groups[g.k].map(wordLine).join(" · ") : "none"}
              </div>
            </div>
          ))}
          <div style={{ fontSize: 13, color: theme.text.tertiary }}>
            {SHAKY_WORDS.join(", ") + " start out as shaky words (shown more often) until she gets them right. New book words are added to the list when the game is updated."}
          </div>

          <div style={sectionTitle}>🎁 Reward ladder</div>
          <div style={{ fontSize: 14, lineHeight: "22px" }}>
            {"Capy items: every 5–10 stars up to 150. Then " + MERMAID_NAME + "’s ladder (★ = big prize):"}
            <div style={{ columns: 2, marginTop: 6 }}>
              {ladderRows().map((r) => (
                <div key={r.cost + r.text}>
                  {(save.stars >= r.cost ? "✓ " : "") + r.cost + ": " + r.text + (r.big ? " ★" : "")}
                </div>
              ))}
            </div>
          </div>
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
                    disabled={!armed && !locked}
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
                  <button key={d} style={keyBtn()} disabled={!armed} onClick={() => typeDigit(d)}>
                    {d}
                  </button>
                ))}
                <button style={keyBtn()} onClick={() => typeDigit("back")} aria-label="Backspace">
                  ⌫
                </button>
                <button style={keyBtn()} disabled={!armed} onClick={() => typeDigit("0")}>
                  0
                </button>
                <button
                  style={{ ...keyBtn(), background: theme.fill.primary, color: theme.text.onPrimary, borderColor: theme.fill.primary }}
                  onClick={submitTyped}
                  disabled={!armed}
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
