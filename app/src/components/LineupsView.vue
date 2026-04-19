<script setup lang="ts">
import { ref, computed } from "vue";
import { useCardStore } from "@/stores/useCardStore";
import { useRosterStore } from "@/stores/useRosterStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import {
  ALL_HITTER_POSITIONS,
  UTILITY_STARTS_LABELS,
  getPosRating,
} from "@/models/types";
import type {
  HitterCard,
  HitterPosition,
  FieldingPosition,
  UtilityStarts,
} from "@/models/types";

const cardStore = useCardStore();
const rosterStore = useRosterStore();
const settingsStore = useSettingsStore();

const activeSide = ref<"vr" | "vl">("vr");

function switchSide(side: "vr" | "vl") {
  if (activeSide.value !== side) {
    activeSide.value = side;
    rosterStore.setActiveSlot(null);
  }
}

// ── Hitter table ─────────────────────────────────────────────────────────────

const positionFilter = computed<FieldingPosition | null>(() => {
  const slot = rosterStore.activeSlot;
  if (!slot || slot.kind !== "depth") return null;
  if (slot.position === "DH") return null;
  return slot.position as FieldingPosition;
});

const visibleHitters = computed(() => {
  let list = cardStore.hitters;
  if (settingsStore.ownedOnly) list = list.filter((h) => h.owned);
  const posFilter = positionFilter.value;
  if (posFilter) {
    list = list.filter((h) => getPosRating(h.defense, posFilter) > 0);
  }
  const slot = rosterStore.activeSlot;
  return list.slice().sort((a, b) => {
    if (slot?.kind === "lineup" && slot.side === "vr")
      return b.vRScore - a.vRScore;
    if (slot?.kind === "lineup" && slot.side === "vl")
      return b.vLScore - a.vLScore;
    return b.overall - a.overall;
  });
});

const hitterAssignments = computed(() => {
  const map = new Map<number, string>();
  const lineup = rosterStore.getLineup(activeSide.value);
  lineup.slots.forEach((s: { cardId: number | null }, i: number) => {
    if (s.cardId != null) map.set(s.cardId, `#${i + 1}`);
  });
  for (const pos of ALL_HITTER_POSITIONS) {
    const d = lineup.depth[pos];
    if (d.depthStarterCardId != null) map.set(d.depthStarterCardId, `${pos}`);
    if (d.utility1CardId != null) map.set(d.utility1CardId, `U1 ${pos}`);
    if (d.utility2CardId != null) map.set(d.utility2CardId, `U2 ${pos}`);
    if (d.defSubCardId != null) map.set(d.defSubCardId, `DS ${pos}`);
  }
  lineup.pinchHitters.forEach((id: number | null, i: number) => {
    if (id != null) map.set(id, `PH${i + 1}`);
  });
  lineup.pinchRunners.forEach((id: number | null, i: number) => {
    if (id != null) map.set(id, `PR${i + 1}`);
  });
  return map;
});

const canAssignHitter = computed(() => rosterStore.activeSlotType === "hitter");

function handleRowClick(hitter: HitterCard) {
  const slot = rosterStore.activeSlot;
  if (!slot || rosterStore.activeSlotType !== "hitter") return;
  rosterStore.assignToActiveSlot(hitter.cardId);
  // auto-advance
  const side = activeSide.value;
  if (slot.kind === "lineup") {
    const ln = rosterStore.getLineup(side);
    for (let i = slot.order + 1; i <= 9; i++) {
      if (ln.slots[i - 1].cardId == null) {
        rosterStore.setActiveSlot({ kind: "lineup", side, order: i });
        return;
      }
    }
  } else if (slot.kind === "pinchHitter") {
    const ln = rosterStore.getLineup(side);
    for (let i = slot.order + 1; i <= 4; i++) {
      if (ln.pinchHitters[i - 1] == null) {
        rosterStore.setActiveSlot({ kind: "pinchHitter", side, order: i });
        return;
      }
    }
  } else if (slot.kind === "pinchRunner") {
    const ln = rosterStore.getLineup(side);
    for (let i = slot.order + 1; i <= 4; i++) {
      if (ln.pinchRunners[i - 1] == null) {
        rosterStore.setActiveSlot({ kind: "pinchRunner", side, order: i });
        return;
      }
    }
  }
  rosterStore.setActiveSlot(null);
}

