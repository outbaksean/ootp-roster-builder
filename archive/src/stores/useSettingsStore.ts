import { defineStore } from "pinia";
import { ref, computed } from "vue";
import {
  DEFAULT_DEFENSE_WEIGHTS,
  DEFAULT_STAMINA_WEIGHT,
  ERAS,
  ROSTER_TYPES,
} from "@/models/types";
import type { FieldingPosition } from "@/models/types";

export const useSettingsStore = defineStore("settings", () => {
  const activeRosterTypeId = ref(
    localStorage.getItem("rosterTypeId") ?? "bronze",
  );
  const activeEraId = ref(localStorage.getItem("eraId") ?? "standard");
  const ownedOnly = ref(localStorage.getItem("ownedOnly") !== "false");
  const staminaWeight = ref(
    parseFloat(
      localStorage.getItem("staminaWeight") ?? String(DEFAULT_STAMINA_WEIGHT),
    ),
  );

  const _storedWeights = localStorage.getItem("defenseWeights");
  const defenseWeights = ref<Record<FieldingPosition, number>>(
    _storedWeights
      ? JSON.parse(_storedWeights)
      : { ...DEFAULT_DEFENSE_WEIGHTS },
  );

  const activeRosterType = computed(
    () => ROSTER_TYPES.find((r) => r.id === activeRosterTypeId.value)!,
  );
  const activeEra = computed(
    () => ERAS.find((e) => e.id === activeEraId.value)!,
  );

  function setRosterType(id: string) {
    activeRosterTypeId.value = id;
    localStorage.setItem("rosterTypeId", id);
  }

  function setEra(id: string) {
    activeEraId.value = id;
    localStorage.setItem("eraId", id);
  }

  function setOwnedOnly(val: boolean) {
    ownedOnly.value = val;
    localStorage.setItem("ownedOnly", String(val));
  }

  function setDefenseWeight(pos: FieldingPosition, weight: number) {
    defenseWeights.value[pos] = weight;
    localStorage.setItem(
      "defenseWeights",
      JSON.stringify(defenseWeights.value),
    );
  }

  function setStaminaWeight(weight: number) {
    staminaWeight.value = weight;
    localStorage.setItem("staminaWeight", String(weight));
  }

  function resetWeights() {
    defenseWeights.value = { ...DEFAULT_DEFENSE_WEIGHTS };
    staminaWeight.value = DEFAULT_STAMINA_WEIGHT;
    localStorage.setItem(
      "defenseWeights",
      JSON.stringify(defenseWeights.value),
    );
    localStorage.setItem("staminaWeight", String(DEFAULT_STAMINA_WEIGHT));
  }

  return {
    activeRosterTypeId,
    activeEraId,
    ownedOnly,
    defenseWeights,
    staminaWeight,
    activeRosterType,
    activeEra,
    setRosterType,
    setEra,
    setOwnedOnly,
    setDefenseWeight,
    setStaminaWeight,
    resetWeights,
  };
});
