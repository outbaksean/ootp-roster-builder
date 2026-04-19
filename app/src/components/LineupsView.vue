<script setup lang="ts">
import { ref, computed } from "vue";
import { useCardStore } from "@/stores/useCardStore";
import { useRosterStore } from "@/stores/useRosterStore";
import {
  ALL_HITTER_POSITIONS,
  FIELDING_POSITIONS,
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

const activeSide = ref<"vr" | "vl">("vr");

function switchSide(side: "vr" | "vl") {
  if (side !== activeSide.value) {
    rosterStore.setActiveSlot(null);
    activeSide.value = side;
  }
}

// ── Hitter roster panel ───────────────────────────────────────────────────────

const positionFilter = computed<FieldingPosition | null>(() => {
  const slot = rosterStore.activeSlot;
  if (!slot || slot.kind !== "depth") return null;
  if (slot.position === "DH") return null;
  return slot.position as FieldingPosition;
});

const rosterHitters = computed(() => {
  let list = rosterStore.roster.rosterHitterIds
    .map((id) => (id !== null ? (cardStore.hitterById.get(id) ?? null) : null))
    .filter((h): h is HitterCard => h !== null);

  const posFilter = positionFilter.value;
  if (posFilter) {
    list = list.filter((h) => getPosRating(h.defense, posFilter) > 0);
  }

  return list.sort((a, b) => b.overall - a.overall);
});

const hitterAssignments = computed(() => {
  const map = new Map<number, string>();
  const lineup = rosterStore.getLineup(activeSide.value);
  lineup.battingOrder.forEach((pos, i) => {
    if (pos != null) {
      const cardId = lineup.depth[pos].depthStarterCardId;
      if (cardId != null) map.set(cardId, `#${i + 1} ${pos}`);
    }
  });
  for (const pos of ALL_HITTER_POSITIONS) {
    const d = lineup.depth[pos];
    if (d.depthStarterCardId != null && !map.has(d.depthStarterCardId))
      map.set(d.depthStarterCardId, pos);
    if (d.utility1CardId != null && !map.has(d.utility1CardId))
      map.set(d.utility1CardId, `U1 ${pos}`);
    if (d.utility2CardId != null && !map.has(d.utility2CardId))
      map.set(d.utility2CardId, `U2 ${pos}`);
    if (d.defSubCardId != null && !map.has(d.defSubCardId))
      map.set(d.defSubCardId, `DS ${pos}`);
  }
  lineup.pinchHitters.forEach((id, i) => {
    if (id != null && !map.has(id)) map.set(id, `PH${i + 1}`);
  });
  lineup.pinchRunners.forEach((id, i) => {
    if (id != null && !map.has(id)) map.set(id, `PR${i + 1}`);
  });
  return map;
});

const canAssignHitter = computed(() => rosterStore.activeSlotType === "hitter");

function eligiblePositions(hitter: HitterCard): string {
  const positions = FIELDING_POSITIONS.filter(
    (pos) => getPosRating(hitter.defense, pos) > 0,
  );
  return positions.length > 0 ? positions.join(" ") : "--";
}

function handleHitterClick(cardId: number) {
  const slot = rosterStore.activeSlot;
  if (!slot || rosterStore.activeSlotType !== "hitter") return;
  rosterStore.assignToActiveSlot(cardId);
  const side = activeSide.value;
  if (slot.kind === "pinchHitter") {
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

// ── Lineup config ─────────────────────────────────────────────────────────────

const battingOrder = computed(
  () => rosterStore.getLineup(activeSide.value).battingOrder,
);

function lineupDepthCard(pos: HitterPosition) {
  const id = rosterStore.getLineup(activeSide.value).depth[pos]
    .depthStarterCardId;
  return id ? cardStore.hitterById.get(id) : undefined;
}

// ── Batting order reorder drag ────────────────────────────────────────────────

const lineupDragIdx = ref<number | null>(null);
const lineupDragOver = ref<number | null>(null);

function onLineupRowDragStart(event: DragEvent, idx: number) {
  if (battingOrder.value[idx] === null) {
    event.preventDefault();
    return;
  }
  lineupDragIdx.value = idx;
  event.dataTransfer?.setData("text/plain", String(idx));
}

function onLineupRowDragOver(event: DragEvent, idx: number) {
  if (lineupDragIdx.value === null) return;
  event.preventDefault();
  lineupDragOver.value = idx;
}

function onLineupRowDragLeave(event: DragEvent, idx: number) {
  const el = event.currentTarget as Element;
  const related = event.relatedTarget as Node | null;
  if (!related || !el.contains(related)) {
    if (lineupDragOver.value === idx) lineupDragOver.value = null;
  }
}

function onLineupRowDrop(event: DragEvent, toIdx: number) {
  event.preventDefault();
  lineupDragOver.value = null;
  const fromIdx = lineupDragIdx.value;
  lineupDragIdx.value = null;
  if (fromIdx !== null && fromIdx !== toIdx) {
    rosterStore.reorderBattingOrder(activeSide.value, fromIdx, toIdx);
  }
}

function onLineupRowDragEnd() {
  lineupDragIdx.value = null;
  lineupDragOver.value = null;
}

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

// ── Drag and drop ─────────────────────────────────────────────────────────────

const dragOverSlot = ref<string | null>(null);
const draggingCardId = ref<number | null>(null);

function isEligibleForPos(cardId: number, pos: HitterPosition): boolean {
  if (pos === "DH") return true;
  const hitter = cardStore.hitterById.get(cardId);
  return !!hitter && getPosRating(hitter.defense, pos as FieldingPosition) > 0;
}

function onDragStart(event: DragEvent, cardId: number) {
  event.dataTransfer?.setData("text/plain", String(cardId));
  draggingCardId.value = cardId;
}

function onDragEnd() {
  draggingCardId.value = null;
  dragOverSlot.value = null;
}

function onSlotDragOver(event: DragEvent, key: string) {
  event.preventDefault();
  dragOverSlot.value = key;
}

function onDepthSlotDragOver(
  event: DragEvent,
  key: string,
  pos: HitterPosition,
) {
  const cid = draggingCardId.value;
  if (cid !== null && !isEligibleForPos(cid, pos)) return;
  event.preventDefault();
  dragOverSlot.value = key;
}

function onSlotDragLeave(event: DragEvent, key: string) {
  const el = event.currentTarget as Element;
  const related = event.relatedTarget as Node | null;
  if (!related || !el.contains(related)) {
    if (dragOverSlot.value === key) dragOverSlot.value = null;
  }
}

function onDepthDrop(
  event: DragEvent,
  pos: HitterPosition,
  slot: "depth" | "utility1" | "utility2" | "defSub",
) {
  event.preventDefault();
  dragOverSlot.value = null;
  const cardId = Number(event.dataTransfer?.getData("text/plain"));
  if (
    cardId &&
    rosterStore.rosterHitterIdSet.has(cardId) &&
    isEligibleForPos(cardId, pos)
  ) {
    rosterStore.assignDepthSlot(activeSide.value, pos, slot, cardId);
    rosterStore.setActiveSlot(null);
  }
}

function onBenchDrop(
  event: DragEvent,
  type: "pinchHitter" | "pinchRunner",
  order: number,
) {
  event.preventDefault();
  dragOverSlot.value = null;
  const cardId = Number(event.dataTransfer?.getData("text/plain"));
  if (cardId && rosterStore.rosterHitterIdSet.has(cardId)) {
    rosterStore.assignBenchSlot(activeSide.value, type, order, cardId);
    rosterStore.setActiveSlot(null);
  }
}
</script>

<template>
  <div class="lineups-view">
    <!-- VS RHP / VS LHP tabs -->
    <div class="side-tab-bar">
      <button
        class="side-tab"
        :class="{ 'side-tab-active': activeSide === 'vr' }"
        @click="switchSide('vr')"
      >
        VS RHP
      </button>
      <button
        class="side-tab"
        :class="{ 'side-tab-active': activeSide === 'vl' }"
        @click="switchSide('vl')"
      >
        VS LHP
      </button>
    </div>

    <!-- Hitter roster panel -->
    <div class="roster-panel">
      <div class="roster-panel-header">
        <span class="roster-panel-label">
          Hitters on Roster
          <span v-if="positionFilter" class="pos-filter-label"
            >— filtering for {{ positionFilter }}</span
          >
        </span>
        <span class="roster-panel-count"
          >{{ rosterStore.rosterHitterIdSet.size }}/{{
            rosterStore.era.totalHitters
          }}</span
        >
      </div>
      <div class="roster-list">
        <div
          v-for="hitter in rosterHitters"
          :key="hitter.cardId"
          class="roster-row"
          :class="{
            'roster-row--clickable': canAssignHitter,
            'roster-row--assigned': hitterAssignments.has(hitter.cardId),
          }"
          draggable="true"
          @dragstart="onDragStart($event, hitter.cardId)"
          @dragend="onDragEnd"
          @click="canAssignHitter && handleHitterClick(hitter.cardId)"
        >
          <span class="rr-name">{{ hitter.cardTitle || hitter.name }}</span>
          <span class="rr-pos">{{ eligiblePositions(hitter) }}</span>
          <span class="rr-ovr">{{ hitter.overall }}</span>
          <span v-if="hitterAssignments.has(hitter.cardId)" class="rr-badge">
            {{ hitterAssignments.get(hitter.cardId) }}
          </span>
          <button
            class="rr-remove"
            @click.stop="rosterStore.removeFromRoster(hitter.cardId)"
          >
            x
          </button>
        </div>
        <div
          v-if="
            rosterHitters.length === 0 &&
            rosterStore.rosterHitterIdSet.size === 0
          "
          class="roster-empty"
        >
          No hitters on roster. Add from the Roster tab.
        </div>
        <div v-else-if="rosterHitters.length === 0" class="roster-empty">
          No eligible hitters on roster for this position.
        </div>
      </div>
    </div>

    <!-- Lineup / Depth / Bench config -->
    <div class="config-panel">
      <!-- Lineup order -->
      <div class="config-section lineup-section">
        <div class="section-header">
          <span class="section-title">Lineup</span>
        </div>
        <div class="slot-list">
          <div
            v-for="(pos, idx) in battingOrder"
            :key="idx"
            class="lineup-slot"
            :class="{
              'slot-filled': pos !== null,
              'lineup-drag-over': lineupDragOver === idx,
            }"
            draggable="true"
            @dragstart="onLineupRowDragStart($event, idx)"
            @dragover="onLineupRowDragOver($event, idx)"
            @dragleave="onLineupRowDragLeave($event, idx)"
            @drop="onLineupRowDrop($event, idx)"
            @dragend="onLineupRowDragEnd"
          >
            <span class="slot-num">{{ idx + 1 }}</span>
            <template v-if="pos !== null">
              <span class="lineup-pos">{{ pos }}</span>
              <span class="slot-name">{{
                lineupDepthCard(pos)?.cardTitle ||
                lineupDepthCard(pos)?.name ||
                "(empty)"
              }}</span>
            </template>
            <span v-else class="slot-empty">---</span>
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

                <td>
                  <div
                    class="depth-slot"
                    :class="{
                      'depth-active': depthSlotActive(pos, 'depth'),
                      'slot-eligible':
                        draggingCardId !== null &&
                        isEligibleForPos(draggingCardId, pos),
                      'slot-drag-over': dragOverSlot === `depth-${pos}-depth`,
                    }"
                    @click="
                      rosterStore.setActiveSlot({
                        kind: 'depth',
                        side: activeSide,
                        position: pos,
                        slot: 'depth',
                      })
                    "
                    @dragover="
                      onDepthSlotDragOver($event, `depth-${pos}-depth`, pos)
                    "
                    @dragleave="onSlotDragLeave($event, `depth-${pos}-depth`)"
                    @drop="onDepthDrop($event, pos, 'depth')"
                  >
                    <template v-if="depthCard(pos, 'depth')">
                      <span class="depth-name">{{
                        depthCard(pos, "depth")!.cardTitle ||
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

                <td>
                  <div
                    class="depth-slot"
                    :class="{
                      'depth-active': depthSlotActive(pos, 'utility1'),
                      'slot-eligible':
                        draggingCardId !== null &&
                        isEligibleForPos(draggingCardId, pos),
                      'slot-drag-over':
                        dragOverSlot === `depth-${pos}-utility1`,
                    }"
                    @click="
                      rosterStore.setActiveSlot({
                        kind: 'depth',
                        side: activeSide,
                        position: pos,
                        slot: 'utility1',
                      })
                    "
                    @dragover="
                      onDepthSlotDragOver($event, `depth-${pos}-utility1`, pos)
                    "
                    @dragleave="
                      onSlotDragLeave($event, `depth-${pos}-utility1`)
                    "
                    @drop="onDepthDrop($event, pos, 'utility1')"
                  >
                    <template v-if="depthCard(pos, 'utility1')">
                      <span class="depth-name">{{
                        depthCard(pos, "utility1")!.cardTitle ||
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

                <td>
                  <div
                    class="depth-slot"
                    :class="{
                      'depth-active': depthSlotActive(pos, 'utility2'),
                      'slot-eligible':
                        draggingCardId !== null &&
                        isEligibleForPos(draggingCardId, pos),
                      'slot-drag-over':
                        dragOverSlot === `depth-${pos}-utility2`,
                    }"
                    @click="
                      rosterStore.setActiveSlot({
                        kind: 'depth',
                        side: activeSide,
                        position: pos,
                        slot: 'utility2',
                      })
                    "
                    @dragover="
                      onDepthSlotDragOver($event, `depth-${pos}-utility2`, pos)
                    "
                    @dragleave="
                      onSlotDragLeave($event, `depth-${pos}-utility2`)
                    "
                    @drop="onDepthDrop($event, pos, 'utility2')"
                  >
                    <template v-if="depthCard(pos, 'utility2')">
                      <span class="depth-name">{{
                        depthCard(pos, "utility2")!.cardTitle ||
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

                <td>
                  <div
                    class="depth-slot"
                    :class="{
                      'depth-active': depthSlotActive(pos, 'defSub'),
                      'slot-eligible':
                        draggingCardId !== null &&
                        isEligibleForPos(draggingCardId, pos),
                      'slot-drag-over': dragOverSlot === `depth-${pos}-defSub`,
                    }"
                    @click="
                      rosterStore.setActiveSlot({
                        kind: 'depth',
                        side: activeSide,
                        position: pos,
                        slot: 'defSub',
                      })
                    "
                    @dragover="
                      onDepthSlotDragOver($event, `depth-${pos}-defSub`, pos)
                    "
                    @dragleave="onSlotDragLeave($event, `depth-${pos}-defSub`)"
                    @drop="onDepthDrop($event, pos, 'defSub')"
                  >
                    <template v-if="depthCard(pos, 'defSub')">
                      <span class="depth-name">{{
                        depthCard(pos, "defSub")!.cardTitle ||
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
          <div class="bench-group">
            <div class="bench-group-label">Pinch Hitters</div>
            <div
              v-for="order in [1, 2, 3, 4]"
              :key="`ph-${order}`"
              class="bench-slot"
              :class="{
                'slot-active': benchSlotActive('pinchHitter', order),
                'slot-filled': !!benchCard('pinchHitter', order),
                'slot-eligible': draggingCardId !== null,
                'slot-drag-over': dragOverSlot === `ph-${order}`,
              }"
              @click="
                rosterStore.setActiveSlot({
                  kind: 'pinchHitter',
                  side: activeSide,
                  order,
                })
              "
              @dragover="onSlotDragOver($event, `ph-${order}`)"
              @dragleave="onSlotDragLeave($event, `ph-${order}`)"
              @drop="onBenchDrop($event, 'pinchHitter', order)"
            >
              <span class="slot-num">{{ order }}</span>
              <template v-if="benchCard('pinchHitter', order)">
                <span class="slot-name">{{
                  benchCard("pinchHitter", order)!.cardTitle ||
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

          <div class="bench-group">
            <div class="bench-group-label">Pinch Runners</div>
            <div
              v-for="order in [1, 2, 3, 4]"
              :key="`pr-${order}`"
              class="bench-slot"
              :class="{
                'slot-active': benchSlotActive('pinchRunner', order),
                'slot-filled': !!benchCard('pinchRunner', order),
                'slot-eligible': draggingCardId !== null,
                'slot-drag-over': dragOverSlot === `pr-${order}`,
              }"
              @click="
                rosterStore.setActiveSlot({
                  kind: 'pinchRunner',
                  side: activeSide,
                  order,
                })
              "
              @dragover="onSlotDragOver($event, `pr-${order}`)"
              @dragleave="onSlotDragLeave($event, `pr-${order}`)"
              @drop="onBenchDrop($event, 'pinchRunner', order)"
            >
              <span class="slot-num">{{ order }}</span>
              <template v-if="benchCard('pinchRunner', order)">
                <span class="slot-name">{{
                  benchCard("pinchRunner", order)!.cardTitle ||
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
.lineups-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* ── Side-tab bar ── */
.side-tab-bar {
  display: flex;
  gap: 2px;
  padding: 0 8px;
  height: 36px;
  flex-shrink: 0;
  align-items: flex-end;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.side-tab {
  padding: 0 16px;
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

.side-tab:hover {
  color: #94a3b8;
}

.side-tab-active {
  color: #f1f5f9;
  border-bottom-color: #22c55e;
}

/* ── Roster panel ── */
.roster-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.roster-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 5px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.roster-panel-label {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
}

.pos-filter-label {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: #22c55e;
  font-size: 0.63rem;
}

.roster-panel-count {
  font-size: 0.65rem;
  color: #475569;
}

.roster-list {
  flex: 1;
  overflow-y: auto;
  padding: 2px 0;
}

.roster-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  min-height: 30px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  transition: background 0.1s;
  cursor: grab;
}

.roster-row:active {
  cursor: grabbing;
}

.roster-row--clickable {
  cursor: pointer;
}

.roster-row--clickable:hover {
  background: rgba(34, 197, 94, 0.06);
}

.roster-row--assigned {
  background: rgba(34, 197, 94, 0.04);
}

.rr-name {
  flex: 1;
  font-size: 0.78rem;
  color: #e2e8f0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rr-pos {
  font-size: 0.62rem;
  color: #475569;
  flex-shrink: 0;
  white-space: nowrap;
}

.rr-ovr {
  font-size: 0.72rem;
  color: #64748b;
  flex-shrink: 0;
  width: 26px;
  text-align: right;
}

.rr-badge {
  font-size: 0.6rem;
  font-weight: 600;
  color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
  border-radius: 3px;
  padding: 1px 5px;
  flex-shrink: 0;
  white-space: nowrap;
}

.rr-remove {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 2px;
  color: #475569;
  font-size: 0.6rem;
  padding: 1px 4px;
  cursor: pointer;
  flex-shrink: 0;
  line-height: 1.3;
  transition: color 0.1s;
}

.rr-remove:hover {
  color: #f87171;
}

.roster-empty {
  padding: 16px 12px;
  font-size: 0.75rem;
  color: #334155;
  font-style: italic;
}

/* ── Config panel ── */
.config-panel {
  height: 340px;
  flex-shrink: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  overflow: hidden;
}

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
  cursor: grab;
  transition:
    background 0.1s,
    border-color 0.1s;
}

.lineup-slot:active {
  cursor: grabbing;
}

.lineup-slot:hover {
  background: rgba(255, 255, 255, 0.03);
}

.lineup-slot.lineup-drag-over {
  border-left-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

.lineup-pos {
  font-size: 0.65rem;
  font-weight: 700;
  color: #475569;
  width: 28px;
  flex-shrink: 0;
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

.depth-slot.slot-eligible {
  border-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.03);
}

.depth-slot.slot-drag-over {
  border-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
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

.bench-slot.slot-eligible {
  border-left-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.03);
}

.bench-slot.slot-drag-over {
  border-left-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
}

/* ── Hand colors ── */
.hand-R {
  color: #60a5fa;
}
.hand-L {
  color: #f87171;
}
.hand-S {
  color: #a78bfa;
}
</style>