// ── Lineup panel ─────────────────────────────────────────────────────────────

const lineupSlots = computed(() =>
  Array.from({ length: 9 }, (_, i) => {
    const order = i + 1;
    const s = rosterStore.getLineup(activeSide.value).slots[i];
    return {
      order,
      card: s.cardId ? cardStore.hitterById.get(s.cardId) : undefined,
      position: s.position,
      active:
        rosterStore.activeSlot?.kind === "lineup" &&
        rosterStore.activeSlot.side === activeSide.value &&
        rosterStore.activeSlot.order === order,
    };
  }),
);

// ── Depth chart ───────────────────────────────────────────────────────────────

function depthCard(
  pos: HitterPosition,
  slot: "depth" | "utility1" | "utility2" | "defSub",
) {
  const d = rosterStore.getLineup(activeSide.value).depth[pos];
  const id =
    slot === "depth"
      ? d.depthStarterCardId
      : slot === "utility1"
        ? d.utility1CardId
        : slot === "utility2"
          ? d.utility2CardId
          : d.defSubCardId;
  return id ? cardStore.hitterById.get(id) : undefined;
}

function depthSlotActive(
  pos: HitterPosition,
  slot: "depth" | "utility1" | "utility2" | "defSub",
) {
  const a = rosterStore.activeSlot;
  return (
    a?.kind === "depth" &&
    a.side === activeSide.value &&
    a.position === pos &&
    a.slot === slot
  );
}

function utilityStarts(
  pos: HitterPosition,
  slot: "utility1" | "utility2",
): UtilityStarts {
  const d = rosterStore.getLineup(activeSide.value).depth[pos];
  return slot === "utility1" ? d.utility1Starts : d.utility2Starts;
}

// ── Bench ─────────────────────────────────────────────────────────────────────

function benchCard(type: "pinchHitter" | "pinchRunner", order: number) {
  const ln = rosterStore.getLineup(activeSide.value);
  const id =
    type === "pinchHitter"
      ? ln.pinchHitters[order - 1]
      : ln.pinchRunners[order - 1];
  return id ? cardStore.hitterById.get(id) : undefined;
}

function benchSlotActive(type: "pinchHitter" | "pinchRunner", order: number) {
  const a = rosterStore.activeSlot;
  return a?.kind === type && a.side === activeSide.value && a.order === order;
}

// ── Formatting ────────────────────────────────────────────────────────────────

function formatPrice(price: number): string {
  if (price === 0) return "--";
  if (price >= 1000) return `${(price / 1000).toFixed(1)}k`;
  return String(price);
}

function formatScore(score: number): string {
  return score.toFixed(1);
}

function defRating(card: HitterCard, pos: FieldingPosition): string {
  const r = getPosRating(card.defense, pos);
  return r > 0 ? String(r) : "--";
}

const FIELDING_COLS: FieldingPosition[] = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
];
</script>

