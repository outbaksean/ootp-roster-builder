import { defineStore } from "pinia";
import { ref, computed } from "vue";
import db from "@/data/indexedDB";
import { parseExportCsv, mergeExportResults } from "@/helpers/parseExport";
import { parsePtCardList } from "@/helpers/parsePtCardList";
import type {
  HitterCard,
  PitcherCard,
  AggregatedHitterStats,
  AggregatedPitcherStats,
  BatterHand,
  PitcherHand,
} from "@/models/types";
import { getTier } from "@/models/types";
import type { ExportParseResult } from "@/helpers/parseExport";
import type { PtCardRow } from "@/helpers/parsePtCardList";

const EXPORT_STATS_KEY = "exportStats";

function normalize100(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);
  return values.map((v) => ((v - min) / (max - min)) * 100);
}

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

function buildHitterCard(
  stats: AggregatedHitterStats,
  ptRow: PtCardRow | undefined,
  rankScore: number | null,
): HitterCard {
  const name = ptRow
    ? `${ptRow.firstName} ${ptRow.lastName}`.trim()
    : stats.name;
  const overall = ptRow ? ptRow.overall : stats.overall;
  const tier = getTier(overall);

  const vLScore = ptRow
    ? (ptRow.contactVL +
        ptRow.gapVL +
        ptRow.powerVL +
        ptRow.eyeVL +
        ptRow.avoidKVL) /
      5
    : null;
  const vRScore = ptRow
    ? (ptRow.contactVR +
        ptRow.gapVR +
        ptRow.powerVR +
        ptRow.eyeVR +
        ptRow.avoidKVR) /
      5
    : null;

  return {
    cardId: stats.cardId,
    name,
    cardTitle: ptRow?.cardTitle ?? "",
    overall,
    tier,
    bats: ptRow ? batsFromCode(ptRow.bats) : null,
    rankScore,
    totalPA: stats.totalPA,
    vLScore,
    vRScore,
    contactVL: ptRow?.contactVL ?? null,
    gapVL: ptRow?.gapVL ?? null,
    powerVL: ptRow?.powerVL ?? null,
    eyeVL: ptRow?.eyeVL ?? null,
    avoidKVL: ptRow?.avoidKVL ?? null,
    contactVR: ptRow?.contactVR ?? null,
    gapVR: ptRow?.gapVR ?? null,
    powerVR: ptRow?.powerVR ?? null,
    eyeVR: ptRow?.eyeVR ?? null,
    avoidKVR: ptRow?.avoidKVR ?? null,
    defense: ptRow
      ? {
          posRatingC: ptRow.posRatingC,
          posRating1B: ptRow.posRating1B,
          posRating2B: ptRow.posRating2B,
          posRating3B: ptRow.posRating3B,
          posRatingSS: ptRow.posRatingSS,
          posRatingLF: ptRow.posRatingLF,
          posRatingCF: ptRow.posRatingCF,
          posRatingRF: ptRow.posRatingRF,
        }
      : null,
    owned: ptRow?.owned ?? false,
    sellOrderLow: ptRow?.sellOrderLow ?? 0,
    last10Price: ptRow?.last10Price ?? 0,
  };
}

function buildPitcherCard(
  stats: AggregatedPitcherStats,
  ptRow: PtCardRow | undefined,
  rankScore: number | null,
): PitcherCard {
  const name = ptRow
    ? `${ptRow.firstName} ${ptRow.lastName}`.trim()
    : stats.name;
  const overall = ptRow ? ptRow.overall : stats.overall;
  const tier = getTier(overall);

  return {
    cardId: stats.cardId,
    name,
    cardTitle: ptRow?.cardTitle ?? "",
    overall,
    tier,
    throws: ptRow ? throwsFromCode(ptRow.throws) : null,
    pitcherRoleCode: ptRow?.pitcherRoleCode ?? null,
    rankScore,
    totalIP: stats.totalIP,
    stamina: ptRow?.stamina ?? null,
    owned: ptRow?.owned ?? false,
    sellOrderLow: ptRow?.sellOrderLow ?? 0,
    last10Price: ptRow?.last10Price ?? 0,
  };
}

