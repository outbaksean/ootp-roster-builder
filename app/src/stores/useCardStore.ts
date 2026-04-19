import { defineStore } from "pinia";
import { ref, computed } from "vue";
import db from "@/data/indexedDB";
import { parsePtCardList } from "@/helpers/parsePtCardList";
import type {
  HitterCard,
  PitcherCard,
  BatterHand,
  PitcherHand,
} from "@/models/types";
import { getTier } from "@/models/types";
import type { PtCardRow } from "@/helpers/parsePtCardList";

const LOADED_AT_KEY = "ootp-rb-pt-loaded-at";

function batsFromCode(code: number): BatterHand | null {
  if (code === 1) return "R";
  if (code === 2) return "L";
  if (code === 3) return "S";
  return null;
}

function throwsFromCode(code: number): PitcherHand | null {
  if (code === 1) return "R";
  if (code === 2) return "L";
  return null;
}

function rowToHitter(row: PtCardRow): HitterCard {
  return {
    cardId: row.cardId,
    name: `${row.firstName} ${row.lastName}`.trim(),
    cardTitle: row.cardTitle,
    overall: row.overall,
    tier: getTier(row.overall),
    bats: batsFromCode(row.bats),
    vLScore:
      (row.contactVL + row.gapVL + row.powerVL + row.eyeVL + row.avoidKVL) / 5,
    vRScore:
      (row.contactVR + row.gapVR + row.powerVR + row.eyeVR + row.avoidKVR) / 5,
    contactVL: row.contactVL,
    gapVL: row.gapVL,
    powerVL: row.powerVL,
    eyeVL: row.eyeVL,
    avoidKVL: row.avoidKVL,
    contactVR: row.contactVR,
    gapVR: row.gapVR,
    powerVR: row.powerVR,
    eyeVR: row.eyeVR,
    avoidKVR: row.avoidKVR,
    defense: {
      posRatingC: row.posRatingC,
      posRating1B: row.posRating1B,
      posRating2B: row.posRating2B,
      posRating3B: row.posRating3B,
      posRatingSS: row.posRatingSS,
      posRatingLF: row.posRatingLF,
      posRatingCF: row.posRatingCF,
      posRatingRF: row.posRatingRF,
    },
    owned: row.owned,
    sellOrderLow: row.sellOrderLow,
    last10Price: row.last10Price,
  };
}

function rowToPitcher(row: PtCardRow): PitcherCard {
  return {
    cardId: row.cardId,
    name: `${row.firstName} ${row.lastName}`.trim(),
    cardTitle: row.cardTitle,
    overall: row.overall,
    tier: getTier(row.overall),
    throws: throwsFromCode(row.throws),
    pitcherRoleCode: row.pitcherRoleCode,
    stamina: row.stamina,
    owned: row.owned,
    sellOrderLow: row.sellOrderLow,
    last10Price: row.last10Price,
  };
}

export const useCardStore = defineStore("card", () => {
  const hitters = ref<HitterCard[]>([]);
  const pitchers = ref<PitcherCard[]>([]);
  const loadedAt = ref<string | null>(localStorage.getItem(LOADED_AT_KEY));
  const isLoading = ref(false);

  const hasCards = computed(
    () => hitters.value.length > 0 || pitchers.value.length > 0,
  );
  const cardCount = computed(
    () => hitters.value.length + pitchers.value.length,
  );

  const hitterById = computed(
    () => new Map(hitters.value.map((c) => [c.cardId, c])),
  );
  const pitcherById = computed(
    () => new Map(pitchers.value.map((c) => [c.cardId, c])),
  );

  async function initialize() {
    isLoading.value = true;
    try {
      const [dbHitters, dbPitchers] = await Promise.all([
        db.hitterCards.toArray(),
        db.pitcherCards.toArray(),
      ]);
      hitters.value = dbHitters;
      pitchers.value = dbPitchers;
    } finally {
      isLoading.value = false;
    }
  }

  async function uploadPtCardList(file: File) {
    isLoading.value = true;
    try {
      const csvText = await file.text();
      const rows = parsePtCardList(csvText);
      const newHitters: HitterCard[] = [];
      const newPitchers: PitcherCard[] = [];
      for (const row of rows) {
        if (row.pitcherRoleCode > 0) {
          newPitchers.push(rowToPitcher(row));
        } else {
          newHitters.push(rowToHitter(row));
        }
      }
      await db.hitterCards.clear();
      await db.pitcherCards.clear();
      await db.hitterCards.bulkAdd(newHitters);
      await db.pitcherCards.bulkAdd(newPitchers);
      hitters.value = newHitters;
      pitchers.value = newPitchers;
      loadedAt.value = new Date().toISOString();
      localStorage.setItem(LOADED_AT_KEY, loadedAt.value);
    } finally {
      isLoading.value = false;
    }
  }

  async function clearCards() {
    await db.hitterCards.clear();
    await db.pitcherCards.clear();
    hitters.value = [];
    pitchers.value = [];
    loadedAt.value = null;
    localStorage.removeItem(LOADED_AT_KEY);
  }

  return {
    hitters,
    pitchers,
    loadedAt,
    isLoading,
    hasCards,
    cardCount,
    hitterById,
    pitcherById,
    initialize,
    uploadPtCardList,
    clearCards,
  };
});
