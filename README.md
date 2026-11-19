# Capy's Learning Adventure

**Math and reading games for Adalynn.** Capy the capybara (and, later, Marina the Mermaid) cheer her on through short, friendly practice games made for late kindergarten into 1st grade.

Play it here: https://bwang015.github.io/capy-math/

## What's inside

**Reading**
- 🔤 **Word Pond**: Capy says a word out loud, and she taps it from four written words. The words come from her nightly reading books (sight words like *the, has, goes* and short words like *sun, top, bus*). The wrong answers are look-alike words (*has / hat / his / had*), so she has to really look at the letters. Words she misses come back sooner, and words she knows show up less often.

**Math** (every number stays under 100)
- ➕ **Pond Picnic**: adding, including "Split it" for two-digit sums (add the tens, then the ones, then put them together)
- ➖ **Swim Away**: taking away
- ❓ **Hidden Snack**: find the missing number
- 🧱 **Ten Boats**: tens (long boats) and ones (little capys)
- ⚖️ **Bigger Capy**: comparing numbers with <, =, >
- 🦘 **Hop Path**: skip counting
- 📖 **Capy Stories**: short word problems

## Stars and prizes

- A star comes only from a right answer on the **first tap**, so guessing doesn't pay. Answers stay off until the question is ready, and a fast double tap can't sneak a star in.
- Three first-try answers in a row move a path up a level (6 levels per path).
- Stars dress up Capy (hats, glasses, necklaces and more, up to 150 stars). At **160 stars** she meets **Marina the Mermaid**, with 8 hair colors to pick from and a long prize ladder all the way to **500 stars**: shell crowns, sparkly tails, a seahorse pet, an ocean map, a dolphin friend, a coral castle, and finally the Mermaid Queen crown and trophy.
- The map always shows the next prize and how many more stars it takes. Her star count never goes down.

## For grown-ups

- Progress saves on the device (no account, no internet needed after it loads).
- Press and hold **🔒 Grown-ups** on the map for:
  - **Save code**: "Get my code" shows a code like `CAPY-040Z-8GGK-…` that holds all her progress. On another device, "Enter a code" shows a preview and asks before replacing anything. The code never leaves the device unless you copy it.
  - **Word list**: which reading words are solid, still learning, or shaky.
  - The full prize ladder.

## Updating the word list

The word list is at the top of `Capy_Math_Adventure.canvas.tsx` (`WORD_LIST`, `SHAKY_WORDS`, `LOOKALIKES`). Add new words from each book to the **end** of the list (save codes refer to list positions), give each one a few look-alike words, then rebuild the single HTML file.

Everything is one self-contained HTML file. The kid-friendly letters in Word Pond use the Andika font (SIL Open Font License 1.1), embedded in the page.
Readable source is in src/; index.html is the compiled single-file build. See CHANGELOG.md.
