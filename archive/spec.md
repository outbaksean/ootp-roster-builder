# OOTP Roster Builder — Technical Specification

## Overview

A standalone client-side Vue 3 app that reads card ownership data and win-percentage
rankings to suggest optimal 26-player OOTP rosters for a given roster type (League,
Bronze Tournament, etc.).

This is a separate repository, not part of the ootp-missions-27 monorepo. It reuses the
same tech stack and tooling conventions (Vue 3, Pinia, Vite, Bootstrap 5, Dexie,
PapaParse, TypeScript) but is scaffolded and deployed independently.

No backend. All computation is client-side. Data is persisted in IndexedDB (Dexie) and
localStorage.

---

## Data Sources

### pt_card_list.csv

Primary card database. One row per card. Used for:
- Ownership status and market prices
- All defensive position ratings (C through RF)
- Batting split attributes vs LHP and vs RHP
- Stamina (pitchers)
- Pitcher role (SP / RP / Closer)
- Card tier and overall rating

This file is user-uploaded and refreshed when the user exports a new copy from OOTP.

### IronHitterWinPct.csv (and per-tier equivalents)

Hitter rankings for a specific roster tier. Has a header row. Columns:

| Column | Field | Notes |
|---|---|---|
| Name | Full name | "FirstName LastName" format |
| POS | Position from export | Informational only, not used for roster building |
| Overall | Card overall rating | Used as join key |
| Variant level | Boost/variant tier | Reserved for post-v1 matching |
| Hand | Bats | Informational only, not used for lineup building |
| PA | Plate appearances | Sample size |
| AVG | Batting average | |
| OBP | On-base percentage | |
| Slug | Slugging percentage | |
| wOBA | wOBA | |
| BBpct | Walk percentage | |
| SOpct | Strikeout percentage | |
| HR600 | HR per 600 PA | |
| BABIP | BABIP | |
| WAR600 | WAR per 600 PA | |
| PlayerWinPct | Win percentage | Primary overall ranking field |

Ranking: sorted descending by `PlayerWinPct`. Higher is better.

Note: `Variant level` is present in the CSV and stored in the model but is not used for
join disambiguation in v1. All variants of a player at the same overall rating are treated
as distinct cards.

### IronPitcherWinPct.csv (and per-tier equivalents)

Pitcher rankings for a specific roster tier. No win percentage column. Columns:

| Column | Field | Notes |
|---|---|---|
| Name | Full name | "FirstName LastName" format |
| Overall | Card overall rating | Used as join key |
| Variant level | Boost/variant tier | Reserved for post-v1 |
| Hand | Throws | Informational |
| IP | Innings pitched | Sample size / durability proxy |
| GSper | Games started percentage | Informational |
| IPPerGame | Innings per game | |
| RA9 | Runs allowed per 9 | |
| ERA | Earned run average | Primary ranking field (lower is better) |
| wOBAA | wOBA against | Secondary ranking field (lower is better) |
| K9 | Strikeouts per 9 | |
| BB9 | Walks per 9 | |
| HR9 | HR per 9 | |
| BABIP | BABIP against | |

Ranking: sorted ascending by `ERA`, tiebroken ascending by `wOBAA`.

Pitcher splits (vs LHB / vs RHB) are already baked into the aggregate stats. There is no
way to know opponent batter handedness at roster-build time, so split data is not needed.

---

## Field Encodings (pt_card_list.csv)

### Position (col 22)

| Value | Position |
|---|---|
| 1 | P (pitcher) |
| 2 | C |
| 3 | 1B |
| 4 | 2B |
| 5 | 3B |
| 6 | SS |
| 7 | LF |
| 8 | CF |
| 9 | RF |
| 10 | DH |

### Pitcher Role (col 23)

| Value | Role |
|---|---|
| 0 | Not a pitcher (hitter) |
| 11 | Starting pitcher |
| 12 | Relief pitcher |
| 13 | Closer |

SP, RP, and Closer are treated identically for roster building purposes. Any pitcher
card is eligible for any pitching slot (starter or reliever). The Pitcher Role field
is stored for informational display but plays no part in slot assignment.

### Bats (col 20)

| Value | Hand |
|---|---|
| 1 | Right |
| 2 | Left |
| 3 | Switch |

Stored in the model and displayed in the UI but not used for lineup building logic.
Lineup construction uses split attribute scores derived from pt_card_list instead.

