<script setup lang="ts">
import { ref } from "vue";
import { useRosterStore } from "./stores/useRosterStore";
import { useSettingsStore } from "./stores/useSettingsStore";
import { useCardStore } from "./stores/useCardStore";
import { ROSTER_TYPES } from "./models/types";
import CardUploader from "./components/CardUploader.vue";
import PitchingView from "./components/PitchingView.vue";
import LineupsView from "./components/LineupsView.vue";
import RosterView from "./components/RosterView.vue";
import DepthChartView from "./components/DepthChartView.vue";
import HelpModal from "./components/HelpModal.vue";

type Tab = "pitching" | "lineups" | "roster" | "depth";

const rosterStore = useRosterStore();
const settingsStore = useSettingsStore();
const cardStore = useCardStore();
const isBundled = () => cardStore.loadedFrom === "bundled";

const activeTab = ref<Tab>("roster");

const SIDEBAR_KEY = "ootp-rb-sidebar-collapsed";
const sidebarCollapsed = ref(localStorage.getItem(SIDEBAR_KEY) === "true");
const showHelp = ref(false);

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value;
  localStorage.setItem(SIDEBAR_KEY, String(sidebarCollapsed.value));
}
</script>

<template>
  <div class="app-shell">
    <!-- Nav bar -->
    <nav class="app-nav">
      <div class="nav-left">
        <a href="https://cratervar.com" class="nav-home">cratervar.com</a>
        <span class="nav-sep">|</span>
        <span class="nav-title">OOTP Roster Builder</span>
      </div>
      <div class="nav-right">
        <button class="nav-help" @click="showHelp = true">?</button>
      </div>
      <div class="nav-tabs">
        <button
          class="nav-tab"
          :class="{ 'nav-tab--active': activeTab === 'roster' }"
          @click="
            activeTab = 'roster';
            rosterStore.setActiveSlot(null);
          "
        >
          ROSTER
        </button>
        <button
          class="nav-tab"
          :class="{ 'nav-tab--active': activeTab === 'pitching' }"
          @click="
            activeTab = 'pitching';
            rosterStore.setActiveSlot(null);
          "
        >
          PITCHING
        </button>
        <button
          class="nav-tab"
          :class="{ 'nav-tab--active': activeTab === 'lineups' }"
          @click="
            activeTab = 'lineups';
            rosterStore.setActiveSlot(null);
          "
        >
          LINEUPS
        </button>
        <button
          class="nav-tab"
          :class="{ 'nav-tab--active': activeTab === 'depth' }"
          @click="
            activeTab = 'depth';
            rosterStore.setActiveSlot(null);
          "
        >
          GRAPHICAL DEPTH CHART
        </button>
      </div>
    </nav>

    <!-- Body -->
    <div class="app-body">
      <!-- Sidebar -->
      <aside
        class="sidebar"
        :class="{ 'sidebar--collapsed': sidebarCollapsed }"
      >
        <CardUploader />

        <div class="sidebar-section">
          <div class="sidebar-label">Roster Type</div>
          <select
            class="sidebar-select"
            :value="rosterStore.roster.rosterTypeId"
            @change="
              rosterStore.setRosterType(
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
          <label
            class="sidebar-toggle-row"
            :class="{ 'toggle-disabled': isBundled() }"
          >
            <span class="sidebar-label-inline">Owned cards only</span>
            <input
              type="checkbox"
              :checked="settingsStore.ownedOnly && !isBundled()"
              :disabled="isBundled()"
              @change="
                settingsStore.setOwnedOnly(
                  ($event.target as HTMLInputElement).checked,
                )
              "
            />
          </label>
        </div>

        <div class="sidebar-section sidebar-summary">
          <div class="summary-count">
            {{ rosterStore.totalPlayers }} / 26 players
          </div>
        </div>

        <div class="sidebar-spacer" />

        <div class="sidebar-section">
          <button class="btn-reset" @click="rosterStore.resetRoster()">
            Reset Roster
          </button>
        </div>
      </aside>

      <!-- Sidebar toggle -->
      <button
        class="sidebar-toggle"
        :class="{ 'sidebar-toggle--collapsed': sidebarCollapsed }"
        @click="toggleSidebar"
      />

      <!-- Main panel -->
      <main class="main-panel">
        <RosterView v-if="activeTab === 'roster'" />
        <PitchingView v-else-if="activeTab === 'pitching'" />
        <LineupsView v-else-if="activeTab === 'lineups'" />
        <DepthChartView v-else />
      </main>
    </div>
    <HelpModal :show="showHelp" @close="showHelp = false" />
  </div>
</template>

<style scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #0f172a;
  color: #cbd5e1;
}

/* ── Nav ── */
.app-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1rem;
  height: 42px;
  background: #1a2332;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.nav-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.nav-home {
  font-size: 0.82rem;
  font-weight: 500;
  color: #cbd5e1;
  text-decoration: none;
}

.nav-home:hover {
  color: #22c55e;
}

.nav-sep {
  color: #334155;
  font-size: 0.75rem;
}

.nav-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: #f1f5f9;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 12px;
}

.nav-help {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 50%;
  color: #64748b;
  font-size: 0.75rem;
  font-weight: 700;
  width: 22px;
  height: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.nav-help:hover {
  color: #cbd5e1;
  border-color: rgba(255, 255, 255, 0.3);
}

.nav-tabs {
  display: flex;
  gap: 2px;
}

.nav-tab {
  padding: 0 16px;
  height: 42px;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: #94a3b8;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  cursor: pointer;
  transition:
    color 0.12s,
    border-color 0.12s;
}

.nav-tab:hover {
  color: #cbd5e1;
}

.nav-tab--active {
  color: #f1f5f9;
  border-bottom-color: #22c55e;
}

/* ── Body ── */
.app-body {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

/* ── Sidebar ── */
.sidebar {
  width: 220px;
  flex-shrink: 0;
  background: #1a2332;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  transition: width 0.2s ease;
}

.sidebar--collapsed {
  width: 0;
  overflow: hidden;
}

.sidebar-section {
  padding: 0.6rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.sidebar-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
  margin-bottom: 0.35rem;
}

.sidebar-select {
  width: 100%;
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: #cbd5e1;
  padding: 4px 6px;
  font-size: 0.78rem;
}

.sidebar-toggle-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.sidebar-label-inline {
  font-size: 0.78rem;
  color: #cbd5e1;
}

.toggle-disabled {
  opacity: 0.4;
  cursor: default;
}

.sidebar-summary {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.summary-count {
  font-size: 0.82rem;
  font-weight: 600;
  color: #f1f5f9;
}

.sidebar-spacer {
  flex: 1;
}

.btn-reset {
  width: 100%;
  padding: 5px 0;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #64748b;
  font-size: 0.72rem;
  cursor: pointer;
  transition:
    background 0.12s,
    color 0.12s;
}

.btn-reset:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #94a3b8;
}

/* ── Sidebar toggle strip ── */
.sidebar-toggle {
  width: 12px;
  flex-shrink: 0;
  background: #1a2332;
  border: none;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s;
}

.sidebar-toggle:hover {
  background: #1e2d42;
}

.sidebar-toggle::before {
  content: "";
  border-top: 5px solid transparent;
  border-bottom: 5px solid transparent;
  border-right: 5px solid #475569;
  transition: transform 0.2s ease;
}

.sidebar-toggle--collapsed::before {
  transform: rotate(180deg);
}

/* ── Main panel ── */
.main-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #0f172a;
}
</style>
