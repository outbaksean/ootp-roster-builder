<script setup lang="ts">
import { computed } from "vue";
import { useCardStore } from "@/stores/useCardStore";
import { useRosterStore } from "@/stores/useRosterStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { BULLPEN_ROLE_LABELS } from "@/models/types";
import type { BullpenRole, PitcherCard } from "@/models/types";

const cardStore = useCardStore();
const rosterStore = useRosterStore();
const settingsStore = useSettingsStore();

// ── Pitcher table ────────────────────────────────────────────────────────────

const visiblePitchers = computed(() => {
  let list = cardStore.pitchers;
  if (settingsStore.ownedOnly) list = list.filter((p) => p.owned);
  return list.slice().sort((a, b) => b.overall - a.overall);
});

const pitcherAssignment = computed(() => {
  const map = new Map<number, string>();
  for (const p of rosterStore.starters) map.set(p.cardId, `SP ${p.order}`);
  for (const p of rosterStore.relievers) map.set(p.cardId, `RP ${p.order}`);
  return map;
});

const canAssign = computed(
  () =>
    rosterStore.activeSlot?.kind === "sp" ||
    rosterStore.activeSlot?.kind === "rp",
);

function handleRowClick(pitcher: PitcherCard) {
  const slot = rosterStore.activeSlot;
  if (!slot || (slot.kind !== "sp" && slot.kind !== "rp")) return;
  rosterStore.assignToActiveSlot(pitcher.cardId);
  // auto-advance
  if (slot.kind === "sp") {
    const max = rosterStore.era.spCount;
    for (let i = slot.order + 1; i <= max; i++) {
      if (!rosterStore.starters.some((s) => s.order === i)) {
        rosterStore.setActiveSlot({ kind: "sp", order: i });
        return;
      }
    }
  } else {
    const max = rosterStore.era.totalPitchers - rosterStore.era.spCount;
    for (let i = slot.order + 1; i <= max; i++) {
      if (!rosterStore.relievers.some((r) => r.order === i)) {
        rosterStore.setActiveSlot({ kind: "rp", order: i });
        return;
      }
    }
  }
  rosterStore.setActiveSlot(null);
}

// ── Slot helpers ─────────────────────────────────────────────────────────────

const spCount = computed(() => rosterStore.era.spCount);
const rpCount = computed(
  () => rosterStore.era.totalPitchers - rosterStore.era.spCount,
);

const rotationSlots = computed(() =>
  Array.from({ length: spCount.value }, (_, i) => {
    const order = i + 1;
    const p = rosterStore.starters.find((s) => s.order === order);
    return {
      order,
      card: p ? cardStore.pitcherById.get(p.cardId) : undefined,
      active:
        rosterStore.activeSlot?.kind === "sp" &&
        rosterStore.activeSlot.order === order,
    };
  }),
);

const bullpenSlots = computed(() =>
  Array.from({ length: rpCount.value }, (_, i) => {
    const order = i + 1;
    const p = rosterStore.relievers.find((r) => r.order === order);
    return {
      order,
      card: p ? cardStore.pitcherById.get(p.cardId) : undefined,
      bullpenRole: p?.bullpenRole ?? ("MiddleRelief" as BullpenRole),
      active:
        rosterStore.activeSlot?.kind === "rp" &&
        rosterStore.activeSlot.order === order,
    };
  }),
);

// ── Formatting ───────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price === 0) return "--";
  if (price >= 1000) return `${(price / 1000).toFixed(1)}k`;
  return String(price);
}
</script>

