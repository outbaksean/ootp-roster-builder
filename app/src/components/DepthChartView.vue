<script setup lang="ts">
import { ref, computed } from "vue";
import { useCardStore } from "@/stores/useCardStore";
import { useRosterStore } from "@/stores/useRosterStore";
import type { FieldingPosition } from "@/models/types";

const cardStore = useCardStore();
const rosterStore = useRosterStore();

const activeSide = ref<"vr" | "vl">("vr");

const lineup = computed(() => rosterStore.getLineup(activeSide.value));

function cardTitle(id: number | null | undefined): string | null {
  if (!id) return null;
  const card = cardStore.hitterById.get(id);
  return card ? card.cardTitle || card.name : null;
}

type FieldSlot = { pos: FieldingPosition; x: number; y: number };

const FIELD_SLOTS: FieldSlot[] = [
  { pos: "CF", x: 50, y: 7 },
  { pos: "LF", x: 14, y: 23 },
  { pos: "RF", x: 86, y: 23 },
  { pos: "SS", x: 37, y: 49 },
  { pos: "2B", x: 63, y: 44 },
  { pos: "3B", x: 17, y: 61 },
  { pos: "1B", x: 83, y: 61 },
  { pos: "C", x: 50, y: 78 },
];
</script>

<template>
  <div class="depth-view">
    <div class="toggle-bar">
      <button
        class="side-btn"
        :class="{ 'side-btn--active': activeSide === 'vr' }"
        @click="activeSide = 'vr'"
      >
        vs R
      </button>
      <button
        class="side-btn"
        :class="{ 'side-btn--active': activeSide === 'vl' }"
        @click="activeSide = 'vl'"
      >
        vs L
      </button>
    </div>

    <div class="chart-body">
      <div class="field-wrap">
        <svg
          class="field-svg"
          viewBox="0 0 500 480"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <rect width="500" height="480" fill="#1e293b" />
          <!-- outfield grass -->
          <path
            d="M 5,225 Q 250,8 495,225 L 500,480 L 0,480 Z"
            fill="#14532d"
          />
          <!-- warning track -->
          <path
            d="M 22,228 Q 250,27 478,228"
            fill="none"
            stroke="#92400e"
            stroke-width="24"
          />
          <!-- warning track inner edge -->
          <path
            d="M 40,231 Q 250,44 460,231"
            fill="none"
            stroke="#14532d"
            stroke-width="6"
          />
          <!-- infield dirt diamond -->
          <polygon points="250,430 375,305 250,180 125,305" fill="#78350f" />
          <!-- infield grass -->
          <polygon points="250,398 346,316 250,234 154,316" fill="#166534" />
          <!-- foul lines -->
          <line
            x1="250"
            y1="430"
            x2="5"
            y2="200"
            stroke="white"
            stroke-width="1.5"
            opacity="0.35"
          />
          <line
            x1="250"
            y1="430"
            x2="495"
            y2="200"
            stroke="white"
            stroke-width="1.5"
            opacity="0.35"
          />
          <!-- baselines -->
          <line
            x1="250"
            y1="430"
            x2="375"
            y2="305"
            stroke="white"
            stroke-width="1"
            opacity="0.2"
          />
          <line
            x1="375"
            y1="305"
            x2="250"
            y2="180"
            stroke="white"
            stroke-width="1"
            opacity="0.2"
          />
          <line
            x1="250"
            y1="180"
            x2="125"
            y2="305"
            stroke="white"
            stroke-width="1"
            opacity="0.2"
          />
          <line
            x1="125"
            y1="305"
            x2="250"
            y2="430"
            stroke="white"
            stroke-width="1"
            opacity="0.2"
          />
          <!-- pitcher's mound -->
          <ellipse cx="250" cy="315" rx="14" ry="11" fill="#a16207" />
          <!-- 1B -->
          <rect
            x="368"
            y="298"
            width="14"
            height="14"
            transform="rotate(45,375,305)"
            fill="white"
            opacity="0.9"
          />
          <!-- 2B -->
          <rect
            x="243"
            y="173"
            width="14"
            height="14"
            transform="rotate(45,250,180)"
            fill="white"
            opacity="0.9"
          />
          <!-- 3B -->
          <rect
            x="118"
            y="298"
            width="14"
            height="14"
            transform="rotate(45,125,305)"
            fill="white"
            opacity="0.9"
          />
          <!-- home plate -->
          <polygon
            points="250,438 241,431 241,422 259,422 259,431"
            fill="white"
            opacity="0.9"
          />
        </svg>

        <div
          v-for="slot in FIELD_SLOTS"
          :key="slot.pos"
          class="pos-card"
          :style="{ left: slot.x + '%', top: slot.y + '%' }"
        >
          <div class="pos-label">{{ slot.pos }}</div>
          <div
            class="pos-name"
            :class="{
              'pos-empty': !cardTitle(
                lineup.depth[slot.pos].depthStarterCardId,
              ),
            }"
          >
            {{ cardTitle(lineup.depth[slot.pos].depthStarterCardId) ?? "—" }}
          </div>
          <div
            v-if="cardTitle(lineup.depth[slot.pos].utility1CardId)"
            class="pos-sub"
          >
            Ut1 {{ cardTitle(lineup.depth[slot.pos].utility1CardId) }}
          </div>
          <div
            v-if="cardTitle(lineup.depth[slot.pos].utility2CardId)"
            class="pos-sub"
          >
            Ut2 {{ cardTitle(lineup.depth[slot.pos].utility2CardId) }}
          </div>
          <div
            v-if="cardTitle(lineup.depth[slot.pos].defSubCardId)"
            class="pos-sub"
          >
            Def {{ cardTitle(lineup.depth[slot.pos].defSubCardId) }}
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="side-section">
          <div class="side-section-label">DH</div>
          <div
            class="side-name"
            :class="{
              'pos-empty': !cardTitle(lineup.depth['DH'].depthStarterCardId),
            }"
          >
            {{ cardTitle(lineup.depth["DH"].depthStarterCardId) ?? "—" }}
          </div>
          <div
            v-if="cardTitle(lineup.depth['DH'].utility1CardId)"
            class="pos-sub"
          >
            Ut1 {{ cardTitle(lineup.depth["DH"].utility1CardId) }}
          </div>
          <div
            v-if="cardTitle(lineup.depth['DH'].utility2CardId)"
            class="pos-sub"
          >
            Ut2 {{ cardTitle(lineup.depth["DH"].utility2CardId) }}
          </div>
        </div>

        <div class="side-section">
          <div class="side-section-label">Pinch Hitters</div>
          <div
            v-for="(id, i) in lineup.pinchHitters"
            :key="i"
            class="side-name"
            :class="{ 'pos-empty': !cardTitle(id) }"
          >
            {{ cardTitle(id) ?? "—" }}
          </div>
        </div>

        <div class="side-section">
          <div class="side-section-label">Pinch Runners</div>
          <div
            v-for="(id, i) in lineup.pinchRunners"
            :key="i"
            class="side-name"
            :class="{ 'pos-empty': !cardTitle(id) }"
          >
            {{ cardTitle(id) ?? "—" }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.depth-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.toggle-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  height: 40px;
  flex-shrink: 0;
  background: #0f172a;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.side-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #64748b;
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 12px;
  cursor: pointer;
  transition:
    color 0.12s,
    background 0.12s;
}

.side-btn--active {
  background: rgba(34, 197, 94, 0.1);
  border-color: rgba(34, 197, 94, 0.3);
  color: #4ade80;
}

.chart-body {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.field-wrap {
  position: relative;
  flex-shrink: 0;
  height: 100%;
  aspect-ratio: 500 / 480;
}

.field-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.pos-card {
  position: absolute;
  transform: translateX(-50%);
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  padding: 3px 6px;
  width: max-content;
  max-width: 220px;
  backdrop-filter: blur(2px);
}

.pos-label {
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #4ade80;
  margin-bottom: 1px;
}

.pos-name {
  font-size: 0.68rem;
  color: #e2e8f0;
}

.pos-empty {
  color: #334155;
}

.pos-sub {
  font-size: 0.6rem;
  color: #475569;
  margin-top: 1px;
}

.side-panel {
  flex: 1;
  overflow-y: auto;
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-left: 1px solid rgba(255, 255, 255, 0.06);
}

.side-section {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.side-section-label {
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #475569;
  margin-bottom: 3px;
}

.side-name {
  font-size: 0.72rem;
  color: #94a3b8;
  word-break: break-word;
}
</style>
