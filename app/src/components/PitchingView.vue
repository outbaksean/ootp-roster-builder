<script setup lang="ts">
import { ref, computed } from "vue";
import { useCardStore } from "@/stores/useCardStore";
import { useRosterStore } from "@/stores/useRosterStore";
import {
  BULLPEN_ROLE_LABELS,
  SECONDARY_ROLE_LABELS,
  RP_USAGE_LABELS,
  pitcherRoleLabel,
} from "@/models/types";
import type { BullpenRole, SecondaryRole, RpUsage } from "@/models/types";

const cardStore = useCardStore();
const rosterStore = useRosterStore();

// ── Pitcher roster panel ──────────────────────────────────────────────────────

const rosterPitchers = computed(() =>
  rosterStore.roster.rosterPitcherIds
    .map((id) => (id !== null ? (cardStore.pitcherById.get(id) ?? null) : null))
    .filter((p) => p !== null),
);

const pitcherAssignment = computed(() => {
  const map = new Map<number, string>();
  for (const p of rosterStore.starters) map.set(p.cardId, `SP ${p.order}`);
  for (const p of rosterStore.relievers) map.set(p.cardId, `RP ${p.order}`);
  return map;
});

const canAssignPitcher = computed(
  () => rosterStore.activeSlotType === "pitcher",
);