<template>
  <div class="pitching-view">
    <!-- Top: pitcher table -->
    <div class="table-panel">
      <table class="card-table">
        <thead>
          <tr>
            <th class="th-badge"></th>
            <th class="th-name">Name</th>
            <th class="th-hand">T</th>
            <th class="th-num">OVR</th>
            <th class="th-num">Stam</th>
            <th class="th-tier">Tier</th>
            <th class="th-price">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="p in visiblePitchers"
            :key="p.cardId"
            :class="{
              'row-assigned': pitcherAssignment.has(p.cardId),
              'row-clickable': canAssign,
            }"
            @click="handleRowClick(p)"
          >
            <td class="td-badge">
              <span
                v-if="pitcherAssignment.has(p.cardId)"
                class="assignment-badge"
              >
                {{ pitcherAssignment.get(p.cardId) }}
              </span>
            </td>
            <td class="td-name">
              <span class="player-name">{{ p.name }}</span>
              <span v-if="p.cardTitle" class="card-title">{{
                p.cardTitle
              }}</span>
            </td>
            <td class="td-hand" :class="`hand-${p.throws}`">
              {{ p.throws ?? "--" }}
            </td>
            <td class="td-num">{{ p.overall }}</td>
            <td class="td-num td-muted">{{ p.stamina }}</td>
            <td class="td-tier">
              <span class="tier-badge" :class="`tier-${p.tier}`">{{
                p.tier
              }}</span>
            </td>
            <td class="td-price">{{ formatPrice(p.sellOrderLow) }}</td>
          </tr>
          <tr v-if="visiblePitchers.length === 0">
            <td colspan="7" class="empty-row">
              {{
                cardStore.hasCards
                  ? "No pitchers match filter"
                  : "Upload pt_card_list.csv to load cards"
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Bottom: SP + RP config panels -->
    <div class="config-panel">
      <!-- Starting Rotation -->
      <div class="config-section rotation-section">
        <div class="section-header">
          <span class="section-title">Starting Rotation</span>
          <span class="section-count"
            >{{ rosterStore.starters.length }}/{{ spCount }}</span
          >
        </div>
        <div class="slot-list">
          <div
            v-for="slot in rotationSlots"
            :key="slot.order"
            class="pitcher-slot"
            :class="{ 'slot-active': slot.active, 'slot-filled': !!slot.card }"
            @click="
              rosterStore.setActiveSlot({ kind: 'sp', order: slot.order })
            "
          >
            <span class="slot-num">{{ slot.order }}</span>
            <template v-if="slot.card">
              <span class="slot-hand" :class="`hand-${slot.card.throws}`">
                {{ slot.card.throws ?? "--" }}
              </span>
              <span class="slot-name">{{ slot.card.name }}</span>
              <span class="slot-stat">{{ slot.card.overall }}</span>
              <span class="slot-stat slot-muted">{{ slot.card.stamina }}</span>
              <div class="slot-actions">
                <button
                  class="act-btn"
                  @click.stop="rosterStore.movePitcher('SP', slot.order, 'up')"
                >
                  up
                </button>
                <button
                  class="act-btn"
                  @click.stop="
                    rosterStore.movePitcher('SP', slot.order, 'down')
                  "
                >
                  dn
                </button>
                <button
                  class="act-btn act-clear"
                  @click.stop="rosterStore.clearPitcherSlot('SP', slot.order)"
                >
                  x
                </button>
              </div>
            </template>
            <span v-else class="slot-empty">Click to assign</span>
          </div>
        </div>
      </div>

      <!-- Bullpen -->
      <div class="config-section bullpen-section">
        <div class="section-header">
          <span class="section-title">Bullpen</span>
          <span class="section-count"
            >{{ rosterStore.relievers.length }}/{{ rpCount }}</span
          >
        </div>
        <div class="slot-list">
          <div
            v-for="slot in bullpenSlots"
            :key="slot.order"
            class="pitcher-slot"
            :class="{ 'slot-active': slot.active, 'slot-filled': !!slot.card }"
            @click="
              rosterStore.setActiveSlot({ kind: 'rp', order: slot.order })
            "
          >
            <span class="slot-num">{{ slot.order }}</span>
            <template v-if="slot.card">
              <span class="slot-hand" :class="`hand-${slot.card.throws}`">
                {{ slot.card.throws ?? "--" }}
              </span>
              <span class="slot-name">{{ slot.card.name }}</span>
              <span class="slot-stat">{{ slot.card.overall }}</span>
              <select
                class="role-select"
                :value="slot.bullpenRole"
                @click.stop
                @change="
                  rosterStore.setBullpenRole(
                    slot.card!.cardId,
                    ($event.target as HTMLSelectElement).value as BullpenRole,
                  )
                "
              >
                <option
                  v-for="(label, key) in BULLPEN_ROLE_LABELS"
                  :key="key"
                  :value="key"
                >
                  {{ label }}
                </option>
              </select>
              <div class="slot-actions">
                <button
                  class="act-btn"
                  @click.stop="rosterStore.movePitcher('RP', slot.order, 'up')"
                >
                  up
                </button>
                <button
                  class="act-btn"
                  @click.stop="
                    rosterStore.movePitcher('RP', slot.order, 'down')
                  "
                >
                  dn
                </button>
                <button
                  class="act-btn act-clear"
                  @click.stop="rosterStore.clearPitcherSlot('RP', slot.order)"
                >
                  x
                </button>
              </div>
            </template>
            <span v-else class="slot-empty">Click to assign</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.pitching-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.table-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.config-panel {
  height: 280px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  overflow: hidden;
}

/* ── Card table ── */
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
  font-size: 0.63rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #475569;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}

.th-badge {
  width: 52px;
}
.th-hand {
  width: 32px;
}
.th-num {
  width: 44px;
  text-align: right;
}
.th-tier {
  width: 72px;
}
.th-price {
  width: 56px;
  text-align: right;
}

.card-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  cursor: default;
}

.card-table tbody tr.row-clickable {
  cursor: pointer;
}

.card-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.02);
}

