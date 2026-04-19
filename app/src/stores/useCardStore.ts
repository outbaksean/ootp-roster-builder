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
const LOADED_FROM_KEY = "ootp-rb-pt-loaded-from";
const BUNDLED_CSV_URL = `${import.meta.env.BASE_URL}pt_card_list.csv`;

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

function isTwoWayRow(row: PtCardRow): boolean {
  const hasPitching = row.pitcherRoleCode > 0 || row.posRatingP >= 50;
  const hitScore =
    ((row.contactVL + row.contactVR) / 2 +
      (row.gapVL + row.gapVR) / 2 +
      (row.powerVL + row.powerVR) / 2 +
      (row.eyeVL + row.eyeVR) / 2 +
      (row.avoidKVL + row.avoidKVR) / 2) /
    5;
  const pitchScore = (row.stuff + row.movement + row.control) / 3;
  return hasPitching && hitScore >= 55 && pitchScore >= 55;
}

function rowToHitter(row: PtCardRow, isTwoWay = false): HitterCard {
  return {
    cardId: row.cardId,
    name: `${row.firstName} ${row.lastName}`.trim(),
    cardTitle: row.cardTitle,
    overall: row.overall,
    tier: getTier(row.overall),
    isTwoWay,
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

function rowToPitcher(row: PtCardRow, isTwoWay = false): PitcherCard {
  return {
    cardId: row.cardId,
    name: `${row.firstName} ${row.lastName}`.trim(),
    cardTitle: row.cardTitle,
    overall: row.overall,
    tier: getTier(row.overall),
    isTwoWay,
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
  const loadedFrom = ref<"bundled" | "uploaded" | null>(
    localStorage.getItem(LOADED_FROM_KEY) as "bundled" | "uploaded" | null,
  );
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
  const twoWayCardIds = computed(
    () =>
      new Set(pitchers.value.filter((p) => p.isTwoWay).map((p) => p.cardId)),
  );

  async function parseAndStore(
    csvText: string,
    source: "bundled" | "uploaded",
    dateStr: string,
  ) {
    const rows = parsePtCardList(csvText);
    const newHitters: HitterCard[] = [];
    const newPitchers: PitcherCard[] = [];
    for (const row of rows) {
      const twoWay = isTwoWayRow(row);
      if (row.pitcherRoleCode > 0 || (twoWay && row.posRatingP >= 50)) {
        newPitchers.push(rowToPitcher(row, twoWay));
      }
      if (row.pitcherRoleCode === 0 || twoWay) {
        newHitters.push(rowToHitter(row, twoWay));
      }
    }
    await db.hitterCards.clear();
    await db.pitcherCards.clear();
    await db.hitterCards.bulkAdd(newHitters);
    await db.pitcherCards.bulkAdd(newPitchers);
    hitters.value = newHitters;
    pitchers.value = newPitchers;
    loadedFrom.value = source;
    localStorage.setItem(LOADED_FROM_KEY, source);
    loadedAt.value = dateStr;
    localStorage.setItem(LOADED_AT_KEY, dateStr);
  }

  async function loadBundled() {
    const res = await fetch(BUNDLED_CSV_URL);
    const lastModified = res.headers.get("Last-Modified");
    const csvText = await res.text();
    const dateStr = lastModified
      ? new Date(lastModified).toISOString()
      : new Date().toISOString();
    await parseAndStore(csvText, "bundled", dateStr);
  }

  async function initialize() {
    isLoading.value = true;
    try {
      const [dbHitters, dbPitchers] = await Promise.all([
        db.hitterCards.toArray(),
        db.pitcherCards.toArray(),
      ]);
      if (dbHitters.length > 0 || dbPitchers.length > 0) {
        hitters.value = dbHitters;
        pitchers.value = dbPitchers;
      } else {
        await loadBundled();
      }
    } finally {
      isLoading.value = false;
    }
  }

  async function uploadPtCardList(file: File) {
    isLoading.value = true;
    try {
      const csvText = await file.text();
      await parseAndStore(csvText, "uploaded", new Date().toISOString());
    } finally {
      isLoading.value = false;
    }
  }

  async function revertToBundled() {
    isLoading.value = true;
    try {
      await loadBundled();
    } finally {
      isLoading.value = false;
    }
  }

  return {
    hitters,
    pitchers,
    loadedAt,
    loadedFrom,
    isLoading,
    hasCards,
    cardCount,
    hitterById,
    pitcherById,
    twoWayCardIds,
    initialize,
    uploadPtCardList,
    revertToBundled,
  };
});
