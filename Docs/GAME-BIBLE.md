# Grimoire — Living Game Bible

**This file is canon.** It describes the game as implemented in this repository, plus reserved later horizons. Older notebook files in `Docs/` (GDD v3/v5, balancing bible, UI bible, implementation plans) are research history. Where they disagree with this bible or the code, **the code and this bible win**.

Last assembled from: `js/content.js`, `js/state.js`, `js/engine.js`, `js/systems/*`, `index.html`, `style.css`, and the canonical design plan.

---

## 1. What this game is

**Title:** Grimoire  
**Form:** Vanilla HTML / CSS / JS unfolding incremental in the lineage of *A Dark Room*, *Universal Paperclips*, and *Candy Box*.  
**Fantasy:** An isolated reader at a brass-bound book. The candle is the clock. Translation is the progress bar.

v1 is a **finished 4–8 hour sitting**: Desk → Study → open shutters onto a dark estate. The player can stop there. **Horizon III (Manor)** continues on that same save as a walkable ASCII house. Town / sky / prestige remain later chapters, not required for “done.”

**Voice:** Clinical, lowercase-friendly, from the room. Ban: *indescribable, ineffable, maddening, eldritch, cyclopean, unspeakable.* Do not name a god or explain the bolt.

**Player contracts:**

- Short sessions still count (offline catch-up, quills while the candle lives).
- Downtime is a choice (trim vs distill vs jobs).
- Failure is safe (darkness costs oil / bleed, never the save or sentences).
- The best action keeps changing.

---

## 2. What shipped vs what the old docs wanted

The notebook often wanted a soot spreadsheet, a 3-column boot, amber-on-black, and 100-hour Kittens math. The live game kept the prototype’s book.

| Topic | Old notebook | Live game |
| --- | --- | --- |
| First verb | Scour soot / trim / trace | **Light the Candle**, then **Decipher** |
| First currencies | Soot, vellum, glyphs, marks | **Insight, oil, tallow, ink, passages** |
| Opening layout | 3-column dashboard | Modified 3-column from first light: sparse ledger, book, contained blotter. Tabs still wait for Study. |
| Palette | Amber monochrome | Purple-gray lore, gold numbers, amber flame/ready |
| Automation | Drafting linkages at once | **Tallow drip** first, then quills (Transcribe only until Study) |
| Page writing | Auto-decipher with generators | Only **player click** and **Attend the Page** write runes |
| Bleed | Visible meter | Internal only; FX start in Study |
| Prestige | Mid-campaign | Locked Binding tab; no cinders in v1 |
| Sanity | Death / meter | Aperture is optional power + bleed, never a game over |

**Deviations from the written plan that are now canon (because they shipped):**

- A **boot veil**: black screen, `[Light the Candle]`. The simulation does not run until the wick is lit (`deskRevealed`). This is the ADR “stoke fire” beat the plan implied and the code made explicit.
- Opening layout is a **modified 3-column** (sparse ledger, book, contained blotter), not a stacked one-column desk. Tabs still wait for Study; the grid does not jump when they arrive.
- The journal is **the blotter**, not a generic log.
- The oil **percent readout** stays hidden until the wick is “seen” (oil ≤ 20% of cap, or after it has been seen once). Naming the flame unlocks tallow / trim, not a full HUD meter.
- Settings (`…`) unlock after **90 seconds** of play, not only after Study.
- **Hint cards** on hover / focus; **Show exact upgrade numbers** in settings.
- Darkness uses an overlay (`#dark-acts`): Strike Match, Trim (if tallow), Sit. Not only journal buttons.
- **Collation Board** is a one-shot (one board). The workshop formula still exists but with W=1 it is a small bump, not a board shop.
- `translationPercent` = `stableLettersLifetime / runesFinishedLifetime` (capped at 99 until Sentence 12).
- A **debug panel** (`js/debug.js`, `Grimoire.DEBUG = true`) exists for playtest. Strip it before a public ship.

---

## 3. Architecture (as built)

No framework. Global `Grimoire` namespace. Scripts in `index.html` order:

`content.js` → `economics.js` → `state.js` → `candle.js` → `pages.js` → `jobs.js` → `estate.js` → `projects.js` → `bleed.js` → `view.js` → `engine.js` → `debug.js` → `main.js`