<template>
  <div class="lineups-view">
    <!-- Sub-tabs -->
    <div class="subtab-bar">
      <button
        class="subtab"
        :class="{ 'subtab-active': activeSide === 'vr' }"
        @click="switchSide('vr')"
      >
        VS RHP
      </button>
      <button
        class="subtab"
        :class="{ 'subtab-active': activeSide === 'vl' }"
        @click="switchSide('vl')"
      >
        VS LHP
      </button>
    </div>

    <!-- Top: hitter table -->
    <div class="table-panel">
      <table class="card-table">
        <thead>
          <tr>
            <th class="th-badge"></th>
            <th class="th-name">Name</th>
            <th class="th-hand">B</th>
            <th class="th-num">OVR</th>
            <th class="th-num">vR</th>
            <th class="th-num">vL</th>
            <th v-for="pos in FIELDING_COLS" :key="pos" class="th-def">
              {{ pos }}
            </th>
            <th class="th-tier">Tier</th>
            <th class="th-price">Price</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="h in visibleHitters"
            :key="h.cardId"
            :class="{
              'row-assigned': hitterAssignments.has(h.cardId),
              'row-clickable': canAssignHitter,
            }"
            @click="handleRowClick(h)"
          >
            <td class="td-badge">
              <span
                v-if="hitterAssignments.has(h.cardId)"
                class="assignment-badge"
              >
                {{ hitterAssignments.get(h.cardId) }}
              </span>
            </td>
            <td class="td-name">
              <span class="player-name">{{ h.name }}</span>
              <span v-if="h.cardTitle" class="card-title">{{
                h.cardTitle
              }}</span>
            </td>
            <td class="td-hand" :class="`hand-${h.bats}`">
              {{ h.bats ?? "--" }}
            </td>
            <td class="td-num">{{ h.overall }}</td>
            <td class="td-num td-score">{{ formatScore(h.vRScore) }}</td>
            <td class="td-num td-score">{{ formatScore(h.vLScore) }}</td>
            <td v-for="pos in FIELDING_COLS" :key="pos" class="td-def">
              {{ defRating(h, pos) }}
            </td>
            <td class="td-tier">
              <span class="tier-badge" :class="`tier-${h.tier}`">{{
                h.tier
              }}</span>
            </td>
            <td class="td-price">{{ formatPrice(h.sellOrderLow) }}</td>
          </tr>
          <tr v-if="visibleHitters.length === 0">
            <td :colspan="16" class="empty-row">
              {{
                cardStore.hasCards
                  ? "No hitters match filter"
                  : "Upload pt_card_list.csv to load cards"
              }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Bottom: config panels -->
    <div class="config-panel">
      <!-- Lineup order -->
      <div class="config-section lineup-section">
        <div class="section-header">
          <span class="section-title">Lineup</span>
        </div>
        <div class="slot-list">
          <div
            v-for="slot in lineupSlots"
            :key="slot.order"
            class="lineup-slot"
            :class="{ 'slot-active': slot.active, 'slot-filled': !!slot.card }"
            @click="
              rosterStore.setActiveSlot({
                kind: 'lineup',
                side: activeSide,
                order: slot.order,
              })
            "
          >
            <span class="slot-num">{{ slot.order }}</span>
            <template v-if="slot.card">
              <span class="slot-hand" :class="`hand-${slot.card.bats}`">
                {{ slot.card.bats ?? "--" }}
              </span>
              <span class="slot-name">{{ slot.card.name }}</span>
              <select
                class="pos-select"
                :value="slot.position ?? ''"
                @click.stop
                @change="
                  rosterStore.setLineupPosition(
                    activeSide,
                    slot.order,
                    (($event.target as HTMLSelectElement)
                      .value as HitterPosition) || null,
                  )
                "
              >
                <option value="">---</option>
                <option
                  v-for="pos in ALL_HITTER_POSITIONS"
                  :key="pos"
                  :value="pos"
                >
                  {{ pos }}
                </option>
              </select>
              <div class="slot-actions">
                <button
                  class="act-btn"
                  @click.stop="
                    rosterStore.moveLineupSlot(activeSide, slot.order, 'up')
                  "
                >
                  up
                </button>
                <button
                  class="act-btn"
                  @click.stop="
                    rosterStore.moveLineupSlot(activeSide, slot.order, 'down')
                  "
                >
                  dn
                </button>
                <button
                  class="act-btn act-clear"
                  @click.stop="
                    rosterStore.clearLineupSlot(activeSide, slot.order)
                  "
                >
                  x
                </button>
              </div>
            </template>
            <span v-else class="slot-empty">Click to assign</span>
          </div>
        </div>
      </div>

      <!-- Depth chart -->
      <div class="config-section depth-section">
        <div class="section-header">
          <span class="section-title">Depth Chart</span>
        </div>
        <div class="depth-scroll">
          <table class="depth-table">
            <thead>
              <tr>
                <th class="dth-pos">POS</th>
                <th class="dth-player">Depth Starter</th>
                <th class="dth-player">Utility 1</th>
                <th class="dth-starts">Starts</th>
                <th class="dth-player">Utility 2</th>
                <th class="dth-starts">Starts</th>
                <th class="dth-player">Def Sub</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="pos in ALL_HITTER_POSITIONS" :key="pos">
                <td class="dth-pos-label">{{ pos }}</td>

                <!-- Depth Starter -->
                <td>
                  <div
                    class="depth-slot"
                    :class="{ 'depth-active': depthSlotActive(pos, 'depth') }"
                    @click="
                      rosterStore.setActiveSlot({
                        kind: 'depth',
                        side: activeSide,
                        position: pos,
                        slot: 'depth',
                      })
                    "
                  >
                    <template v-if="depthCard(pos, 'depth')">
                      <span class="depth-name">{{
                        depthCard(pos, "depth")!.name
                      }}</span>
                      <button
                        class="act-btn act-clear"
                        @click.stop="
                          rosterStore.clearDepthSlot(activeSide, pos, 'depth')
                        "
                      >
                        x
                      </button>
                    </template>
                    <span v-else class="depth-empty">---</span>
                  </div>
                </td>

                <!-- Utility 1 -->
                <td>
                  <div
                    class="depth-slot"
                    :class="{
                      'depth-active': depthSlotActive(pos, 'utility1'),
                    }"
                    @click="
                      rosterStore.setActiveSlot({
                        kind: 'depth',
                        side: activeSide,
                        position: pos,
                        slot: 'utility1',
                      })
                    "
                  >
                    <template v-if="depthCard(pos, 'utility1')">
                      <span class="depth-name">{{
                        depthCard(pos, "utility1")!.name
                      }}</span>
                      <button
                        class="act-btn act-clear"
                        @click.stop="
                          rosterStore.clearDepthSlot(
                            activeSide,
                            pos,
                            'utility1',
                          )
                        "
                      >
                        x
                      </button>
                    </template>
                    <span v-else class="depth-empty">---</span>
                  </div>
                </td>
                <td>
                  <select
                    class="starts-select"
                    :value="utilityStarts(pos, 'utility1')"
                    @change="
                      rosterStore.setUtilityStarts(
                        activeSide,
                        pos,
                        'utility1',
                        ($event.target as HTMLSelectElement)
                          .value as UtilityStarts,
                      )
                    "
                  >
                    <option
                      v-for="(label, key) in UTILITY_STARTS_LABELS"
                      :key="key"
                      :value="key"
                    >
                      {{ label }}
                    </option>
                  </select>
                </td>

                <!-- Utility 2 -->
                <td>
                  <div
                    class="depth-slot"
                    :class="{
                      'depth-active': depthSlotActive(pos, 'utility2'),
                    }"
                    @click="
                      rosterStore.setActiveSlot({
                        kind: 'depth',
                        side: activeSide,
                        position: pos,
                        slot: 'utility2',
                      })
                    "
                  >
                    <template v-if="depthCard(pos, 'utility2')">
                      <span class="depth-name">{{
                        depthCard(pos, "utility2")!.name
                      }}</span>
                      <button
                        class="act-btn act-clear"
                        @click.stop="
                          rosterStore.clearDepthSlot(
                            activeSide,
                            pos,
                            'utility2',
                          )
                        "
                      >
                        x
                      </button>
                    </template>
                    <span v-else class="depth-empty">---</span>
                  </div>
                </td>
                <td>
                  <select
                    class="starts-select"
                    :value="utilityStarts(pos, 'utility2')"
                    @change="
                      rosterStore.setUtilityStarts(
                        activeSide,
                        pos,
                        'utility2',
                        ($event.target as HTMLSelectElement)
                          .value as UtilityStarts,
                      )
                    "
                  >
                    <option
                      v-for="(label, key) in UTILITY_STARTS_LABELS"
                      :key="key"
                      :value="key"
                    >
                      {{ label }}
                    </option>
                  </select>
                </td>

                <!-- Defense Sub -->
                <td>
                  <div
                    class="depth-slot"
                    :class="{ 'depth-active': depthSlotActive(pos, 'defSub') }"
                    @click="
                      rosterStore.setActiveSlot({
                        kind: 'depth',
                        side: activeSide,
                        position: pos,
                        slot: 'defSub',
                      })
                    "
                  >
                    <template v-if="depthCard(pos, 'defSub')">
                      <span class="depth-name">{{
                        depthCard(pos, "defSub")!.name
                      }}</span>
                      <button
                        class="act-btn act-clear"
                        @click.stop="
                          rosterStore.clearDepthSlot(activeSide, pos, 'defSub')
                        "
                      >
                        x
                      </button>
                    </template>
                    <span v-else class="depth-empty">---</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Bench -->
      <div class="config-section bench-section">
        <div class="section-header">
          <span class="section-title">Bench</span>
        </div>
        <div class="bench-body">
          <!-- Pinch Hitters -->
          <div class="bench-group">
            <div class="bench-group-label">Pinch Hitters</div>
            <div
              v-for="order in [1, 2, 3, 4]"
              :key="`ph-${order}`"
              class="bench-slot"
              :class="{
                'slot-active': benchSlotActive('pinchHitter', order),
                'slot-filled': !!benchCard('pinchHitter', order),
              }"
              @click="
                rosterStore.setActiveSlot({
                  kind: 'pinchHitter',
                  side: activeSide,
                  order,
                })
              "
            >
              <span class="slot-num">{{ order }}</span>
              <template v-if="benchCard('pinchHitter', order)">
                <span class="slot-name">{{
                  benchCard("pinchHitter", order)!.name
                }}</span>
                <button
                  class="act-btn act-clear"
                  @click.stop="
                    rosterStore.clearBenchSlot(activeSide, 'pinchHitter', order)
                  "
                >
                  x
                </button>
              </template>
              <span v-else class="slot-empty">---</span>
            </div>
          </div>

          <!-- Pinch Runners -->
          <div class="bench-group">
            <div class="bench-group-label">Pinch Runners</div>
            <div
              v-for="order in [1, 2, 3, 4]"
              :key="`pr-${order}`"
              class="bench-slot"
              :class="{
                'slot-active': benchSlotActive('pinchRunner', order),
                'slot-filled': !!benchCard('pinchRunner', order),
              }"
              @click="
                rosterStore.setActiveSlot({
                  kind: 'pinchRunner',
                  side: activeSide,
                  order,
                })
              "
            >
              <span class="slot-num">{{ order }}</span>
              <template v-if="benchCard('pinchRunner', order)">
                <span class="slot-name">{{
                  benchCard("pinchRunner", order)!.name
                }}</span>
                <button
                  class="act-btn act-clear"
                  @click.stop="
                    rosterStore.clearBenchSlot(activeSide, 'pinchRunner', order)
                  "
                >
                  x
                </button>
              </template>
              <span v-else class="slot-empty">---</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Layout ── */
