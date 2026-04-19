# Two-way card findings from pt_card_list.csv

## Method

I used two passes so the result would catch real two-way cards without overcounting every player who has a token pitching or batting value.

### 1. Structural two-way check

A card is in the structural pool if the CSV shows both:

- Pitching evidence: `Pos Rating P > 0` or `Position = 1` or `Pitcher Role > 0`
- Hitting evidence: `Position` is between `2` and `10` or any non-pitcher position rating is greater than `0`

That rule matters because a pure position-based filter misses DH cards like `MLB 2026 Live DH Shohei Ohtani LAD`, which has no field position rating but clearly has both batting and pitching data.

### 2. Skill threshold

For the structural pool, I calculated:

- `HitScore = average(Contact, Gap, Power, Eye, Avoid Ks)`
- `PitchScore = average(Stuff, Movement, Control)`

Then I used these buckets:

- Structural two-way: passes the usage check above
- Meaningful two-way: `HitScore >= 55` and `PitchScore >= 55`
- Strong two-way: `HitScore >= 60` and `PitchScore >= 60`
- Elite two-way: `HitScore >= 70` and `PitchScore >= 70`

## Summary

- Structural two-way cards: `133`
- Meaningful two-way cards: `44`
- Strong two-way cards: `30`
- Elite two-way cards: `7`

The most important split is between cards with real pitcher usage and cards that only have small pitcher ratings. A few modern position-player cards have `Pos Rating P` values like `3`, `4`, or `9`; I kept them in a separate bucket because those look more like emergency pitching or conversion hints than true two-way deployment.

## Highest-confidence two-way cards

These are the `44` meaningful cards minus the `5` lower-confidence position-player cases with tiny `Pos Rating P` values.

| Card | HitScore | PitchScore | Pos Rating P |
| --- | ---: | ---: | ---: |
| MLB 2026 Live DH Shohei Ohtani LAD | 102.0 | 86.3 | 72 |
| Launch Deck Missions - Snapshot SP Charlie Sweeney SL5 1884 | 84.0 | 105.3 | 99 |
| Negro League Star CF Lazaro Salazar CSE 1934 | 101.4 | 82.3 | 73 |
| Negro League Star SP Barney Brown NYBY 1937 | 78.4 | 89.0 | 84 |
| St. Patrick's Day Snapshot RF Curry Foley BSN 1880 | 85.4 | 76.3 | 52 |
| Negro League Star SP Leon Day NeEa 1936 | 73.0 | 100.3 | 96 |
| Negro League Star SP Smokey Joe Williams SABB 1909 | 70.8 | 93.0 | 66 |
| Negro League Star SP Bill Gatewood CAG 1912 | 69.0 | 70.0 | 83 |
| Opening Day Heroes - Unsung Heroes 1B Matt Davidson CWS 2018 | 77.8 | 67.7 | 83 |
| Negro League Star CF Double Duty Radcliffe NEL 1944 | 67.0 | 67.3 | 58 |
| Negro League Star SP Bill Byrd CEG 1935 | 67.0 | 80.7 | 68 |
| Negro League Star SP Rube Foster CLG 1910 | 67.0 | 71.7 | 62 |
| Snapshot SP Kid Nichols BSN 1901 | 66.8 | 76.0 | 96 |
| Clubhouse - Negro League Star SP Hilton Smith KCM 1946 | 66.6 | 85.7 | 67 |
| Snapshot SP Charlie Buffinton BS2 1891 | 66.6 | 77.3 | 71 |
| PTCS 1 - Future Legend RF Carson Benge NYM 2026 | 91.2 | 66.3 | 85 |
| Negro League Star SP Ray Brown HoGr 1939 | 65.4 | 85.3 | 87 |
| Snapshot SP Tommy Bond BSN 1884 | 64.6 | 90.7 | 76 |
| Snapshot SP Jack Harshman CWS 1954 | 64.2 | 81.3 | 71 |
| Negro League Star CF Bullet Rogan NEL 1930 | 85.8 | 62.7 | 89 |
| Negro League Star SP Phil Cockrell PHG 1925 | 62.2 | 74.0 | 64 |
| Clubhouse - Negro League Star RF Walter Thomas KCM 1945 | 75.2 | 62.0 | 53 |
| Hardware Heroes SP Old Hoss Radbourn PRO 1884 | 61.6 | 90.3 | 66 |
| Snapshot SP Sam Weaver LS2 1883 | 61.6 | 66.7 | 62 |
| Negro League Star SP Willie Gisentaner HaGi 1925 | 61.4 | 77.0 | 81 |
| Negro League Star CF Hurley McNair CUG 1916 | 77.8 | 60.3 | 71 |
| Rookie Sensation SP Larry Corcoran CHC 1880 | 60.2 | 74.7 | 69 |
| Negro League Star C Goose Curry PhSt 1947 | 85.4 | 60.0 | 53 |
| Snapshot SP Bill Hoffer BLN 1897 | 59.6 | 60.3 | 72 |
| Clubhouse - Negro League Star SP Jack Matchett KCM 1944 | 58.4 | 71.3 | 54 |
| Negro League Star SP Bill Force BBS 1924 | 58.2 | 81.3 | 60 |
| Negro League Star SP Joe Strong HoGr 1933 | 58.0 | 78.3 | 87 |
| Snapshot SP Frank Dwyer CIN 1891 | 57.2 | 59.7 | 68 |
| Negro League Star SP Isidro Fabre CSE 1931 | 56.4 | 65.0 | 98 |
| Negro League Star SP Terris McDuffie PhSt 1942 | 56.4 | 78.7 | 95 |
| Negro League Star SP Henry McHenry NeBr 1932 | 56.2 | 73.0 | 62 |
| Rookie Sensation RF George Hunter BRO 1909 | 56.0 | 62.3 | 55 |
| Negro League Star SP Rufus Lewis NeEa 1947 | 55.8 | 73.7 | 63 |
| Negro League Star SP George Mitchell InAB 1926 | 55.0 | 64.0 | 77 |