- **Model:** serializable primitives in `state`. Dirty flags on `Grimoire.dirty`.
- **Tick:** 200 ms. Scholar day = 2400 ticks (8 min). Season = 24000 ticks (**80 min**).
- **Render:** `requestAnimationFrame` + dirty patches. Do not rebuild the rune overlay every tick.
- **Save:** `localStorage` key `grimoire.v1`, backup `grimoire.v1.bak`, Base64 envelope + FNV-style checksum. `SAVE_VERSION` **2**. Mismatch **warns** and keeps last good save; it does not wipe. v1 shutters saves migrate in place.
- **Offline:** analytical catch-up, cap **12 hours**. Welcome-back line if away > 3 min. Seasons do **not** advance offline. Copy stops when Insight hits 0. After oil empty: no production, +2 bleed once, no auto-relight. Started Manor batches complete linearly while the candle would still have burned; drip continues; the dispatched quill stays in its room. No auto-Light, no auto-start.
- **Autosave:** 15 s, plus hide-tab and `beforeunload`.
- **Numbers:** `ceil` costs, `floor` display, suffix format in `economics.js`. No `decimal.js` in v1.

Reserved resource fields (hidden, stay 0): `soot`, `obituaries` (Doubt Memory increments obituaries), `cinders`. Vellum, extracts, silver, and folios are live on the Estate.

---

## 4. Opening and layout

**Boot:** `#boot-veil` over a dark body. Lighting the candle logs *the wick takes. the desk is there.* and starts the sim.

**Horizon I (Desk):** CSS 3-column from first light (`min-width: 900px`): sparse `#ledger` (Insight, then unfolding rows) / book + acts / blotter. No tabs. The blotter is a sticky right column with a viewport-capped height; it does not grow the page. Mobile stacks (ledger, workspace, blotter).

**Study (Sentence 3 / `bolt_and_key`):** `Desk` / `Study` tabs. Same 3-column grid — jobs and study projects fill the center. No layout jump. Mobile still stacks.

**Estate (`open_shutters`):** an ASCII map of the house. You walk adjacent rooms (click a neighboring door, or arrow keys). Last beat line: *the grounds are dark. the journal asks nothing.* If bleed < 20: *the bolt could still be drawn.* v2 continues on that same save: enter one interior, start a batch, leave it cooking. Binding stays **disabled**.

**Binding:** visible after shutters, **disabled**. *sealed. the rite is not for this sitting.*

**Subheadings:** boot / flame named / bolted / shutters (see `CONTENT.subheadings`).

**60-30-10:** muted study, page text, amber/gold only on flame and ready buys.

---

## 5. Core loop (Desk)

```
Light wick → Decipher (Insight + rune) → tallow drips as oil burns
         → Trim (keep light) or Distill (5 tallow → 1 ink)
         → micros / nibs / first quill
         → pages become Passages → Sentences
```

**Light is required.** If oil is 0 or the ember wait is active, Decipher and jobs stop.

### Resources

| Resource | Source | Sink |
| --- | --- | --- |
| Insight | Decipher (`1 + 0.1 × nibs`, plus Press Once charges), Transcribe (0.5/s per quill) | Matches (3), micros (`catch_drip`, `press_once`, `steady_hand`) |
| Oil | Start 180; Trim +60; wick stub +20; match +40; ember +15 | 0.35/s base while lit, × season, × prisms, × ward, × wax reserve |
| Tallow | 0.12/s drip while lit (+0.02 if Catch the Drip) | Trim 3 (first 2 free), Distill 5, wick stub 5 |
| Ink | Distill; Copy job | Nibs, quills, Study tools, Lexicon (8); Vault Light; baths; house tools; Cataloger |
| Passages | +1 per finished page | Catalog 1, prism/lamp, Collation 3, Lexicon 5 |
| Quills | Bind (18 ink, r=1.15, cap 12) | Assignment, or **one** dispatched into the house |
| Lexicons | Bind Lexicon after Collation | Index 3, Under-Text/Suppress 2, Listen 1, Open Shutters 3, Codex 1, Second Desk 2, packet 1 |
| Vellum | Cellars **Render** batch | Library **Collate** |
| Folios | Library **Collate** batch | Packet at the gate |
| Extracts | Glasshouse drip (season-scaled) | Optional Vault bath catalyst |
| Silver | Vault **bath** (not clicking) | Mechanical Cataloger; Acid Retort |
| Matches | 3 at first darkness; Spare Matches +2, cap 12 | Strike Match |

