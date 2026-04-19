# OOTP Roster Builder

I'd like to reuse some of what I have for the missions calculater to build a roster builder. It will look at cards owned and cards avaialble and suggest full rosters for a specific roster type (e.g. League, Bronze Tournament etc). A separate list of players ranked by win percentage per roster type will be provided. Defense must be taken into account. I do not want to build a model of what cards are better but use external data with win%, combined with existing data on defensive position ratings, and whether a batter is better versus left or right handed pitchers to build a roster and suggest cards to buy to improve it.

## Roster Notes
- OOTP has 26 player rosters
- There are both eras and restrictions to take into account
- Lineups are split into pitchers and hitters
- Pitchers are split into starters and relievers
- Hitters are split by position (C, 1B, etc)
- Hitters have separate lineups for versus right or left handed starting pitchers
- Hitters have both a lineup order and defensive position
- All defensive positions have up to 3 backup spots with a setting on when to play, e.g. when starter is tired, every 3 days etc
- There is a defensive substitution option for each position
- Pinch runners and Pinch hitters can be set, up to 4 for each in order
- Hitter Positions: (C|1B|2B|3B|SS|LF|CF|RF|DH)

## Roster Restrictions
- In league play there are no roster restrictions
- Tournament play can have various different roster restrictions
- The main roster restriction is by card tier, e.g. a Bronze tournament might only allow cards bronze or lower
- Some tournaments are "Cap" tournaments where the total overall of players must not exceed a certain number
- Some tournaments are "Slot" tournaments, limiting the number of players per tier, e.g. a slot tournament may allow one perfect, 2 diamonds, etc. In that case the slots fall through so you can use no perfects and 3 diamonds or 1 perfect and 2 diamonds.

### Era
- Era determines how many pitchers vs batters should be used
- Era determines how many starting pitchers vs relievers should be used
- Era determines if the DH rule is in effect, if it is not the pitcher hits in that spot

#### Standard Era - MLB 2025
- 12 or 13 pitchers
- 5 starting pitchers
- DH enabled
- 13 or 14 hitters

### Ballparks
- Ballpark determines the rate of hits and homeruns for both left and right handed hitters

### Card tiers
- Iron: <60
- Bronze: <70
- Silver: <80
- Gold: <90
- Diamond: <100
- Perfect: >= 100