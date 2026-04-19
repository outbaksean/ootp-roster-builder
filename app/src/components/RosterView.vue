<script setup lang="ts">
import { ref, computed } from "vue";
import { useCardStore } from "@/stores/useCardStore";
import { useRosterStore } from "@/stores/useRosterStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import {
  FIELDING_POSITIONS,
  getPosRating,
  pitcherRoleLabel,
} from "@/models/types";
import type { HitterCard, PitcherCard, FieldingPosition } from "@/models/types";

const cardStore = useCardStore();
const rosterStore = useRosterStore();
const settingsStore = useSettingsStore();

// ── Filter state ──────────────────────────────────────────────────────────────

const searchText = ref("");
const ovrMin = ref<string>("");
const ovrMax = ref<string>("");
type PosFilter = "all" | "P" | FieldingPosition | "DH";
const posFilter = ref<PosFilter>("all");

// ── Combined pool ─────────────────────────────────────────────────────────────

type PoolPlayer =
  | { kind: "pitcher"; card: PitcherCard }
  | { kind: "hitter"; card: HitterCard }
  | { kind: "twoWay"; card: PitcherCard; hitterCard: HitterCard };

function poolCardId(player: PoolPlayer): number {
  return player.card.cardId;
}

const allPlayers = computed((): PoolPlayer[] => {
  let pitchers: PitcherCard[] = cardStore.pitchers;
  let hitters: HitterCard[] = cardStore.hitters;
  if (settingsStore.ownedOnly) {
    pitchers = pitchers.filter((p) => p.owned);
    hitters = hitters.filter((h) => h.owned);
  }
  const twoWayIds = cardStore.twoWayCardIds;
  const combined: PoolPlayer[] = [
    ...pitchers.map((p): PoolPlayer => {
      if (p.isTwoWay) {
        const hCard = cardStore.hitterById.get(p.cardId);
        if (hCard) return { kind: "twoWay", card: p, hitterCard: hCard };
      }
      return { kind: "pitcher", card: p };
    }),
    ...hitters
      .filter((h) => !twoWayIds.has(h.cardId))
      .map((h): PoolPlayer => ({ kind: "hitter", card: h })),
  ];
  return combined.sort((a, b) => b.card.overall - a.card.overall);
});

const filteredPlayers = computed((): PoolPlayer[] => {
  const q = searchText.value.trim().toLowerCase();
  const min = ovrMin.value !== "" ? Number(ovrMin.value) : null;
  const max = ovrMax.value !== "" ? Number(ovrMax.value) : null;
  const pos = posFilter.value;

  return allPlayers.value.filter((player) => {
    const name = player.card.name;
    if (q && !name.toLowerCase().includes(q)) return false;
    if (min !== null && player.card.overall < min) return false;
    if (max !== null && player.card.overall > max) return false;
    if (pos !== "all") {
      if (pos === "P") return player.kind !== "hitter";
      if (pos === "DH") return player.kind !== "pitcher";
      // fielding position
      if (player.kind === "pitcher") return false;
      const hCard = player.kind === "twoWay" ? player.hitterCard : player.card;
      return getPosRating((hCard as HitterCard).defense, pos) > 0;
    }
    return true;
  });
});

// ── Selection ─────────────────────────────────────────────────────────────────

function isOnRoster(player: PoolPlayer): boolean {
  const id = poolCardId(player);
  if (player.kind === "twoWay")
    return (
      rosterStore.rosterPitcherIdSet.has(id) &&
      rosterStore.rosterHitterIdSet.has(id)
    );
  return player.kind === "pitcher"
    ? rosterStore.rosterPitcherIdSet.has(id)
    : rosterStore.rosterHitterIdSet.has(id);
}

function isFull(player: PoolPlayer): boolean {
  if (player.kind === "twoWay")
    return (
      rosterStore.rosterPitcherIdSet.size >= rosterStore.era.totalPitchers ||
      rosterStore.rosterHitterIdSet.size >= rosterStore.era.totalHitters
    );
  return player.kind === "pitcher"
    ? rosterStore.rosterPitcherIdSet.size >= rosterStore.era.totalPitchers
    : rosterStore.rosterHitterIdSet.size >= rosterStore.era.totalHitters;
}

function handleRowClick(player: PoolPlayer) {
  const id = poolCardId(player);
  if (isOnRoster(player)) {
    rosterStore.removeFromRoster(id);
  } else if (!isFull(player)) {
    rosterStore.addToRoster(
      id,
      player.kind === "twoWay"
        ? "twoWay"
        : player.kind === "pitcher"
          ? "pitcher"
          : "hitter",
    );
  }
}

// ── Display helpers ───────────────────────────────────────────────────────────

function eligiblePositions(player: PoolPlayer): string {
  if (player.kind === "pitcher")
    return pitcherRoleLabel(player.card.pitcherRoleCode);
  if (player.kind === "twoWay") {
    const role = pitcherRoleLabel(player.card.pitcherRoleCode);
    const positions = FIELDING_POSITIONS.filter(
      (pos) => getPosRating(player.hitterCard.defense, pos) > 0,
    );
    const hitPart = positions.length > 0 ? positions.join(" ") : "DH";
    return `${role} / ${hitPart}`;
  }
  const h = player.card as HitterCard;
  const positions = FIELDING_POSITIONS.filter(
    (pos) => getPosRating(h.defense, pos) > 0,
  );
  return positions.length > 0 ? positions.join(" ") : "--";
}
</script>

