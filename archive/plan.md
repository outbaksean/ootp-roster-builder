# OOTP Roster Builder — High Level Plan

## Concept

The app is two loosely coupled systems: a **ranking engine** and a **roster builder**.
The roster builder only needs a ranked player list as input — it does not care how that
list was produced.

---

## Tournament Export Format

Exports are CSV files named by roster type and tournament ID (e.g. `Bronze_806.csv`).
Each file contains one row per player per team appearance in that tournament. The same
card can appear multiple times if multiple teams used it.

Key fields:
- `CID` — card ID, matches `Card ID` in pt_card_list directly. No fuzzy matching needed.
- `POS` — position: SP, RP, CL, C, 1B, 2B, 3B, SS, LF, CF, RF, DH. SP, RP, and CL are
  all treated as pitchers with no distinction — any pitcher can fill any pitching slot.
- `VAL` — card overall rating
- `Tier` — card tier (Iron, Bronze, etc.)
- Card attributes — CON, GAP, POW, EYE, K's (hitters); STU, MOV, CON_1 (pitchers) and
  their vL/vR splits. Already present in the export; no pt_card_list join needed for
  model training.
- Per-appearance performance stats — hitters: PA, WAR, wRAA, OPS, WPA; pitchers: IP,
  WAR, SIERA, WPA. These are summed/averaged across all appearances of the same CID when
  building the model.

A single export may contain multiple tiers (e.g. a Bronze tournament includes Iron cards).

---

## System 1: Ranking Engine

### Data inputs

**Tournament exports (accumulated over time)**

Multiple exports are combined. For each unique CID across all imports:
- Counting stats (PA, IP, etc.) are summed
- Rate stats are recalculated from the aggregated totals
- Card attributes are taken from any appearance (they are fixed per card)

The more exports accumulated, the more cards are covered and the more reliable the
performance estimates become.

**pt_card_list.csv**

Used only to score cards that have never appeared in any export. Provides card attributes
(CON, GAP, POW, EYE, K's for hitters; STU, MOV, CON for pitchers) for every card in the
game. A regression model trained on export data maps these attributes to a predicted rank
score.

### How ranking works

For cards that have appeared in at least one export, rank score is derived from their
aggregated performance. The choice of which performance metric(s) to use as the rank
score target will be determined by analysing the accumulated export data — looking at
which metrics are most stable, most predictive, and best spread across the player pool.
Sample size (PA for hitters, IP for pitchers) is taken into account: scores from small
samples are weighted down or treated as less reliable than those from large samples.
A card is considered "observed" once it clears a minimum sample size threshold.

For cards with no export appearances (or below the minimum threshold), a regression
model predicts a rank score from their pt_card_list attributes. The model is trained on
the set of cards that have sufficient observed data.

Both paths produce the same output format: a numeric rank score per card.

### Output

A ranked player list: one score per card identified by CID. Covers:
1. Cards seen in exports (directly observed performance)
2. Cards not yet seen (model-predicted score)

---

## System 2: Roster Builder

### Ranking list input

The roster builder accepts a ranked player list from one of two sources:
1. Output of the ranking engine
2. Any imported ranking list (e.g. a community tier list, a CSV with name and score)

The roster builder is agnostic to the source. Both are treated identically once loaded.

### Other inputs

**pt_card_list.csv**
- Ownership and market prices
- Defensive position ratings for all 9 positions per hitter
- Batting split attributes (vL / vR) used to build separate vs-LHP and vs-RHP lineups

### How the roster builder works

Given a ranked player list, players are assigned to the 26 roster slots using:
- A composite score per fielding position = weighted combination of rank score and
  defensive position rating
- Per-position defense weights are user-configurable with sensible defaults
  (C and SS weight defense most heavily; 1B weights it least)
- Separate vL and vR lineups built from pt_card_list batting split attributes
- Owned-only mode by default; toggle to best possible roster ignoring ownership
- Roster type restrictions (League play, tier cap) filter the eligible pool before
  building

Full roster building mechanics are documented in spec.md.

---

## Data Flow

```
Tournament exports --|
                     |--> aggregate by CID --> observed performance scores --|
                                                                             |--> Ranking Engine --> Ranked list --|
pt_card_list ------> regression model --> predicted scores for unseen cards -|                                    |
                                                                                                                  |--> Roster Builder --> Built roster
pt_card_list (defense / splits / ownership) -----------------------------------------------------------------------|
```

---

## Ranking list format

A ranking list is a flat map of CID to numeric score. Higher score = better player.
Hitters and pitchers are ranked in separate lists (a hitter score and pitcher score are
not directly comparable). The format is the same regardless of source.

---

## Phased approach

**Phase 1 — Roster builder with imported ranking list**
Build the roster builder using the existing Iron win% CSVs as the ranking source.
Establishes the full roster building pipeline before the ranking engine exists.

**Phase 2 — Tournament export ingestion**
Build the import and accumulation pipeline for tournament exports.
Parse the export format, aggregate stats by CID across multiple files, store in
IndexedDB. Display coverage: how many cards have observed data vs. predicted.

**Phase 3 — Ranking engine**
Derive rank scores from aggregated performance stats for observed cards.
Fit a regression model on (card attributes -> rank score) for unobserved cards.
Produce a unified ranked list covering all cards in pt_card_list.

**Phase 4 — Integration and refinement**
Replace the imported win% CSVs with the ranking engine output as the default ranking
source. Imported lists remain supported as an override. Add more tournament exports
over time to improve coverage and accuracy; model is refitted on demand.
