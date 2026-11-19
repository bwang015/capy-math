## 2026-11-18 — Batch 2 (commit 876dc57a8fb24d3cb44306fc24b95b0033f75e58)
- Rebrand: "Capy's Learning Adventure" — math and reading games for Adalynn (URL unchanged).
- Save code: press-and-hold Grown-ups button; "Get my code" / "Enter a code" (CAPY-… base32 with checksum + version), preview and confirm before overwrite; bad codes rejected.
- Marina the Mermaid: second friend unlocks at 160 stars; 8 free hair colors (text-labeled); reward ladder to 500 stars (every 10 stars 170–240, every 15–20 stars 250–500; big milestones: seahorse pet 200, ocean map 250, dolphin 300, coral castle 400, Mermaid Queen crown + trophy 500). Next-prize preview on the map. Shared, never-decreasing star count.
- Word Pond (reading): Capy says a word, tap it from 4 look-alike choices (Andika font embedded, OFL); spaced repetition weighted to shaky words; grown-up solid/shaky word view.
- Anti-spam: only the first tap counts toward a star; answers briefly disabled when each question appears.
- Note: the build script expects build/andika-bold-latin.woff (not committed, binary).

## 2026-11-17 — Batch update (commit 71875fb)
- Pond Picnic: guided "Split it" steps (add tens, add ones, put together) with ten-boat visuals; levels reworked (L1 within 10, L2 within 20, L3 tens+tens, L4 2-digit no-carry guided, L5 fading help, L6 with carrying); all sums ≤ 99.
- Ten Boats: hundreds removed; added reverse decomposition ("How many tens in 49?", "49 = ? + ?"); tens-place digit questions only at L6 with visual.
- Bigger Capy: capped at 99; look-alike (47 vs 74), same-tens, and close pairs; "tap the biggest" at L5–6; spoken prompt no longer reveals the answer; hints no longer name the bigger number.
- All paths: stars only for a correct first try.
- Dress Up replaces Hats: Face, Neck, Hold slots with 11 new items unlocking at 60–150 stars.

## 2026-11-17 — Mastery (commit 38ebcc5)
- Initial GitHub Pages publish. A path is mastered after 3 in a row at level 6; mastered paths keep serving questions but no longer award stars.
