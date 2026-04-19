<script setup lang="ts">
import { computed } from "vue";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { FIELDING_POSITIONS } from "@/models/types";
import type { FieldingPosition } from "@/models/types";

const settingsStore = useSettingsStore();

function defenseWeightPct(pos: FieldingPosition): number {
  return Math.round((settingsStore.defenseWeights[pos] ?? 0) * 100);
}

function onDefenseWeightChange(pos: FieldingPosition, event: Event) {
  const val = parseInt((event.target as HTMLInputElement).value, 10);
  settingsStore.setDefenseWeight(pos, val / 100);
}

const staminaPct = computed(() =>
  Math.round(settingsStore.staminaWeight * 100),
);

function onStaminaChange(event: Event) {
  const val = parseInt((event.target as HTMLInputElement).value, 10);
  settingsStore.setStaminaWeight(val / 100);
}
</script>

<template>
  <Teleport to="body">
  <div
    id="weightsModal"
    class="modal fade"
    tabindex="-1"
    aria-labelledby="weightsModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog dark-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h5 id="weightsModalLabel" class="modal-title">Optimizer Weights</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <h6>Defense Weights by Position</h6>
          <p class="text-muted mb-3">
            Higher weight = defense contributes more to position ranking. 0% =
            offense only.
          </p>
          <div
            v-for="pos in FIELDING_POSITIONS"
            :key="pos"
            class="weight-row mb-3"
          >
            <div class="d-flex justify-content-between mb-1">
              <label class="weight-label">{{ pos }}</label>
              <span class="weight-value">{{ defenseWeightPct(pos) }}%</span>
            </div>
            <input
              type="range"
              class="form-range"
              min="0"
              max="100"
              :value="defenseWeightPct(pos)"
              @input="onDefenseWeightChange(pos, $event)"
            />
          </div>

          <h6 class="mt-4">Stamina Weight (Starters)</h6>
          <p class="text-muted mb-3">
            Higher weight = stamina contributes more to starter selection.
          </p>
          <div class="weight-row mb-3">
            <div class="d-flex justify-content-between mb-1">
              <label class="weight-label">Stamina</label>
              <span class="weight-value">{{ staminaPct }}%</span>
            </div>
            <input
              type="range"
              class="form-range"
              min="0"
              max="100"
              :value="staminaPct"
              @input="onStaminaChange"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            @click="settingsStore.resetWeights()"
          >
            Reset to Defaults
          </button>
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
.weight-label {
  font-size: 0.875rem;
  color: #cbd5e1;
  font-weight: 500;
}

.weight-value {
  font-size: 0.875rem;
  color: #94a3b8;
  min-width: 3rem;
  text-align: right;
}

.form-range::-webkit-slider-thumb {
  background: var(--accent, #22c55e);
}
</style>
