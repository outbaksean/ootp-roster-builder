import { defineStore } from "pinia";
import { ref } from "vue";

const OWNED_ONLY_KEY = "ootp-rb-owned-only";

export const useSettingsStore = defineStore("settings", () => {
  const ownedOnly = ref(localStorage.getItem(OWNED_ONLY_KEY) === "true");

  function setOwnedOnly(value: boolean) {
    ownedOnly.value = value;
    localStorage.setItem(OWNED_ONLY_KEY, String(value));
  }

  return { ownedOnly, setOwnedOnly };
});