function handlePitcherClick(cardId: number) {
  const slot = rosterStore.activeSlot;
  if (!slot || rosterStore.activeSlotType !== "pitcher") return;
  if (slot.kind === "sp" && !isSpEligible(cardId)) return;
  rosterStore.assignToActiveSlot(cardId);
  if (slot.kind === "sp") {
    const max = rosterStore.era.spCount;
    for (let i = slot.order + 1; i <= max; i++) {
      if (!rosterStore.starters.some((s) => s.order === i)) {
        rosterStore.setActiveSlot({ kind: "sp", order: i });
        return;
      }
    }
  } else if (slot.kind === "rp") {
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

// ── SP/RP config ──────────────────────────────────────────────────────────────

const rpCount = computed(
  () => rosterStore.era.totalPitchers - rosterStore.spCount,
);

const rotationSlots = computed(() =>
  Array.from({ length: rosterStore.spCount }, (_, i) => {
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
      secondaryRole: p?.secondaryRole ?? ("None" as SecondaryRole),
      usage: p?.usage ?? ("NormalUsage" as RpUsage),
      active:
        rosterStore.activeSlot?.kind === "rp" &&
        rosterStore.activeSlot.order === order,
    };
  }),
);

// ── Drag and drop ─────────────────────────────────────────────────────────────

const dragOverSlot = ref<string | null>(null);
const draggingCardId = ref<number | null>(null);

function isSpEligible(cardId: number): boolean {
  return (cardStore.pitcherById.get(cardId)?.stamina ?? 0) > 40;
}

function onDragStart(event: DragEvent, cardId: number) {
  event.dataTransfer?.setData("text/plain", String(cardId));
  draggingCardId.value = cardId;
}

function onDragEnd() {
  draggingCardId.value = null;
  dragOverSlot.value = null;
}

function onRpSlotDragOver(event: DragEvent, key: string) {
  event.preventDefault();
  dragOverSlot.value = key;
}

function onSpSlotDragOver(event: DragEvent, key: string) {
  const cid = draggingCardId.value;
  if (cid !== null && !isSpEligible(cid)) return;
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

function onSlotDrop(event: DragEvent, role: "SP" | "RP", order: number) {
  event.preventDefault();
  draggingCardId.value = null;
  dragOverSlot.value = null;
  const cardId = Number(event.dataTransfer?.getData("text/plain"));
  if (!cardId || !rosterStore.rosterPitcherIdSet.has(cardId)) return;
  if (role === "SP" && !isSpEligible(cardId)) return;
  rosterStore.assignPitcher(cardId, role, order);
  rosterStore.setActiveSlot(null);
}
</script>

<template>
  <div class="pitching-view">
    <!-- Pitcher roster panel -->
    <div class="roster-panel">
      <div class="roster-panel-header">
        <span class="roster-panel-label">Pitchers on Roster</span>
        <span class="roster-panel-count">{{
          rosterStore.rosterPitcherIdSet.size
        }}</span>
      </div>
      <div class="roster-col-headers">
        <span class="rr-name rr-col-label">Name</span>
        <span class="rr-pos rr-col-label">Eligible</span>
        <span class="rr-ovr rr-col-label">OVR</span>
        <span class="rr-stamina rr-col-label">STA</span>
        <span class="rr-remove-spacer" />
      </div>
      <div class="roster-list">
        <div
          v-for="pitcher in rosterPitchers"
          :key="pitcher!.cardId"
          class="roster-row"
          :class="{
            'roster-row--clickable': canAssignPitcher,
            'roster-row--assigned': pitcherAssignment.has(pitcher!.cardId),
          }"
          draggable="true"
          @dragstart="onDragStart($event, pitcher!.cardId)"
          @dragend="onDragEnd"
          @click="canAssignPitcher && handlePitcherClick(pitcher!.cardId)"
        >
          <span class="rr-name">{{ pitcher!.cardTitle || pitcher!.name }}</span>
          <span class="rr-pos">{{
            pitcherRoleLabel(pitcher!.pitcherRoleCode)
          }}</span>
          <span class="rr-ovr">{{ pitcher!.overall }}</span>
          <span class="rr-stamina">{{ pitcher!.stamina }}</span>
          <span
            v-if="pitcherAssignment.has(pitcher!.cardId)"
            class="rr-badge"
            >{{ pitcherAssignment.get(pitcher!.cardId) }}</span
          >
          <button
            class="rr-remove"
            @click.stop="rosterStore.removeFromRoster(pitcher!.cardId)"
          >
            x
          </button>
        </div>
        <div v-if="rosterPitchers.length === 0" class="roster-empty">
          No pitchers on roster. Add from the Roster tab.
        </div>
      </div>
    </div>

    <!-- SP/RP config -->
    <div class="config-panel">
      <div class="config-section rotation-section">
        <div class="section-header">
          <span class="section-title">Starting Rotation</span>
          <div class="rotation-picker">
            <button
              v-for="n in [4, 5, 6]"
              :key="n"
              class="rot-btn"
              :class="{ 'rot-btn--active': rosterStore.spCount === n }"
              @click="rosterStore.setSpCount(n)"
            >
              {{ n }}
            </button>
          </div>
          <span class="section-count"
            >{{ rosterStore.starters.length }}/{{ rosterStore.spCount }}</span
          >
        </div>
        <div class="slot-list">
          <div
            v-for="slot in rotationSlots"
            :key="slot.order"
            class="pitcher-slot"
            :class="{
              'slot-active': slot.active,
              'slot-filled': !!slot.card,
              'slot-eligible':
                draggingCardId !== null && isSpEligible(draggingCardId),
              'slot-drag-over': dragOverSlot === `sp-${slot.order}`,
            }"
            @click="
              rosterStore.setActiveSlot({ kind: 'sp', order: slot.order })
            "
            @dragover="onSpSlotDragOver($event, `sp-${slot.order}`)"
            @dragleave="onSlotDragLeave($event, `sp-${slot.order}`)"
            @drop="onSlotDrop($event, 'SP', slot.order)"
          >
            <span class="slot-num">{{ slot.order }}</span>
            <template v-if="slot.card">
              <span class="slot-hand" :class="`hand-${slot.card.throws}`">
                {{ slot.card.throws ?? "--" }}
              </span>
              <span class="slot-name">{{
                slot.card.cardTitle || slot.card.name
              }}</span>
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
            <span v-else class="slot-empty">Click or drag to assign</span>
          </div>
        </div>
      </div>

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
            class="pitcher-slot pitcher-slot--rp"
            :class="{
              'slot-active': slot.active,
              'slot-filled': !!slot.card,
              'slot-eligible': draggingCardId !== null,
              'slot-drag-over': dragOverSlot === `rp-${slot.order}`,
            }"
            @click="
              rosterStore.setActiveSlot({ kind: 'rp', order: slot.order })
            "
            @dragover="onRpSlotDragOver($event, `rp-${slot.order}`)"
            @dragleave="onSlotDragLeave($event, `rp-${slot.order}`)"
            @drop="onSlotDrop($event, 'RP', slot.order)"
          >
            <template v-if="slot.card">
              <div class="slot-main-row">
                <span class="slot-num">{{ slot.order }}</span>
                <span class="slot-hand" :class="`hand-${slot.card.throws}`">
                  {{ slot.card.throws ?? "--" }}
                </span>
                <span class="slot-name">{{
                  slot.card.cardTitle || slot.card.name
                }}</span>
                <span class="slot-stat">{{ slot.card.overall }}</span>
                <div class="slot-actions">
                  <button
                    class="act-btn"
                    @click.stop="
                      rosterStore.movePitcher('RP', slot.order, 'up')
                    "
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
              </div>
              <div class="slot-role-row">
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
                <select
                  class="role-select"
                  :value="slot.secondaryRole"
                  @click.stop
                  @change="
                    rosterStore.setSecondaryRole(
                      slot.card!.cardId,
                      ($event.target as HTMLSelectElement)
                        .value as SecondaryRole,
                    )
                  "
                >
                  <option
                    v-for="(label, key) in SECONDARY_ROLE_LABELS"
                    :key="key"
                    :value="key"
                  >
                    {{ label }}
                  </option>
                </select>
                <select
                  class="role-select"
                  :value="slot.usage"
                  @click.stop
                  @change="
                    rosterStore.setRpUsage(
                      slot.card!.cardId,
                      ($event.target as HTMLSelectElement).value as RpUsage,
                    )
                  "
                >
                  <option
                    v-for="(label, key) in RP_USAGE_LABELS"
                    :key="key"
                    :value="key"
                  >
                    {{ label }}
                  </option>
                </select>
              </div>
            </template>
            <template v-else>
              <span class="slot-num">{{ slot.order }}</span>
              <span class="slot-empty">Click or drag to assign</span>
            </template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pitching-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
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

