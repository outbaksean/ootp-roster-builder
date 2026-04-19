import { defineStore } from "pinia";
import { ref } from "vue";
import { usePlayerStore } from "./usePlayerStore";
import { useSettingsStore } from "./useSettingsStore";
import { buildRoster } from "@/helpers/rosterOptimizer";
import type { BuiltRoster } from "@/models/types";

export const useRosterStore = defineStore("roster", () => {
  const currentRoster = ref<BuiltRoster | null>(null);
  const isBuilding = ref(false);

  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  function triggerBuild(immediate = false) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(
      () => {
        rebuild();
      },
      immediate ? 0 : 300,
    );
  }

  function rebuild() {
    const playerStore = usePlayerStore();
    const settingsStore = useSettingsStore();

    if (!playerStore.hasExportData) {
      currentRoster.value = null;
      return;
    }

    isBuilding.value = true;
    try {
      currentRoster.value = buildRoster(
        playerStore.hitters,
        playerStore.pitchers,
        settingsStore.activeEra,
        settingsStore.activeRosterType.maxTier,
        {
          defenseWeights: settingsStore.defenseWeights,
          staminaWeight: settingsStore.staminaWeight,
          ownedOnly: settingsStore.ownedOnly,
        },
      );
    } finally {
      isBuilding.value = false;
    }
  }

  return { currentRoster, isBuilding, triggerBuild, rebuild };
});