### Throws (col 21)

| Value | Hand |
|---|---|
| 1 | Right |
| 2 | Left |

### Stamina (col 78)

Used to confirm SP vs RP designation. Typical ranges:
- SP: 50-100
- RP: 20-45
- Closer: 10-25

Stamina is informational only. `Pitcher Role` from pt_card_list is authoritative for
SP/RP classification.

### Batting split attributes (pt_card_list)

Each hitter has two sets of batting attributes: vs LHP and vs RHP.

| Columns | Fields |
|---|---|
| Contact vL, Gap vL, Power vL, Eye vL, Avoid K vL | Performance against LHP |
| Contact vR, Gap vR, Power vR, Eye vR, Avoid K vR | Performance against RHP |

Values are 0-200 scale attribute ratings. A derived composite score is computed per split:

```
vLScore = average(Contact vL, Gap vL, Power vL, Eye vL, Avoid K vL)
vRScore = average(Contact vR, Gap vR, Power vR, Eye vR, Avoid K vR)
```

`vLScore` is used when building the vs-LHP lineup (opponent pitcher is left-handed).
`vRScore` is used when building the vs-RHP lineup (opponent pitcher is right-handed).

These scores are only available when pt_card_list has been loaded. If pt_card_list is
absent, lineup construction falls back to `PlayerWinPct` for both lineups.

### Defensive Position Ratings (cols 94-102)

| Column | Field |
|---|---|
| 94 | Pos Rating P |
| 95 | Pos Rating C |
| 96 | Pos Rating 1B |
| 97 | Pos Rating 2B |
| 98 | Pos Rating 3B |
| 99 | Pos Rating SS |
| 100 | Pos Rating LF |
| 101 | Pos Rating CF |
| 102 | Pos Rating RF |

Values are 0-100 scale. A value of 0 means the player cannot play that position and is
excluded from consideration for it. All nine defensive ratings are stored for every
hitter. Primary position from pt_card_list is stored as informational context but is
not used by the optimizer.

---

## Data Joining Strategy

### Joining win% CSV to pt_card_list

Win% CSVs do not contain a Card ID. Join key (v1):
1. Normalize both names to lowercase, letters only (strip spaces and non-alpha characters)
2. Match normalized `Name` from win% CSV against normalized `FirstName + LastName` from
   pt_card_list
3. Among name matches, filter to those where `Overall` from win% CSV equals `Card Value`
   from pt_card_list

Multiple pt_card_list rows can match the same win% row (same name, same overall, different
variant). In v1, all matching rows are treated as the same player and the first match is
used. Post-v1, `Variant level` will be used to disambiguate.

Unmatched win% rows retain their ranking data but have `owned = false` and
`marketPrice = 0` and no split attributes.

Unmatched pt_card_list rows (no win% entry) are excluded from the optimizer.

### Card Value and Tier

`Card Value` from pt_card_list is the card's overall rating. Tier is derived:

| Overall | Tier |
|---|---|
| < 60 | Iron |
| 60-69 | Bronze |
| 70-79 | Silver |
| 80-89 | Gold |
| 90-99 | Diamond |
| 100+ | Perfect |

---

## Data Model