**Caps:** oil 240 + 60/lamp (max 3 lamps). Tallow 200 + 50/shelf (max 4 shelves).

**Oil decay extras:** Solstice ×2, Equinox ×0.5, Autumn/Spring ×1. First prism ×0.75, later prisms ×0.9 each. Ward ×0.85 per assigned quill, **floor 0.15/s** if any ward. Wax Reserve ×0.9 once.

**Trim overflow:** oil clamps to cap; log *the wick will not take more.*

### Darkness (safe fail)

1. Wick dies. First time: grant 3 matches. Overlay: Strike / Trim / Sit. Trim is available as soon as the wick has been seen (including first darkness). **W** trims from the overlay while drowned.
2. **Strike Match:** 3 Insight + 1 match → +40 oil.
3. **Sit:** +4 bleed, 8 s wait, +15 oil ember.
4. If matches = 0 and Insight < 3, Sit still works.

---

## 6. The book

- First page **24** runes; later pages **48**. Slots use the live coordinate overlay.
- Decipher: next active rune flashes **blue** (0.4 s), then fades or **stabilizes**.
- Attend: flashes **purple**. Transcribe and Copy **never** write.
- Stabilize chance **1 / stabilizeDenom** (default 4; Steady Hand → 3). Stable chars are the next letters of the current Sentence (spaces as `·`).
- Page complete: +1 Passage, 300 ms turn, new page.
- **Sentence 1–3** when pages reach 5, 10, then **15** (`pagesForSentence`: 5 on the desk). Sentence 3 auto-unlocks `bolt_and_key` (Study).
- **Sentences 4–12** stay 4 pages each (Sentence 6 at 27 pages, Sentence 12 at 51). Attend pacing after Study does not stretch.
- **12 Sentences** in `content.js` (shipped, clinical).
- Sentence 6 → Distill label mutates (`distillMutated`); click still distills.

**Variable ratio (not crates):** after page 1, 4% Decipher echo (+1 Insight, max once / 45 s); rare self-stable (2%, max once / 90 s) if not yet first-stable.

---

## 7. Projects (v1 list as coded)

Auto (no row): `name_flame` at 8 lifetime Insight; `bolt_and_key` at 3 Sentences.

Reveal: explicit `reveal(state)` **or** all cost currencies visible and player has ≥ half the cost (`withinTwoX`). Tease row: `???? — cost`.

`second_desk` adds +1 extra visible desk upgrade (`extraReveals`).

| Id | Tab | Costs | Effect |
| --- | --- | --- | --- |
| catalog_page | desk | 1 Passage | Unlock Distill |
| wick_stub | desk | 5 tallow | +20 oil, once |
| catch_drip | desk | 12 Insight | Drip +0.02/s, once |
| press_once | desk | 10 Insight, r=1.07 | +15 Decipher charges (+1 Insight each) |
| steady_hand | desk | 15 Insight | Stabilize 1-in-3, once |
| steel_nib | desk | 4 Ink, r=1.07 | +0.1 Insight/click |
| bind_quill | desk | 18 Ink, r=1.15 | +1 quill, cap 12 |
| spare_matches | desk | 8 Ink, r=1.15 | +2 matches after first dark, cap 12 |
| prism | study | 22 Ink + 1 Passage, r=1.15 | Slow oil |
| shelf | study | 18 Ink | Tallow cap +50, cap 4 |
| spare_lamp | study | 22 Ink + 1 Passage | Oil cap +60, cap 3 |
| attend_lesson | study | 15 Ink (needs a quill) | Unlock Attend job |
| collation | study | 40 Ink + 3 Passages | Unlock Lexicon; +1 board (once) |
| index | study | 3 Lexicons | Chapter meter in the ledger (`translationPercent`) |
| under_text | study | 2 Lexicons + 30 Ink | Aperture 1.2, bleed +12 |
| suppress | study | 2 Lexicons + 30 Ink | Aperture 1, bleed −15 |
| listen_shutter | study | 1 Lexicon + 20 oil | Lore, 3 times |
| open_shutters | study | Sentence 6 + 3 Lexicons | Estate + last beat |
| wax_reserve | study | 40 Ink | Decay ×0.9 once |
| second_desk | study | 50 Ink + 2 Lexicons | +1 desk reveal |
| margin_lamp | study | 24 Ink | Softer vignette (×0.62) |
| codex_bind | study | 1 Lexicon | Sentence list in Study |
| light_cellars | estate | 8 Tallow | First house Light (cheap) |
| light_library | estate | 12 Tallow | Tease after Cellars is lit |
| light_glasshouse | estate | 18 Tallow | After first folio or idle vellum |
| light_vault | estate | 16 Ink | Surplus ink (ink ≥ 40 or Copy assigned) and one other room lit |
| tool_* | estate | ink or silver, r=1.15 | Shorten that room’s batch / drip |
| mechanical_cataloger | estate | 1 Silver + 18 Ink | Library collations finish unattended. Permanent. |
| packet_gate | estate | 1 Lexicon + 1 Folio | Packet down the drive. Nothing returns. Binding stays sealed. |