.lineups-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.subtab-bar {
  display: flex;
  gap: 2px;
  padding: 0 8px;
  height: 36px;
  flex-shrink: 0;
  align-items: flex-end;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.subtab {
  padding: 0 14px;
  height: 34px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #64748b;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.subtab:hover {
  color: #94a3b8;
}

.subtab-active {
  color: #f1f5f9;
  border-bottom-color: #22c55e;
}

.table-panel {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.config-panel {
  height: 300px;
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
  padding: 6px 6px;
  font-size: 0.61rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #475569;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
}

.th-badge {
  width: 46px;
}
.th-hand {
  width: 28px;
}
.th-num {
  width: 40px;
  text-align: right;
}
.th-def {
  width: 32px;
  text-align: right;
}
.th-tier {
  width: 68px;
}
.th-price {
  width: 52px;
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
  padding: 4px 6px;
  vertical-align: middle;
}

.td-badge {
  padding-right: 4px;
}

.td-name {
  min-width: 0;
  max-width: 200px;
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
  font-size: 0.73rem;
  color: #94a3b8;
}

.td-score {
  color: #64748b;
  font-size: 0.7rem;
}

.td-def {
  text-align: right;
  font-size: 0.67rem;
  color: #475569;
}

.assignment-badge {
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

/* ── Config sections ── */
.config-section {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
}

.config-section:last-child {
  border-right: none;
}

.lineup-section {
  width: 240px;
  flex-shrink: 0;
}

.depth-section {
  flex: 1;
  min-width: 0;
}

.bench-section {
  width: 180px;
  flex-shrink: 0;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.section-title {
  font-size: 0.63rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
}

.slot-list {
  flex: 1;
  overflow-y: auto;
}

/* ── Lineup slots ── */
.lineup-slot {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 8px;
  min-height: 30px;
  border-left: 3px solid transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition:
    background 0.1s,
    border-color 0.1s;
}

.lineup-slot:hover {
  background: rgba(255, 255, 255, 0.03);
}

.lineup-slot.slot-active {
  border-left-color: #22c55e;
  background: rgba(34, 197, 94, 0.05);
}

.slot-num {
  font-size: 0.66rem;
  color: #475569;
  width: 12px;
  text-align: right;
  flex-shrink: 0;
}

.slot-hand {
  font-size: 0.68rem;
  font-weight: 700;
  width: 12px;
  text-align: center;
  flex-shrink: 0;
}

.slot-name {
  flex: 1;
  font-size: 0.73rem;
  color: #e2e8f0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-empty {
  flex: 1;
  font-size: 0.67rem;
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
  font-size: 0.58rem;
  padding: 1px 3px;
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

.pos-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  color: #94a3b8;
  font-size: 0.62rem;
  padding: 1px 2px;
  width: 44px;
  flex-shrink: 0;
}

/* ── Depth chart ── */
.depth-scroll {
  flex: 1;
  overflow: auto;
}

.depth-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.73rem;
}

.depth-table thead th {
  position: sticky;
  top: 0;
  background: #0f172a;
  text-align: left;
  padding: 5px 6px;
  font-size: 0.59rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #475569;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  white-space: nowrap;
  z-index: 1;
}

.dth-pos {
  width: 36px;
}
.dth-player {
  min-width: 110px;
}
.dth-starts {
  width: 110px;
}

.depth-table tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.depth-table td {
  padding: 3px 6px;
  vertical-align: middle;
}

.dth-pos-label {
  font-size: 0.65rem;
  font-weight: 700;
  color: #64748b;
  white-space: nowrap;
}

.depth-slot {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 5px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 3px;
  cursor: pointer;
  min-height: 24px;
  transition:
    background 0.1s,
    border-color 0.1s;
}

.depth-slot:hover {
  background: rgba(255, 255, 255, 0.04);
}

.depth-slot.depth-active {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.06);
}

.depth-name {
  flex: 1;
  font-size: 0.7rem;
  color: #cbd5e1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.depth-empty {
  flex: 1;
  font-size: 0.67rem;
  color: #334155;
}

.starts-select {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 3px;
  color: #64748b;
  font-size: 0.62rem;
  padding: 2px 3px;
  width: 100%;
}

/* ── Bench ── */
.bench-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 0;
}

.bench-group {
  margin-bottom: 4px;
}

.bench-group-label {
  font-size: 0.59rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #475569;
  padding: 3px 8px 2px;
}

.bench-slot {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  min-height: 26px;
  border-left: 3px solid transparent;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition:
    background 0.1s,
    border-color 0.1s;
}

.bench-slot:hover {
  background: rgba(255, 255, 255, 0.03);
}

.bench-slot.slot-active {
  border-left-color: #22c55e;
  background: rgba(34, 197, 94, 0.05);
}
</style>