```typescript
type FieldingPosition = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF'
type HitterPosition = FieldingPosition | 'DH'
type PitcherHand = 'L' | 'R'
type BatterHand = 'L' | 'R' | 'S'
type CardTier = 'Iron' | 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Perfect'

// All nine defensive ratings for a hitter.
// posRatingP is stored from pt_card_list but not used in roster building.
type DefenseRatings = {
  posRatingP: number
  posRatingC: number
  posRating1B: number
  posRating2B: number
  posRating3B: number
  posRatingSS: number
  posRatingLF: number
  posRatingCF: number
  posRatingRF: number
}

type HitterCard = {
  // Identity
  cardId: number | null         // from pt_card_list; null if win%-only row
  name: string                  // "FirstName LastName"
  cardTitle: string | null      // full title from pt_card_list
  overall: number
  variantLevel: number          // stored, not used for join disambiguation in v1
  tier: CardTier
  bats: BatterHand | null       // informational; null if pt_card_list not loaded

  // Informational position context (not used by optimizer)
  primaryPositionCode: number | null  // raw value from pt_card_list col 22

  // Overall ranking (from win% CSV)
  playerWinPct: number          // primary sort key for overall ranking, descending
  rankIndex: number             // 0-based position in win% file

  // Batting stats (from win% CSV)
  pa: number
  avg: number
  obp: number
  slg: number
  woba: number
  bbPct: number
  soPct: number
  hr600: number
  babip: number
  war600: number

  // Split scores (derived from pt_card_list batting split attributes)
  // null when pt_card_list is not loaded; falls back to playerWinPct in that case
  vLScore: number | null        // composite score vs LHP; used for vL lineup
  vRScore: number | null        // composite score vs RHP; used for vR lineup

  // Raw split attributes (from pt_card_list; stored for display)
  contactVL: number | null
  gapVL: number | null
  powerVL: number | null
  eyeVL: number | null
  avoidKVL: number | null
  contactVR: number | null
  gapVR: number | null
  powerVR: number | null
  eyeVR: number | null
  avoidKVR: number | null

  // Defense (from pt_card_list)
  defense: DefenseRatings | null  // null when pt_card_list not loaded

  // Ownership (from pt_card_list)
  owned: boolean
  sellOrderLow: number
  last10Price: number
}

type PitcherCard = {
  // Identity
  cardId: number | null
  name: string
  cardTitle: string | null
  overall: number
  variantLevel: number
  tier: CardTier
  throws: PitcherHand | null    // null if pt_card_list not loaded

  // Role (informational only; all pitchers are eligible for any pitching slot)
  pitcherRoleCode: number | null  // raw value from pt_card_list col 23

  // Ranking (from pitcher win% CSV)
  rankIndex: number             // 0-based position, ERA-sorted ascending (0 = best)

  // Pitching stats (from win% CSV)
  ip: number
  gsPer: number
  ipPerGame: number
  ra9: number
  era: number                   // primary sort key, ascending
  wobaa: number                 // secondary sort key, ascending
  k9: number
  bb9: number
  hr9: number
  babipAgainst: number

  // Pitcher attributes (from pt_card_list)
  stamina: number | null        // null if pt_card_list not loaded

  // Ownership (from pt_card_list)
  owned: boolean
  sellOrderLow: number
  last10Price: number
}
```

---

## Pitcher Ranking and Slot Assignment

All pitchers share a single ranking list regardless of their role designation (SP, RP,
or Closer).

When filling starter slots, a composite score is used:

```
starterScore = (rankScore * offenseWeight) + (stamina * staminaWeight)
```

`staminaWeight` is user-configurable (default 0.35) and stored in `useSettingsStore`
alongside the per-position defense weights. A pitcher with a high rank score but very
low stamina will score lower for starter slots, allowing a more durable pitcher to fill
that role instead. For reliever slots, only `rankScore` is used — stamina is not a
factor for short stints.

Stamina is sourced from pt_card_list. If pt_card_list has not been loaded, starter slots
are filled by rank score alone.

---

## Era Configuration

Eras are preconfigured. The user selects an era from a dropdown; there are no manual
pitcher/hitter count controls.

### Standard (MLB 2025)

| Setting | Value |
|---|---|
| DH enabled | Yes |
| Starting pitchers | 5 |
| Relief pitchers | 7 |
| Total pitchers | 12 |
| Total hitters | 14 |
| Total roster | 26 |

Additional eras may be added in future versions with different DH rules and
pitcher/hitter splits.

### Hitter slot budget

With 14 hitter spots:
- 9 fielding positions (C, 1B, 2B, 3B, SS, LF, CF, RF) and 1 DH = up to 10 unique
  starters per lineup
- vL and vR lineups may have different players at the same position, so up to 20 unique
  starting positions in theory, but constrained to 14 total hitter slots
- Remaining hitter slots (after unique starters) fill backup and pinch roles

---

## Roster Restrictions (v1)

### League play

No restrictions. All cards are eligible regardless of tier or overall.

### Tier cap

Only cards at or below a specified tier are eligible. A Bronze tier cap allows Iron and
Bronze cards only. Cards above the cap are excluded from the candidate pool before the
optimizer runs.

Overall cap and slot tournament restrictions are deferred to a later version.

---

## Roster Building Algorithm

### Input

- `hitters: HitterCard[]` — full pool, pre-filtered by active restriction and owned mode
- `pitchers: PitcherCard[]` — full pool, pre-filtered by active restriction and owned mode
- `era: EraConfig` — pitcher/hitter counts, DH flag

