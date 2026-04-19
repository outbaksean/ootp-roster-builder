# OOTP Roster Builder Backlog

## v1 (current)

- Card pool loaded from bundled pt_card_list.csv on first visit; user can upload to override
- Revert to bundled from uploaded data (Use bundled button in Card Data panel) — done
- Roster view: add/remove players, filter by name/OVR/position, two-way player support
- Pitching view: SP/RP slot assignment, flexible rotation size (4/5/6), drag and drop
- Lineups view: depth chart per position, batting order derived from depth chart, drag to reorder

## v2

- Graphical depth chart view: baseball diamond layout with a card at each fielding position showing the depth starter's name, position, and key stats; vR/vL toggle; replaces or supplements the current table-based depth chart in the Lineups view
- Owned cards only toggle: currently in UI but not wired to card data; implement filtering
- Help button and modal with usage guidance
- RP role options: expand primary role from current 4 values to match game options (Closer, Stopper, Setup, Specialist, Middle Relief, Long Relief, Emergency SP, None specified); add secondary role field with same list plus High Leverage, Mop-up, Opener, Follower, and none
- RP usage option: add Usage field per RP slot (Use more often, Normal Usage, Use less often, Avoid high leverage)
- Lineup utility starts: expand from current 3 options (Never, If Starter Tired, Every 3rd/5th Game) to full game list (Never, If Starter tired, Ev. 2nd through Ev. 20th Game with the specific intervals the game exposes)

## vlater

- Name and export rosters to HTML and CSV
- Toggle to restrict roster to rostered players in pitching/lineups views (default on = current behavior; off = draw from full card pool)
- Roster type filtering: implement the existing dropdown so it restricts eligible cards by tier; expand as needed
- Cleanup uploading flow and help text around it