function buildPtOnlyHitterCard(ptRow: PtCardRow): HitterCard {
  const overall = ptRow.overall;
  const tier = getTier(overall);
  const name = `${ptRow.firstName} ${ptRow.lastName}`.trim();

  const vLScore =
    (ptRow.contactVL +
      ptRow.gapVL +
      ptRow.powerVL +
      ptRow.eyeVL +
      ptRow.avoidKVL) /
    5;
  const vRScore =
    (ptRow.contactVR +
      ptRow.gapVR +
      ptRow.powerVR +
      ptRow.eyeVR +
      ptRow.avoidKVR) /
    5;

  return {
    cardId: ptRow.cardId,
    name,
    cardTitle: ptRow.cardTitle,
    overall,
    tier,
    bats: batsFromCode(ptRow.bats),
    rankScore: null,
    totalPA: 0,
    vLScore,
    vRScore,
    contactVL: ptRow.contactVL,
    gapVL: ptRow.gapVL,
    powerVL: ptRow.powerVL,
    eyeVL: ptRow.eyeVL,
    avoidKVL: ptRow.avoidKVL,
    contactVR: ptRow.contactVR,
    gapVR: ptRow.gapVR,
    powerVR: ptRow.powerVR,
    eyeVR: ptRow.eyeVR,
    avoidKVR: ptRow.avoidKVR,
    defense: {
      posRatingC: ptRow.posRatingC,
      posRating1B: ptRow.posRating1B,
      posRating2B: ptRow.posRating2B,
      posRating3B: ptRow.posRating3B,
      posRatingSS: ptRow.posRatingSS,
      posRatingLF: ptRow.posRatingLF,
      posRatingCF: ptRow.posRatingCF,
      posRatingRF: ptRow.posRatingRF,
    },
    owned: ptRow.owned,
    sellOrderLow: ptRow.sellOrderLow,
    last10Price: ptRow.last10Price,
  };
}

function buildPtOnlyPitcherCard(ptRow: PtCardRow): PitcherCard {
  const overall = ptRow.overall;
  const tier = getTier(overall);
  const name = `${ptRow.firstName} ${ptRow.lastName}`.trim();

  return {
    cardId: ptRow.cardId,
    name,
    cardTitle: ptRow.cardTitle,
    overall,
    tier,
    throws: throwsFromCode(ptRow.throws),
    pitcherRoleCode: ptRow.pitcherRoleCode,
    rankScore: null,
    totalIP: 0,
    stamina: ptRow.stamina,
    owned: ptRow.owned,
    sellOrderLow: ptRow.sellOrderLow,
    last10Price: ptRow.last10Price,
  };
}

function mergeAllData(
  exportStats: ExportParseResult | null,
  ptRows: PtCardRow[],
): { hitters: HitterCard[]; pitchers: PitcherCard[] } {
  const ptMap = new Map<number, PtCardRow>();
  for (const row of ptRows) {
    ptMap.set(row.cardId, row);
  }

  const hitters: HitterCard[] = [];
  const pitchers: PitcherCard[] = [];

  if (exportStats) {
    const hitterRawScores = exportStats.hitters.map((h) => h.wraaPerPA);
    const normalizedHitterScores =
      hitterRawScores.length > 0 ? normalize100(hitterRawScores) : [];

    const pitcherRawScores = exportStats.pitchers.map((p) => p.warPerIP);
    const normalizedPitcherScores =
      pitcherRawScores.length > 0 ? normalize100(pitcherRawScores) : [];

    for (let i = 0; i < exportStats.hitters.length; i++) {
      const stats = exportStats.hitters[i];
      const ptRow = ptMap.get(stats.cardId);
      const rankScore = normalizedHitterScores[i] ?? null;
      hitters.push(buildHitterCard(stats, ptRow, rankScore));
    }

    for (let i = 0; i < exportStats.pitchers.length; i++) {
      const stats = exportStats.pitchers[i];
      const ptRow = ptMap.get(stats.cardId);
      const rankScore = normalizedPitcherScores[i] ?? null;
      pitchers.push(buildPitcherCard(stats, ptRow, rankScore));
    }

    const exportHitterIds = new Set(exportStats.hitters.map((h) => h.cardId));
    const exportPitcherIds = new Set(exportStats.pitchers.map((p) => p.cardId));

    for (const ptRow of ptRows) {
      if (ptRow.pitcherRoleCode > 0) {
        if (!exportPitcherIds.has(ptRow.cardId)) {
          pitchers.push(buildPtOnlyPitcherCard(ptRow));
        }
      } else {
        if (!exportHitterIds.has(ptRow.cardId)) {
          hitters.push(buildPtOnlyHitterCard(ptRow));
        }
      }
    }
  } else {
    for (const ptRow of ptRows) {
      if (ptRow.pitcherRoleCode > 0) {
        pitchers.push(buildPtOnlyPitcherCard(ptRow));
      } else {
        hitters.push(buildPtOnlyHitterCard(ptRow));
      }
    }
  }

  return { hitters, pitchers };
}