### Owned mode

By default the optimizer only considers cards where `owned = true`. A toggle ("Show best
possible roster") switches to the full pool regardless of ownership. The active mode is
stored in `useSettingsStore` and persists across sessions.

### Composite position score

For each fielding position `pos` and lineup side `side` (vL or vR):

```
splitScore = side === 'vL' ? card.vLScore : card.vRScore
             ?? card.playerWinPct  // fallback if split scores unavailable

posRating = card.defense?.posRating[pos] ?? 0

if posRating === 0: player is ineligible for this position

defenseWeight = settings.defenseWeights[pos]   // 0.0 – 1.0, user-configurable
offenseWeight = 1 - defenseWeight

compositeScore = (splitScore * offenseWeight) + (posRating * defenseWeight)
```

Players are ranked for a given position and lineup side by `compositeScore` descending.

Defense weight is configured per position because defensive value is not equal across
the field. Default weights reflect the conventional importance of defense at each
position:

| Position | Default defense weight |
|---|---|
| C | 0.50 |
| SS | 0.45 |
| CF | 0.40 |
| 2B | 0.38 |
| 3B | 0.35 |
| LF | 0.25 |
| RF | 0.25 |
| 1B | 0.15 |

DH has no defensive component. DH candidates are ranked by `splitScore` only.

### Step 1: Build vR lineup (vs RHP)

For each of the 9 fielding positions and DH:
- Build the candidate pool: all hitters with `posRating > 0` at this position
  (all hitters for DH)
- Rank by composite score (vR side) descending
- Take the highest-ranked unassigned player as the vR starter

Assignment is greedy left-to-right across positions. Position order: C, SS, 2B, 3B, 1B,
CF, LF, RF, DH. Infield/premium positions are filled first to ensure defensively demanding
spots are covered by the best eligible players.

### Step 2: Build vL lineup (vs LHP)

Repeat Step 1 using vL composite scores. A player already assigned as a vR starter at a
position may also be the vL starter (same player, one roster slot). A different player may
be selected if a higher composite score is available.

### Step 3: Resolve hitter roster slots

Count unique players across both lineups. This is the minimum required hitter count.

If unique starters > 14 (era hitter limit):
- For each position where vL and vR starters differ, compute the score delta for both
  sides if a single shared player were used instead
- Consolidate positions with the smallest combined score loss first until unique
  starters <= 14

### Step 4: Fill backups and pinch roles

Remaining hitter slots = 14 - unique starters.

For each fielding position, fill up to 3 backup slots from hitters already in the 26-man
roster (from Step 3) who have `posRating > 0` at that position and are not that
position's starter. Order backups by `posRating[position]` descending.

Defensive substitution for each position = the backup with the highest `posRating` at
that position.

Fill remaining open hitter slots (if any) with pinch roles:
- Pinch hitters: highest `playerWinPct` among unassigned hitters in the 26-man pool
- Pinch runners: highest `war600` among remaining unassigned hitters

### Step 5: Fill pitching staff

From the filtered pitcher pool:
- Rank all pitchers by `starterScore` (rank score + stamina composite)
- Select the 5 highest `starterScore` pitchers as starters
- Rank all remaining pitchers by `rankScore` alone
- Select the 7 highest-ranked remaining pitchers as relievers

### Step 6: Validate

Check:
- Exactly 26 players total
- Pitcher count matches era config
- Hitter count matches era config
- All 9 fielding positions and DH have a vR starter and vL starter
- Active tier restriction satisfied for all 26 cards

Return `validationErrors: string[]`. An invalid roster is still displayed but flagged.

### Upgrade suggestions

Deferred to post-v1.

---

## UI Structure

```
App.vue
  Sidebar
    DataStatusWidget     upload status for pt_card_list and win% CSVs
    RosterTypeSelector   dropdown: League / Bronze / Silver / Gold / Diamond
    EraSelector          dropdown: Standard (MLB 2025) / [future eras]
    RestrictionInfo      read-only display of active restriction rules
    OwnedToggle          toggle: "Owned cards only" (default) / "Best possible roster"
  WeightsSettingsModal   per-position defense weight sliders (0–100%), stamina weight slider,
                         reset to defaults button
  MainPanel
    RosterView
      PitchingStaff      starters table, relievers table (with stamina, ERA, IP)
      HitterLineup       position grid: vR starter / vL starter / backups per row
      SpecialRoles       pinch hitters, pinch runners
      RosterSummary      26/26 player count, total acquisition cost for unowned cards
    UpgradeList          suggested acquisitions sorted by rank improvement
  DataImportModal        upload zones: pt_card_list CSV, win% CSV (with tier selector)
  AppHelpModal
```

No routing. All navigation is sidebar-driven. Changing any sidebar control immediately
re-runs the optimizer. Changes to per-position defense weights trigger a rebuild after a
300ms debounce to avoid redundant rebuilds while a slider is being dragged.

Unowned cards are displayed in a visually distinct style (muted/dimmed) but are included
in the roster if they are the best available option. Acquisition cost is shown alongside.

No icons, emojis, checkboxes, or symbol characters anywhere in the UI.

---

## State Management

### usePlayerStore (Pinia)

Owns the merged `HitterCard[]` and `PitcherCard[]` lists.

- Loads win% CSVs from `public/data/` on init (one per tier per player type)
- Accepts user-uploaded win% CSV overrides (with tier selector in DataImportModal)
- Accepts user-uploaded pt_card_list.csv to update ownership, prices, defense ratings,
  and split attributes
- Performs name + overall join between win% rows and pt_card_list rows
- Derives `vLScore`, `vRScore` from split attributes after join
- Persists merged player data in IndexedDB (`OOTPRosterBuilderDB`)

### useRosterStore (Pinia)

Owns the built roster and optimizer inputs.

- Runs the optimizer reactively when roster type, era, or player data changes
- Persists last-built roster to localStorage
- Exposes `currentRoster`, `isBuilding`, `validationErrors`

### useSettingsStore (Pinia)

Persists user preferences to localStorage:
- Active roster type ID
- Active era ID
- Owned-only mode (boolean, default true)
- Per-position defense weights (map of `FieldingPosition` to a value 0.0–1.0)
  Defaults to the table above. User can reset to defaults at any time.
- Stamina weight for starter slot selection (0.0–1.0, default 0.35)

---

## IndexedDB Schema

Database name: `OOTPRosterBuilderDB`

Tables:
- `hitterCards` — primary key: `cardId` when available, else `${name}__${overall}`
- `pitcherCards` — same primary key structure
- `winPctCache` — raw parsed win% CSV rows keyed by `${tierId}_${playerType}`

---

## Implementation Phases

### Phase 1: Scaffolding and data layer

- Scaffold new standalone Vite + Vue 3 repo (separate from ootp-missions-27)
- Copy tooling config (package.json, tsconfig, eslint, prettier, vite.config) from
  ootp-missions-27 as a starting template
- Copy CSS assets
- Write TypeScript models (`HitterCard`, `PitcherCard`, `DefenseRatings`, enums)
- Write `indexedDB.ts` with `OOTPRosterBuilderDB`
- Write `usePlayerStore`: parse `IronHitterWinPct.csv` and `IronPitcherWinPct.csv` from
  `public/data/`, compute `rankIndex`, store in IndexedDB
- Minimal `App.vue` with a plain player table to verify data loading

### Phase 2: pt_card_list integration

- Parse pt_card_list.csv: position ratings, stamina, pitcher role, owned, prices,
  batting split attributes
- Implement name + overall join; derive `vLScore`, `vRScore`, `defense`, `spEligible`
- Build `DataImportModal` and `DataStatusWidget`
- Player table shows owned status and split scores

### Phase 3: Roster optimizer

- Write `helpers/RosterOptimizer.ts` (all steps above)
- Write `useRosterStore`
- Build `RosterTypeSelector` and `EraSelector` sidebar controls
- Build `RosterView`, `PitchingStaff`, `HitterLineup`, `SpecialRoles`
- Wire sidebar controls to trigger reactive optimizer runs

### Phase 4: Tier cap restriction

- Implement tier cap filtering in optimizer
- Add Bronze / Silver / Gold / Diamond roster types with appropriate cap rules
- Build `RestrictionInfo` sidebar widget

### Phase 5: Additional tiers

- Add win% CSV files for Bronze, Silver, Gold, Diamond as they become available
- Tier selector activates corresponding data set

### Post-v1 (deferred)

- Upgrade / buy suggestions
- Overall cap tournaments
- Slot tournaments with fallthrough
- Variant level disambiguation in join key
- Ballpark factor adjustments
- Manual lineup reordering
- Roster export