Estate Lights stagger as dim teases. Interior verbs (Render / Collate / Charge / drip) are not project rows.

**Lexicon craft:** 5 Passages + 8 Ink → `floor((1+0.06W)^2 × aperture × (1 + bleed/500))` lexicons, min 1. W is boards (1 in v1).

---

## 8. Jobs (Study only)

Until Study, every new quill is **Transcribe**.

| Job | Rate | Notes |
| --- | --- | --- |
| Transcribe | +0.5 Insight/s | Default |
| Copy | +0.08 Ink/s, −0.4 Insight/s | Stops when Insight is 0. Offline catch-up matches the live tick (lifetime Insight is credited, then Copy drains; if drain > production, ink throttles and stock stays ~0). |
| Attend the Page | 0.08 runes/s | Needs `attend_lesson` (cannot buy the lesson until a quill exists). Writes runes and can finish pages. ~10 min per 48-rune page with one attendant |
| Ward | Oil decay ×0.85 each | Floor 0.15/s if any ward |

UI: +/− per job; sum = quill count **minus at most one dispatched house quill**. Increasing a job steals from Transcribe first. The house feather is not in the assignment sum until **Recall** (it returns to Transcribe). Study `shift` will not steal that feather; if the counts desync, it is recalled first. Live rates sit on the row (Copy shows the Insight drain).

**Dispatch:** from Study or a room interior, **Send a quill** into a lit room. Decrements a Study assignment (Transcribe first). That room’s batch/drip runs faster until Recall. You cannot send a second. This is a trade, not a second job grid. Estate has no +/− rows.

---

## 9. Time, events, bleed

**Seasons:** Spring → Equinox → Autumn → Solstice → …  
Autumn day 9: *the light will thin tomorrow.* (one Scholar day before Solstice.)

**Events** (at most one / 2 min):

- `draft_under_door` — once, after flame + 2 min play; oil −8
- `wick_gutters` — oil < 25 while lit
- `page_weight` — first page
- `visitor_at_bolt` — once after Study
- `wrong_hour` — Horizon II, after 1 hour play; bleed +1 (repeatable on the 2 min gate)
- `ink_unbidden` — Horizon II + catalog; +1 ink
- `welcome_back` — engine, not the event table
- First stable letter — pages system log
- First tallow (≥1) — *fat gathers on the lip.*
- First ink (≥1) — *the well takes a drop.*
- First Estate tab visit — *the grounds have a shape. you can walk it.*

**Bleed** (0–100, never displayed):

- Up: Sit +4, Under-Text +12, wrong hour +1, offline empty +2
- Down: Study + oil > 50: −0.2/min; Suppress −15
- FX only after Study, unless Reduce Motion / Disable Bleed FX
- 15: occasional flame skip  
- 35: last blotter line repeats once  
- 55: hover label flicker (action unchanged)  
- 70: `[Doubt Memory]` 8 s — no resources; *a name. not yours. dated tomorrow.* (+1 obituaries)  
- 80: brief number jitter  

Horizon I is **eerie only** (absence, bolt). No bleed FX on the Desk.

---

## 10. Attention / dopamine (as designed and wired)

**Lane 1 — Unfold (free):** light, dust at 15 s, tallow smell at 45 s if flame unnamed, named flame, first letter, page turn, Distill, Study tab.

**Lane 2 — Micros:** cheap, r=1.07, ≤ ~10% rate bump.

**Lane 3 — Gates:** first quill, Study, Lexicon, shutters.

**Always one hunger:** a buy, a dim tease, a session goal.

**Target sitting (playtest, not guarantees):**

