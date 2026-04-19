<script setup lang="ts">
import { watch } from "vue";
import { usePlayerStore } from "@/stores/usePlayerStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useRosterStore } from "@/stores/useRosterStore";
import { ROSTER_TYPES, ERAS } from "@/models/types";
import RosterView from "./RosterView.vue";
import DataImportModal from "./DataImportModal.vue";
import WeightsModal from "./WeightsModal.vue";

const playerStore = usePlayerStore();
const settingsStore = useSettingsStore();
const rosterStore = useRosterStore();

watch(
  () => [
    settingsStore.activeRosterTypeId,
    settingsStore.activeEraId,
    settingsStore.ownedOnly,
    settingsStore.staminaWeight,
    JSON.stringify(settingsStore.defenseWeights),
  ],
  () => {
    rosterStore.triggerBuild();
  },
);

watch(
  () => [
    playerStore.hitters.length,
    playerStore.pitchers.length,
    playerStore.exportCount,
  ],
  () => {
    rosterStore.triggerBuild(true);
  },
);

function toggleOwnedOnly() {
  settingsStore.setOwnedOnly(!settingsStore.ownedOnly);
}
</script>

<template>
  <div class="roster-builder">
    <aside class="sidebar">
      <div class="sidebar-section">
        <div class="data-status">
          <div class="status-row">
            Export data:
            <span v-if="playerStore.hasExportData" class="status-ok">
              {{ playerStore.exportCount }} file(s) loaded
            </span>
            <span v-else class="status-missing">not loaded</span>
          </div>
          <div class="status-row">
            Card data:
            <span v-if="playerStore.hasPtCardList" class="status-ok"
              >loaded</span
            >
            <span v-else class="status-missing">not loaded</span>
          </div>
        </div>
        <button
          class="sidebar-btn mt-2"
          data-bs-toggle="modal"
          data-bs-target="#dataImportModal"
        >
          Import Data
        </button>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label">Roster Type</label>
        <select
          class="sidebar-select"
          :value="settingsStore.activeRosterTypeId"
          @change="
            settingsStore.setRosterType(
              ($event.target as HTMLSelectElement).value,
            )
          "
        >
          <option v-for="rt in ROSTER_TYPES" :key="rt.id" :value="rt.id">
            {{ rt.label }}
          </option>
        </select>
      </div>

      <div class="sidebar-section">
        <label class="sidebar-label">Era</label>
        <select
          class="sidebar-select"
          :value="settingsStore.activeEraId"
          @change="
            settingsStore.setEra(($event.target as HTMLSelectElement).value)
          "
        >
          <option v-for="era in ERAS" :key="era.id" :value="era.id">
            {{ era.label }}
          </option>
        </select>
      </div>

      <div class="sidebar-section">
        <button
          class="sidebar-btn"
          :class="{ 'sidebar-btn-active': settingsStore.ownedOnly }"
          @click="toggleOwnedOnly"
        >
          Owned Only: {{ settingsStore.ownedOnly ? "On" : "Off" }}
        </button>
      </div>

      <div class="sidebar-section">
        <button
          class="sidebar-btn"
          data-bs-toggle="modal"
          data-bs-target="#weightsModal"
        >
          Optimizer Weights
        </button>
      </div>
    </aside>

    <section class="main-panel">
      <div v-if="!playerStore.hasExportData" class="empty-state">
        <p>No export data loaded.</p>
        <p>Use Import Data to upload tournament result exports.</p>
        <button
          class="sidebar-btn mt-2"
          data-bs-toggle="modal"
          data-bs-target="#dataImportModal"
        >
          Import Data
        </button>
      </div>
      <div v-else-if="rosterStore.isBuilding" class="empty-state">
        <p>Building roster...</p>
      </div>
      <div v-else class="main-panel-scroll">
        <RosterView />
      </div>
    </section>
  </div>

  <DataImportModal />
  <WeightsModal />
</template>

<style scoped>
.roster-builder {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--sidebar-bg, #1a2332);
  color: var(--sidebar-text, #cbd5e1);
  border-right: 1px solid var(--sidebar-border, rgba(255, 255, 255, 0.08));
  overflow-y: auto;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.sidebar-section {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--sidebar-border, rgba(255, 255, 255, 0.08));
}

.sidebar-section:last-child {
  border-bottom: none;
}

.sidebar-label {
  display: block;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--sidebar-muted, #64748b);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.4rem;
}

.sidebar-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.07);
  color: var(--sidebar-text, #cbd5e1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 0.875rem;
}

.sidebar-btn {
  width: 100%;
  background: rgba(255, 255, 255, 0.07);
  color: var(--sidebar-text, #cbd5e1);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 0.875rem;
  cursor: pointer;
  text-align: left;
  transition: background 0.15s;
}

.sidebar-btn:hover {
  background: rgba(255, 255, 255, 0.13);
}

.sidebar-btn-active {
  background: rgba(34, 197, 94, 0.15);
  border-color: rgba(34, 197, 94, 0.4);
  color: #22c55e;
}

.data-status {
  font-size: 0.8rem;
}

.status-row {
  margin-bottom: 0.25rem;
  color: var(--sidebar-muted, #64748b);
}

.status-ok {
  color: var(--accent, #22c55e);
  margin-left: 0.25rem;
}

.status-missing {
  color: #f87171;
  margin-left: 0.25rem;
}

.main-panel {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.main-panel-scroll {
  flex: 1;
  overflow-y: auto;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--text-muted, #64748b);
  font-size: 0.95rem;
  gap: 0.5rem;
  padding: 2rem;
  text-align: center;
}

.mt-2 {
  margin-top: 0.5rem;
}
</style>