export const usePlayerStore = defineStore("player", () => {
  const hitters = ref<HitterCard[]>([]);
  const pitchers = ref<PitcherCard[]>([]);
  const ptCardListLoadedAt = ref<string | null>(
    localStorage.getItem("ptCardListLoadedAt"),
  );
  const exportCount = ref<number>(
    parseInt(localStorage.getItem("exportCount") ?? "0", 10) || 0,
  );
  const isLoading = ref(false);

  const hasPtCardList = computed(() => ptCardListLoadedAt.value !== null);
  const hasExportData = computed(() => exportCount.value > 0);

  let ptRows: PtCardRow[] = [];

  function getStoredExportStats(): ExportParseResult | null {
    const stored = localStorage.getItem(EXPORT_STATS_KEY);
    if (!stored) return null;
    try {
      return JSON.parse(stored) as ExportParseResult;
    } catch {
      return null;
    }
  }

  function saveExportStats(stats: ExportParseResult) {
    localStorage.setItem(EXPORT_STATS_KEY, JSON.stringify(stats));
  }

  async function persistAndSync(
    mergedHitters: HitterCard[],
    mergedPitchers: PitcherCard[],
  ) {
    await db.hitterCards.bulkPut(mergedHitters);
    await db.pitcherCards.bulkPut(mergedPitchers);
    hitters.value = mergedHitters;
    pitchers.value = mergedPitchers;
  }

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

  async function uploadPtCardList(csvText: string) {
    isLoading.value = true;
    try {
      ptRows = parsePtCardList(csvText);
      const exportStats = getStoredExportStats();
      const { hitters: mergedHitters, pitchers: mergedPitchers } = mergeAllData(
        exportStats,
        ptRows,
      );
      await persistAndSync(mergedHitters, mergedPitchers);
      ptCardListLoadedAt.value = new Date().toISOString();
      localStorage.setItem("ptCardListLoadedAt", ptCardListLoadedAt.value);
    } finally {
      isLoading.value = false;
    }
  }

  async function uploadExport(csvText: string) {
    isLoading.value = true;
    try {
      const incoming = parseExportCsv(csvText);
      const existing = getStoredExportStats() ?? { hitters: [], pitchers: [] };
      const merged = mergeExportResults(existing, incoming);
      saveExportStats(merged);
      exportCount.value += 1;
      localStorage.setItem("exportCount", String(exportCount.value));
      const { hitters: mergedHitters, pitchers: mergedPitchers } = mergeAllData(
        merged,
        ptRows,
      );
      await persistAndSync(mergedHitters, mergedPitchers);
    } finally {
      isLoading.value = false;
    }
  }

  async function clearExportData() {
    localStorage.removeItem(EXPORT_STATS_KEY);
    exportCount.value = 0;
    localStorage.setItem("exportCount", "0");
    const exportStats = null;
    const { hitters: mergedHitters, pitchers: mergedPitchers } = mergeAllData(
      exportStats,
      ptRows,
    );
    await persistAndSync(mergedHitters, mergedPitchers);
  }

  return {
    hitters,
    pitchers,
    ptCardListLoadedAt,
    exportCount,
    isLoading,
    hasPtCardList,
    hasExportData,
    initialize,
    uploadPtCardList,
    uploadExport,
    clearExportData,
  };
});