- 0–15 s: flash + room  
- ~45 s: flame named (8 Insight). Catch the Drip (12 Insight) is the first buy after that — same sitting, not a later micro.  
- 2–4 min: first page, Catalog, Distill  
- 4–8 min: first ink, Press Once / Steady the Hand  
- 10–15 min: first quill (18 ink, drip 0.12/s)  
- 45–75 min (center): Sentence 3, Study for a slow mixed sitting. Desk sentences 1–3 take 5 pages (15 pages / 696 runes). A burst mixed sitting (look-away between clicks) lands near 30 min; a 7 s/click sitting near 80 min. Both should stay inside **30–90 min**. A dedicated clicker can finish the desk sooner; that is accepted. Do not raise pages-per-sentence again to punish 5 CPS.  
- ~1–2 h: first Lexicon (Collation 40 ink + 3 passages, then bind). The old 2–3 h line assumed pages were still the gate after Study; leftover passages already pay for a cover.  
- ~4 h: first Solstice (three 80 min seasons: Spring → Equinox → Autumn → Solstice)  
- 3–5 h: Sentence 6, shutters  
- 5–8 h: Sentences 7–12  

If the player stares at a grey button > 90 s in the first half hour, add an unfold/micro — do not buff Transcribe.

**First automation is the candle drip**, not the quill.

The 80 min season clock is canon. The old 2–3 h Solstice line was a beat-chart slip, not a request to shorten `SEASON_TICKS`.

**Manor hungers (Horizon III):** a cooking bar vs Attend vs sending the only house quill vs the packet tease while a room is still dark. Lights stagger as dim teases. First Light is the Cellars (cheap tallow). The candle drowned pauses all house work.

---

## 11. Presentation and a11y

- Layered ASCII book + shrinking candle (full / diminished / stub / drowned) + vignette (softer with Margin Lamp; pulse under 20% oil if motion allowed).
- Study has a small ASCII scriptorium above the job rows. It reacts to assignments: Transcribe scratches, Copy drips the well, Attend pulses the board, Ward lights the lamp, a dispatched perch goes empty. Frame cycle is independent of Disable flame flicker; Reduce Motion freezes it. Oil brightness matches the book.
- The book panel (`#grimoire-viewport`) keeps a fixed min-height. Glyphs clip inside the page. The candle shortens inside a reserved slot. `fitDesk` scales on resize/layout only, not on every glyph.
- From first light, desktop is a **modified 3-column**: sparse ledger / book / contained blotter. The blotter is sticky and viewport-capped; older lines scroll inside it. The grid does not wait for Study.
- Typewriter only on highlighted story lines; **click or key skips**. `aria-live` gets the full sentence immediately.
- Real `<button>`, `role="tablist"` / `tabpanel`, focus on tab switch. Settings dialog traps Tab and restores focus on close. Settings checkboxes save immediately.
- Settings: Reduce Motion, Disable Bleed FX, Disable flame flicker, Show exact numbers, Export / Import, Abandon (`ABANDON`). The `…` button appears after **90 seconds** of play.
- Keys: **D** Decipher, **W** Trim (desk or darkness overlay) — ignored in text fields.
- After `index`, a Chapter percent (stable letters / runes finished, cap 99 until Sentence 12) shows in the ledger.
- Press Once stays on the list while charges remain, even at its 3-pack cap; unaffordable-with-charges is not the dead grey.
- Optional wick crackle setting exists in state (`wickCrackle`); treat as off-by-default polish.

---

## 12. Endings (v1 vs reserved)

**v1 last beat:** Open the Shutters. Estate names. Binding locked. Silence tease if bleed < 20.

**Reserved (do not implement in v1):**

- **Herald** — read everything, high aperture  
- **Silence / Cauterization** — suppress, keep the house small  
- **Vector** — max bleed, later city  

Prestige when it exists: `C = sqrt(I_L / 1e12)` on lifetime Insight. First rite must feel like a gift. Not in this sitting.

---

## 13. Horizons III–VI

v1 last beat (Open the Shutters) is still a complete sitting. Horizon III continues on **that same save**.