<template>
  <div class="roster-view">
    <!-- Filter bar -->
    <div class="filter-bar">
      <input
        v-model="searchText"
        class="filter-search"
        type="text"
        placeholder="Search name..."
      />
      <div class="filter-group">
        <span class="filter-label">OVR</span>
        <input
          v-model="ovrMin"
          class="filter-num"
          type="number"
          min="0"
          max="100"
          placeholder="min"
        />
        <span class="filter-dash">-</span>
        <input
          v-model="ovrMax"
          class="filter-num"
          type="number"
          min="0"
          max="100"
          placeholder="max"
        />
      </div>
      <div class="filter-group">
        <span class="filter-label">POS</span>
        <select v-model="posFilter" class="filter-select">
          <option value="all">All</option>
          <option value="P">P</option>
          <option v-for="pos in FIELDING_POSITIONS" :key="pos" :value="pos">
            {{ pos }}
          </option>
          <option value="DH">DH</option>
        </select>
      </div>
      <span class="filter-count">{{ filteredPlayers.length }} shown</span>
    </div>

    <!-- Table -->
    <div class="table-panel">
      <table class="card-table">
        <thead>
          <tr>
            <th class="th-name">Name</th>
            <th class="th-num">OVR</th>
            <th class="th-pos">Eligible</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="player in filteredPlayers"
            :key="`${player.kind}-${player.card.cardId}`"
            class="row-clickable"
            :class="{
              'row-on-roster': isOnRoster(player),
              'row-full': isFull(player) && !isOnRoster(player),
            }"
            @click="handleRowClick(player)"
          >
            <td class="td-name">
              <span class="player-name">{{
                player.card.cardTitle || player.card.name
              }}</span>
            </td>
            <td class="td-num">{{ player.card.overall }}</td>
            <td class="td-pos">{{ eligiblePositions(player) }}</td>
          </tr>
          <tr v-if="filteredPlayers.length === 0">
            <td colspan="3" class="empty-row">
              {{
                !cardStore.hasCards
                  ? "Upload pt_card_list.csv to load cards"
                  : "No players match filters"
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.roster-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Filter bar ── */
.filter-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 12px;
  height: 40px;
  flex-shrink: 0;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.filter-search {
  width: 180px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #cbd5e1;
  font-size: 0.75rem;
  padding: 3px 8px;
  outline: none;
}

.filter-search::placeholder {
  color: #475569;
}

.filter-search:focus {
  border-color: rgba(255, 255, 255, 0.2);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.filter-label {
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #475569;
}

.filter-num {
  width: 48px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #cbd5e1;
  font-size: 0.75rem;
  padding: 3px 6px;
  outline: none;
  text-align: center;
}

.filter-num::placeholder {
  color: #334155;
}

.filter-num:focus {
  border-color: rgba(255, 255, 255, 0.2);
}

/* hide spinners */
.filter-num::-webkit-outer-spin-button,
.filter-num::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}
.filter-num[type="number"] {
  -moz-appearance: textfield;
}

.filter-dash {
  font-size: 0.7rem;
  color: #334155;
}

.filter-select {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #cbd5e1;
  font-size: 0.75rem;
  padding: 3px 6px;
  outline: none;
}

.filter-count {
  margin-left: auto;
  font-size: 0.63rem;
  color: #334155;
}

/* ── Table ── */
.table-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.card-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
}

.card-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: #0f172a;
  text-align: left;
  padding: 6px 8px;
  font-size: 0.61rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #475569;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}

.th-num {
  width: 40px;
  text-align: right;
}
.th-pos {
  min-width: 120px;
}

.card-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
}

.row-clickable {
  cursor: pointer;
}

.row-clickable:hover {
  background: rgba(255, 255, 255, 0.04);
}

.row-on-roster {
  background: rgba(34, 197, 94, 0.08);
}

.row-on-roster:hover {
  background: rgba(34, 197, 94, 0.13);
}

.row-on-roster .player-name {
  color: #4ade80;
}

.row-full {
  cursor: default;
  opacity: 0.25;
}

.card-table td {
  padding: 4px 8px;
  vertical-align: middle;
}

.td-name {
  min-width: 0;
  max-width: 220px;
}

.player-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #e2e8f0;
}

.card-title {
  display: block;
  font-size: 0.63rem;
  color: #475569;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.td-hand {
  font-weight: 700;
  font-size: 0.72rem;
  text-align: center;
}

.hand-R {
  color: #60a5fa;
}
.hand-L {
  color: #f87171;
}
.hand-S {
  color: #a78bfa;
}

.td-num {
  text-align: right;
  font-size: 0.75rem;
  color: #94a3b8;
}

.td-pos {
  font-size: 0.67rem;
  color: #64748b;
  white-space: nowrap;
}

.roster-badge {
  display: inline-block;
  font-size: 0.6rem;
  font-weight: 600;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 3px;
  padding: 1px 4px;
  white-space: nowrap;
}

.tier-badge {
  display: inline-block;
  padding: 1px 5px;
  border-radius: 3px;
  font-size: 0.6rem;
  font-weight: 600;
  white-space: nowrap;
}

.tier-Iron {
  background: #1e293b;
  color: #64748b;
}
.tier-Bronze {
  background: #292524;
  color: #d97706;
}
.tier-Silver {
  background: #1e293b;
  color: #94a3b8;
}
.tier-Gold {
  background: #292524;
  color: #eab308;
}
.tier-Diamond {
  background: #0f2744;
  color: #60a5fa;
}
.tier-Perfect {
  background: #1e1244;
  color: #a78bfa;
}

.td-price {
  text-align: right;
  font-size: 0.7rem;
  color: #64748b;
  white-space: nowrap;
}

.empty-row {
  padding: 24px 16px;
  color: #334155;
  font-style: italic;
  font-size: 0.78rem;
}
</style>
