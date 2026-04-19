# OOTP Roster Builder v1 — Plan

## What v1 does

The user uploads their `pt_card_list.csv` and builds a 26-man roster by assigning
cards to roles using a layout that mirrors the game. Two main views — Pitching and
Lineups — match the in-game screens. No optimizer. No win% ranking files.

---

## Layout

```
App.vue
  nav bar
    cratervar.com link | app title
    tab bar: PITCHING | LINEUPS
  sidebar (left, collapsible — same pattern as ootp-missions-27)
    CardUploader       — upload pt_card_list.csv
    RosterTypeSelector — League / Bronze / Silver / Gold / Diamond / Perfect
    RosterSummary      — X/26 players, validation error count
  main panel
    split layout: top half = card table, bottom half = configuration panels
```

The top table is the card pool. The bottom panels are where roster decisions are made.
Clicking a slot in the bottom activates it; clicking a row in the top table assigns
that card to the active slot.

---

## PITCHING view

### Top: pitcher table

Full-width scrollable table of all pitchers in the card pool (owned only by default).
Columns: PO, #, Name, T (throws), IP, ERA, WHIP, K/9, BB/9, HR/9, Stamina, Tier, Price.

Cards already assigned to the roster appear muted with their role shown (SP 1, RP 3, etc.).
Clicking a row when a slot is active assigns that card.

### Bottom left: Starting Rotation

5 numbered slots (1–5). Each slot shows: slot #, throws hand, player name, key stats.
Up/down buttons to reorder. Clicking a filled slot re-activates it for reassignment.
Clear button (x) on each slot removes the player.

### Bottom right: Bullpen

List of assigned relievers with a Primary Role dropdown per player:
- Closer
- Middle Relief
- Long Relief
- Specialist

Relievers are ordered; up/down buttons to reorder priority.

---

## LINEUPS view

### Sub-tabs

VS RHP + DH | VS LHP + DH

Each sub-tab is a fully independent configuration. Switching tabs swaps all three
bottom panels. The top stats table stays the same.

### Top: hitter table

Full-width scrollable table of all hitters in the card pool.
Columns: PO, #, Name, B (bats), T (throws), vR overall, vL overall, defense ratings
for all 8 positions, Tier, Price.

Assigned cards shown muted with their role (e.g., "SS Starter", "Utility 1 C").
Clicking a row when a slot is active assigns that card.

### Bottom left: Lineup

9-slot batting order for the active tab (VS RHP or VS LHP).
Each slot shows: batting order #, bats hand, player name, position dropdown.
Position dropdown lets the user set which position that player plays in this lineup
(e.g., a utility player might be 1B vs RHP but DH vs LHP).
Up/down buttons to reorder. Clear (x) on each slot.

### Bottom middle: Depth Chart

One row per fielding position: C, 1B, 2B, 3B, SS, LF, CF, DH.
Columns per row:
- POS label
- Depth Starter (primary backup — player name, click to assign)
- Utility 1 — player name + Starts dropdown (If Starter Tired / Every 3rd Game /
  Every 5th Game / Never)
- Utility 2 — same structure as Utility 1
- Defense Sub — player name (click to assign; used for late-game defensive replacements)

### Bottom right: Bench

Two side-by-side lists, each with 4 numbered priority slots:
- Pinch Hitters (1–4)
- Pinch Runners (1–4)

---

## Interaction model

1. User clicks a slot in any bottom panel — it becomes the **active slot** (green outline).
2. The top table filters to show eligible cards for that slot type:
   - Pitcher slots: shows pitchers only
   - Hitter slots: shows hitters only; fielding slots filter further by posRating > 0
3. User clicks a row in the top table — card is assigned to the active slot.
4. Active slot advances automatically to the next empty slot of the same type.
5. If the card is already assigned elsewhere in the roster, the old assignment is
   cleared and the slot is updated.
6. Clicking a filled slot re-selects it as active (for reassignment or removal).
7. Clear (x) on a slot removes the assignment without affecting other slots.

No drag-and-drop for v1.

---

## Data model