## Lower-confidence position-player cards with pitching

These still clear the `55 / 55` skill threshold, but their `Pos Rating P` values are very small, so I would treat them as special cases rather than obvious two-way cards.

| Card | HitScore | PitchScore | Pos Rating P |
| --- | ---: | ---: | ---: |
| FLF 4 - Future Legend RF Braden Montgomery CHW 2026 | 90.0 | 62.7 | 3 |
| MLB 2026 Live 1B Alec Burleson STL | 82.2 | 61.0 | 3 |
| MLB 2026 Live RF Jac Caglianone KC | 74.8 | 58.3 | 4 |
| MLB 2026 Live 2B Casey Schmitt SF | 78.4 | 57.7 | 9 |
| MLB 2026 Live CF Dane Myers CIN | 64.2 | 55.0 | 3 |

## Elite group

The `7` cards that clear both `HitScore >= 70` and `PitchScore >= 70` are:

- MLB 2026 Live DH Shohei Ohtani LAD
- Launch Deck Missions - Snapshot SP Charlie Sweeney SL5 1884
- Negro League Star CF Lazaro Salazar CSE 1934
- Negro League Star SP Barney Brown NYBY 1937
- St. Patrick's Day Snapshot RF Curry Foley BSN 1880
- Negro League Star SP Leon Day NeEa 1936
- Negro League Star SP Smokey Joe Williams SABB 1909

## Recommended interpretation for roster-builder use

If you want a single practical flag in roster-builder, I would use this:

- `isTwoWay = structural two-way AND HitScore >= 55 AND PitchScore >= 55`

If you want a more conservative flag that avoids most edge cases on modern position players, add this:

- `Pos Rating P >= 50 OR Position = 1 OR Pitcher Role > 0`

That conservative version still keeps Ohtani and the obvious historical two-way cards while excluding the low-`Pos Rating P` position-player cases.