- **III Manor (shipped, SAVE_VERSION 2):** the Estate is an **atelier you walk**, not Study-style job nodes. ASCII map: Hall in the center, Glasshouse north, Library west, Vault east, Cellars south, the gate beyond. Each working room shows a gold progress strip (empty when idle; fuller is closer to done; muted if paused) and a short flavor ASCII line (hooks, shelves, drip, basin, gravel) that stirs while the house is live — atmosphere, not a second meter. Interiors keep a small vignette above the verbs. Enter one interior at a time; other rooms keep their timers. **Render** (tallow → vellum), **Collate** (vellum + ink → folio; pauses unless you are in the Library, a quill is there, or the Mechanical Cataloger is owned), **Tend** (Glasshouse extract drip, faster if you are here or the quill is here, season-scaled, no Golden Cookie spawns), **Charge the bath** (ink, optional extract → silver). Room tools (r=1.15) shorten batch time. At most **one dispatched quill**. Walking a room a second time can leave a scrap (`!` on the map): take it for a short buff (faster that room’s work, or oil / transcribe / whole-house). First entry never drops one. Returning to a cooking room is likelier. Packet at the gate (1 lexicon + 1 folio): blotter says it went down the drive; nothing returns; obituaries are not craftable on the estate. Binding stays sealed.
- **IV Network:** Obituaries cannot be made on the estate; couriers trade Lexicons. Recruits as efficiency numbers. First prestige available.
- **V Astrolabe:** same 80-min season clock drives four named bodies. Aperture vs text density.
- **VI Rite:** burn the house; cinder shop (Memory of Ink, Unshuttered Mind, Dilated Tallow, Under-Text).

No wilderness combat map. The ASCII estate **is** the spatial layer.

---

## 14. File map for authors

| Concern | File |
| --- | --- |
| Sentences, projects, events, jobs, hints | `js/content.js` |
| Oil / tallow / darkness | `js/systems/candle.js` |
| Runes, sentences, echo | `js/systems/pages.js` |
| Costs, format | `js/systems/economics.js` |
| Buys, lexicon, reveals | `js/systems/projects.js` |
| Quill jobs | `js/systems/jobs.js` |
| Estate map, batches, dispatch | `js/systems/estate.js` |
| Bleed FX, Doubt | `js/systems/bleed.js` |
| Save / dirty / log | `js/state.js` |
| Tick, seasons, offline | `js/engine.js` |
| DOM | `js/view.js`, `index.html`, `style.css` |
| Playtest cheats | `js/debug.js` |

Engine must not own flavor strings. Add lines in `content.js`.

---

## 15. Playtest script

Cold boot → Light the Candle → first page → first darkness → first quill → Study with no tooltip → Solstice oil spike → export / import → Abandon → clean boot.

Debug: `dbg` fab, F2, Ctrl+Shift+D, or five taps on the title. **Jump Manor**: shutters, Cellars lit, a little tallow/ink — not four rooms, not a pre-sent quill.

Manor playtest (v1 shutters save): first Light < 3 min; a Render bar you can leave and return to; you never see four +/− rows on Estate; sending the house quill visibly slows Study; first silver from a Vault bath; packet shows while something in the house is still unfinished; overnight, started batches are done and you still have to start the next.

---

## 16. Still author / tune work (not missing pillars)

- Mixed sitting should land Study in 45–75 min. Headless playtest (2026-09-05): at 4 pages/sentence a burst mixed sitter opened Study in 24 min (under the 30 min alarm) and a 7 s/click leisure sitter in 64 min. Desk sentences 1–3 now take **5 pages** (15 pages / 696 runes to Study). Later sentences stay 4 pages so one Attend still lands Sentence 6 ~2 h after Study and Sentence 12 inside 5–8 h. If a *mixed* sitting still lands before 30 min or after 90, change `pagesForSentence` for 1–3 or Attend rate, not the architecture. Dedicated clickers finishing the desk early is expected.
- Drip **0.12/s** and quill **18 ink** are the first-feather knobs (target 10–15 min if the player distills). Do not buff Transcribe.
- First Lexicon is Collation after Study (~1–2 h mixed), not a 2–3 h page gate. Three covers for shutters still want 3–5 h with Sentence 6.
- Season length stays **24000 ticks / 80 min**. First Solstice is ~4 h. Do not shorten the clock to chase the old 2–3 h line.
- Extra Collation boards were planned as repeatable (W ≤ 10). Live is one board. Decide later whether to sell more boards or leave the formula quiet.
- Sound: rising click pitch and crackle are specified; crackle is a setting stub.
- Twelve Sentences are in code; they can be rewritten in the same clinical voice without touching systems.
- `wax_reserve` vs first prism, and flat `shelf` / `spare_lamp` costs, stay as coded until a mixed sitting proves the “best action keeps changing” contract fails.

Older `Docs/*.md` remain for research. **Do not “fix” the game to match them.** Fix the game to match this bible.