```typescript
type BullpenRole = 'Closer' | 'MiddleRelief' | 'LongRelief' | 'Specialist';
type UtilityStarts = 'IfStarterTired' | 'Every3rdGame' | 'Every5thGame' | 'Never';

type RosterPitcher = {
  cardId: number;
  role: 'SP' | 'RP';
  order: number;           // 1-5 for SP, 1-7 for RP
  bullpenRole?: BullpenRole; // RP only
};

type DepthSlot = {
  depthStarterCardId: number | null;
  utility1CardId: number | null;
  utility1Starts: UtilityStarts;
  utility2CardId: number | null;
  utility2Starts: UtilityStarts;
  defSubCardId: number | null;
};

type LineupSlot = {
  cardId: number | null;
  position: FieldingPosition | 'DH' | null; // which position they play in this lineup
};

type LineupConfig = {
  slots: LineupSlot[];  // 9 entries, indices 0-8 = batting order 1-9
  depth: Record<FieldingPosition | 'DH', DepthSlot>;
  pinchHitters: (number | null)[];  // cardIds, 4 slots
  pinchRunners: (number | null)[];  // cardIds, 4 slots
};

type Roster = {
  pitchers: RosterPitcher[];
  lineupVR: LineupConfig;
  lineupVL: LineupConfig;
  rosterType: RosterType;
  era: Era;
};
```

Roster persisted to localStorage as JSON.

---

## Data layer

### Keep as-is
- `helpers/parsePtCardList.ts`
- `data/indexedDB.ts` (adjust table names)
- `models/types.ts` (strip optimizer fields; keep card identity, defense, splits,
  stamina, ownership, prices)

### Rewrite
- `stores/useCardStore.ts` (rename from usePlayerStore, remove export merging)
- `stores/useRosterStore.ts` (new — owns Roster state, localStorage persistence,
  validation, active slot tracking)
- `stores/useSettingsStore.ts` (new — just rosterType, era, ownedOnly)

---

## Validation (live, shown in sidebar summary)

- Total assigned players must be exactly 26 (unique cardIds across all slots)
- Exactly 5 SPs and 7 RPs assigned
- Every fielding position and DH has a lineup starter in both vR and vL lineups
- Exactly 9 batters in each lineup, batting orders 1–9 filled, no duplicates
- No card appears in more than one slot across the entire roster
- All cards satisfy the active tier cap (if roster type is not League)

---

## Build phases

### Phase 1: Data layer
- Slim down `models/types.ts`: drop optimizer-only fields, keep card identity,
  defense ratings (all 8 positions), vL/vR split scores, stamina, bats/throws,
  pitcher role, ownership, prices
- Rewrite `useCardStore.ts`: parse + persist `pt_card_list.csv`; expose `hitters[]`,
  `pitchers[]`, `cardById`; no export merging
- Update `indexedDB.ts` table names to match
- Smoke test: cards load and display correctly

### Phase 2: App shell + layout
- `App.vue`: nav (cratervar, tab bar PITCHING/LINEUPS), collapsible sidebar, split
  main panel (top table + bottom panels)
- `CardUploader.vue`: upload widget matching ootp-missions-27 style
- `PitcherTable.vue` and `HitterTable.vue`: read-only stat tables with muted/active
  state for assigned cards; row click fires assignment event
- `useRosterStore.ts`: Roster state, active slot tracking, assign/clear actions,
  localStorage persistence

### Phase 3: Pitching view
- `PitchingView.vue`: wires PitcherTable (top) + StartingRotation + Bullpen (bottom)
- `StartingRotation.vue`: 5 numbered slots, up/down reorder, clear
- `Bullpen.vue`: reliever list with Primary Role dropdown, up/down reorder, clear
- Active slot logic: clicking a slot sets it active in the store; clicking a table
  row calls assign; slot auto-advances to next empty

### Phase 4: Lineups view — lineup order + bench
- `LineupsView.vue`: sub-tabs (VS RHP / VS LHP), wires HitterTable + LineupPanel +
  DepthChart + Bench
- `LineupPanel.vue`: 9 batting order slots each with player name + position dropdown;
  up/down reorder, clear
- `Bench.vue`: 4 pinch hitter slots + 4 pinch runner slots; assign via table click

### Phase 5: Lineups view — depth chart
- `DepthChart.vue`: 8 rows (C/1B/2B/3B/SS/LF/CF/DH), each with Depth Starter /
  Utility 1 + Starts dropdown / Utility 2 + Starts dropdown / Defense Sub
- Fielding slots filter hitter table to posRating > 0 for that position when active
- DH slot shows all hitters

### Phase 6: Validation + polish
- Wire all validation; show error count in sidebar, inline flags per section
- RosterTypeSelector: tier cap enforcement (card picker dims ineligible cards)
- Owned-only toggle: hides/shows unowned cards in the top table
- Roster reset, persist/restore on reload
