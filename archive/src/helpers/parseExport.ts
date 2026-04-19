import Papa from "papaparse";
import type {
  AggregatedHitterStats,
  AggregatedPitcherStats,
} from "@/models/types";

const PITCHER_POSITIONS = new Set(["SP", "RP", "CL"]);

function parseIP(ipStr: string): number {
  const val = parseFloat(ipStr);
  if (isNaN(val)) return 0;
  const whole = Math.floor(val);
  const frac = Math.round((val - whole) * 10);
  return whole + frac / 3;
}

export type ExportParseResult = {
  hitters: AggregatedHitterStats[];
  pitchers: AggregatedPitcherStats[];
};

export function parseExportCsv(csvText: string): ExportParseResult {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const hitterMap = new Map<
    number,
    {
      cardId: number;
      name: string;
      overall: number;
      totalPA: number;
      totalWAR: number;
      totalWRAA: number;
    }
  >();

  const pitcherMap = new Map<
    number,
    {
      cardId: number;
      name: string;
      overall: number;
      totalIP: number;
      totalER: number;
      totalBB: number;
      totalK: number;
      totalWAR: number;
    }
  >();

  for (const row of result.data) {
    const cidStr = row["CID"];
    if (!cidStr || cidStr === "-" || cidStr.trim() === "") continue;

    const cardId = parseInt(cidStr, 10);
    if (isNaN(cardId)) continue;

    const pos = (row["POS"] ?? "").trim().toUpperCase();
    const name = (row["Name"] ?? "").trim();
    const overall = parseInt(row["VAL"] ?? "0", 10) || 0;

    if (PITCHER_POSITIONS.has(pos)) {
      const ip = parseIP(row["IP"] ?? "0");
      if (ip === 0) continue;

      const er = parseFloat(row["ER"] ?? "0") || 0;
      const bb = parseFloat(row["BB_1"] ?? "0") || 0;
      const k = parseFloat(row["K_1"] ?? "0") || 0;
      const war = parseFloat(row["WAR_1"] ?? "0") || 0;

      const existing = pitcherMap.get(cardId);
      if (existing) {
        existing.totalIP += ip;
        existing.totalER += er;
        existing.totalBB += bb;
        existing.totalK += k;
        existing.totalWAR += war;
      } else {
        pitcherMap.set(cardId, {
          cardId,
          name,
          overall,
          totalIP: ip,
          totalER: er,
          totalBB: bb,
          totalK: k,
          totalWAR: war,
        });
      }
    } else {
      const pa = parseFloat(row["PA"] ?? "0") || 0;
      if (pa === 0) continue;

      const war = parseFloat(row["WAR"] ?? "0") || 0;
      const wraa = parseFloat(row["wRAA"] ?? "0") || 0;

      const existing = hitterMap.get(cardId);
      if (existing) {
        existing.totalPA += pa;
        existing.totalWAR += war;
        existing.totalWRAA += wraa;
      } else {
        hitterMap.set(cardId, {
          cardId,
          name,
          overall,
          totalPA: pa,
          totalWAR: war,
          totalWRAA: wraa,
        });
      }
    }
  }

  const hitters: AggregatedHitterStats[] = [];
  for (const h of hitterMap.values()) {
    hitters.push({
      ...h,
      wraaPerPA: h.totalPA > 0 ? h.totalWRAA / h.totalPA : 0,
      war600: h.totalPA > 0 ? (h.totalWAR / h.totalPA) * 600 : 0,
    });
  }

  const pitchers: AggregatedPitcherStats[] = [];
  for (const p of pitcherMap.values()) {
    pitchers.push({
      ...p,
      era: p.totalIP > 0 ? (p.totalER * 9) / p.totalIP : 0,
      warPerIP: p.totalIP > 0 ? p.totalWAR / p.totalIP : 0,
    });
  }

  return { hitters, pitchers };
}

export function mergeExportResults(
  existing: ExportParseResult,
  incoming: ExportParseResult,
): ExportParseResult {
  const hitterMap = new Map<
    number,
    {
      cardId: number;
      name: string;
      overall: number;
      totalPA: number;
      totalWAR: number;
      totalWRAA: number;
    }
  >();

  for (const h of existing.hitters) {
    hitterMap.set(h.cardId, {
      cardId: h.cardId,
      name: h.name,
      overall: h.overall,
      totalPA: h.totalPA,
      totalWAR: h.totalWAR,
      totalWRAA: h.totalWRAA,
    });
  }
  for (const h of incoming.hitters) {
    const ex = hitterMap.get(h.cardId);
    if (ex) {
      ex.totalPA += h.totalPA;
      ex.totalWAR += h.totalWAR;
      ex.totalWRAA += h.totalWRAA;
    } else {
      hitterMap.set(h.cardId, {
        cardId: h.cardId,
        name: h.name,
        overall: h.overall,
        totalPA: h.totalPA,
        totalWAR: h.totalWAR,
        totalWRAA: h.totalWRAA,
      });
    }
  }

  const pitcherMap = new Map<
    number,
    {
      cardId: number;
      name: string;
      overall: number;
      totalIP: number;
      totalER: number;
      totalBB: number;
      totalK: number;
      totalWAR: number;
    }
  >();

  for (const p of existing.pitchers) {
    pitcherMap.set(p.cardId, {
      cardId: p.cardId,
      name: p.name,
      overall: p.overall,
      totalIP: p.totalIP,
      totalER: p.totalER,
      totalBB: p.totalBB,
      totalK: p.totalK,
      totalWAR: p.totalWAR,
    });
  }
  for (const p of incoming.pitchers) {
    const ex = pitcherMap.get(p.cardId);
    if (ex) {
      ex.totalIP += p.totalIP;
      ex.totalER += p.totalER;
      ex.totalBB += p.totalBB;
      ex.totalK += p.totalK;
      ex.totalWAR += p.totalWAR;
    } else {
      pitcherMap.set(p.cardId, {
        cardId: p.cardId,
        name: p.name,
        overall: p.overall,
        totalIP: p.totalIP,
        totalER: p.totalER,
        totalBB: p.totalBB,
        totalK: p.totalK,
        totalWAR: p.totalWAR,
      });
    }
  }

  const hitters: AggregatedHitterStats[] = [];
  for (const h of hitterMap.values()) {
    hitters.push({
      ...h,
      wraaPerPA: h.totalPA > 0 ? h.totalWRAA / h.totalPA : 0,
      war600: h.totalPA > 0 ? (h.totalWAR / h.totalPA) * 600 : 0,
    });
  }

  const pitchers: AggregatedPitcherStats[] = [];
  for (const p of pitcherMap.values()) {
    pitchers.push({
      ...p,
      era: p.totalIP > 0 ? (p.totalER * 9) / p.totalIP : 0,
      warPerIP: p.totalIP > 0 ? p.totalWAR / p.totalIP : 0,
    });
  }

  return { hitters, pitchers };
}