.roster-panel-count {
  font-size: 0.65rem;
  color: #475569;
}

.roster-col-headers {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}

.rr-col-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
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
  font-weight: 600;
  color: #475569;
  flex-shrink: 0;
}

.rr-ovr {
  font-size: 0.72rem;
  color: #64748b;
  flex-shrink: 0;
  width: 26px;
  text-align: right;
}

.rr-stamina {
  font-size: 0.67rem;
  color: #475569;
  flex-shrink: 0;
  width: 22px;
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

.rr-remove-spacer {
  flex-shrink: 0;
  width: 18px;
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
  height: 500px;
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

.rotation-section {
  width: 280px;
  flex-shrink: 0;
}

.bullpen-section {
  flex: 1;
  min-width: 0;
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

.section-count {
  font-size: 0.65rem;
  color: #475569;
}

.rotation-picker {
  display: flex;
  gap: 2px;
  margin-left: 6px;
}

.rot-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: #475569;
  font-size: 0.6rem;
  font-weight: 600;
  padding: 1px 5px;
  cursor: pointer;
  transition:
    background 0.1s,
    color 0.1s;
}

.rot-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

.rot-btn--active {
  background: rgba(34, 197, 94, 0.12);
  border-color: rgba(34, 197, 94, 0.4);
  color: #4ade80;
}

.slot-list {
  flex: 1;
  overflow-y: auto;
}

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

.pitcher-slot.slot-eligible {
  border-left-color: rgba(34, 197, 94, 0.3);
  background: rgba(34, 197, 94, 0.03);
}

.pitcher-slot.slot-drag-over {
  border-left-color: #22c55e;
  background: rgba(34, 197, 94, 0.1);
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

.pitcher-slot--rp.slot-filled {
  flex-direction: column;
  align-items: stretch;
  gap: 3px;
}

.slot-main-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.slot-role-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding-left: 20px;
}

.role-select {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  color: #94a3b8;
  font-size: 0.65rem;
  padding: 1px 4px;
  flex-shrink: 0;
}

/* ── Hand colors ── */
.hand-R {
  color: #60a5fa;
}
.hand-L {
  color: #f87171;
}
</style>