.card-table tbody tr.row-clickable:hover {
  background: rgba(255, 255, 255, 0.05);
}

.card-table tbody tr.row-assigned {
  opacity: 0.4;
}

.card-table td {
  padding: 4px 8px;
  vertical-align: middle;
}

.td-badge {
  padding-right: 4px;
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
  font-size: 0.65rem;
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

.td-muted {
  color: #475569;
}

.assignment-badge {
  display: inline-block;
  font-size: 0.62rem;
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
  font-size: 0.62rem;
  font-weight: 600;
  letter-spacing: 0.03em;
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
  font-size: 0.72rem;
  color: #64748b;
  white-space: nowrap;
}

.empty-row {
  padding: 24px 16px;
  color: #334155;
  font-style: italic;
  font-size: 0.78rem;
}

/* ── Config panel sections ── */
.config-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.rotation-section {
  width: 280px;
  flex-shrink: 0;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.bullpen-section {
  flex: 1;
  min-width: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.section-title {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
}

.section-count {
  font-size: 0.65rem;
  color: #475569;
}

.slot-list {
  flex: 1;
  overflow-y: auto;
}

/* ── Pitcher slots ── */
.pitcher-slot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  min-height: 34px;
  border-left: 3px solid transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition:
    background 0.1s,
    border-color 0.1s;
}

.pitcher-slot:hover {
  background: rgba(255, 255, 255, 0.03);
}

.pitcher-slot.slot-active {
  border-left-color: #22c55e;
  background: rgba(34, 197, 94, 0.05);
}

.slot-num {
  font-size: 0.68rem;
  color: #475569;
  width: 14px;
  text-align: right;
  flex-shrink: 0;
}

.slot-hand {
  font-size: 0.7rem;
  font-weight: 700;
  width: 14px;
  text-align: center;
  flex-shrink: 0;
}

.slot-name {
  flex: 1;
  font-size: 0.76rem;
  color: #e2e8f0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-stat {
  font-size: 0.7rem;
  color: #94a3b8;
  flex-shrink: 0;
  width: 26px;
  text-align: right;
}

.slot-muted {
  color: #475569;
}

.slot-empty {
  flex: 1;
  font-size: 0.7rem;
  color: #334155;
  font-style: italic;
}

.slot-actions {
  display: flex;
  gap: 2px;
  flex-shrink: 0;
}

.act-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  color: #64748b;
  font-size: 0.6rem;
  padding: 1px 4px;
  cursor: pointer;
  line-height: 1.3;
  transition:
    background 0.1s,
    color 0.1s;
}

.act-btn:hover {
  background: rgba(255, 255, 255, 0.07);
  color: #94a3b8;
}

.act-clear:hover {
  color: #f87171;
}

.role-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: #94a3b8;
  font-size: 0.65rem;
  padding: 1px 4px;
  width: 110px;
  flex-shrink: 0;
}
</style>
