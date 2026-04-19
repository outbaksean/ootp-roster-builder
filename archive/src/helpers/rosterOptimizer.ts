import type {
  HitterCard,
  PitcherCard,
  BuiltRoster,
  Era,
  FieldingPosition,
  PositionAssignment,
  CardTier,
} from "@/models/types";
import {
  getPosRating,
  DEFAULT_DEFENSE_WEIGHTS,
  DEFAULT_STAMINA_WEIGHT,
  isTierEligible,
} from "@/models/types";

export type OptimizerSettings = {
  defenseWeights: Record<FieldingPosition, number>;
  staminaWeight: number;
  ownedOnly: boolean;
};

export const DEFAULT_OPTIMIZER_SETTINGS: OptimizerSettings = {
  defenseWeights: { ...DEFAULT_DEFENSE_WEIGHTS },
  staminaWeight: DEFAULT_STAMINA_WEIGHT,
  ownedOnly: false,
};

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 0.5);
  return values.map((v) => (v - min) / (max - min));
}

export function buildRoster(
  allHitters: HitterCard[],
  allPitchers: PitcherCard[],
  era: Era,
  rosterTypeMaxTier: CardTier | null,
  settings: OptimizerSettings,
): BuiltRoster {
  const validationErrors: string[] = [];

  function tierEligible(tier: CardTier): boolean {
    return isTierEligible(tier, rosterTypeMaxTier);
  }

  function meetsFilter(owned: boolean): boolean {
    if (settings.ownedOnly && !owned) return false;
    return true;
  }

  const pitcherPool = allPitchers.filter(
    (p) => p.rankScore !== null && tierEligible(p.tier) && meetsFilter(p.owned),
  );

  const hitterPool = allHitters.filter(
    (h) => h.rankScore !== null && tierEligible(h.tier) && meetsFilter(h.owned),
  );

  const spCount = era.spCount;
  const rpCount = era.totalPitchers - spCount;

  const rankScores = pitcherPool.map((p) => p.rankScore as number);
  const normalizedRanks = rankScores.length > 0 ? normalize(rankScores) : [];

  const staminaValues = pitcherPool.map((p) => (p.stamina ?? 50) / 100);

  const pitcherCompositeScores = pitcherPool.map((_, i) => {
    const nr = normalizedRanks[i] ?? 0.5;
    const ns = staminaValues[i] ?? 0.5;
    return nr * (1 - settings.staminaWeight) + ns * settings.staminaWeight;
  });

  const pitcherWithScores = pitcherPool.map((p, i) => ({
    pitcher: p,
    starterScore: pitcherCompositeScores[i],
    relieverScore: normalizedRanks[i] ?? 0,
  }));

  pitcherWithScores.sort((a, b) => b.starterScore - a.starterScore);

  const starters: PitcherCard[] = [];
  const usedPitcherIds = new Set<number>();

  for (const pw of pitcherWithScores) {
    if (starters.length >= spCount) break;
    starters.push(pw.pitcher);
    usedPitcherIds.add(pw.pitcher.cardId);
  }

  const remainingPitchers = pitcherWithScores
    .filter((pw) => !usedPitcherIds.has(pw.pitcher.cardId))
    .sort((a, b) => b.relieverScore - a.relieverScore);

  const relievers: PitcherCard[] = [];
  for (const pw of remainingPitchers) {
    if (relievers.length >= rpCount) break;
    relievers.push(pw.pitcher);
    usedPitcherIds.add(pw.pitcher.cardId);
  }

  const positionOrder: FieldingPosition[] = [
    "C",
    "SS",
    "2B",
    "3B",
    "1B",
    "CF",
    "LF",
    "RF",
  ];

  function hitterCompositeScore(
    card: HitterCard,
    pos: FieldingPosition,
    side: "vL" | "vR",
  ): number {
    if (!card.defense) return 0;
    const posRating = getPosRating(card.defense, pos);
    if (posRating === 0) return -1;

    const splitScore =
      side === "vL"
        ? (card.vLScore ?? card.rankScore ?? 0)
        : (card.vRScore ?? card.rankScore ?? 0);
    const defWeight =
      settings.defenseWeights[pos] ?? DEFAULT_DEFENSE_WEIGHTS[pos] ?? 0.25;
    return splitScore * (1 - defWeight) + posRating * defWeight;
  }

  function dhScore(card: HitterCard, side: "vL" | "vR"): number {
    return side === "vL"
      ? (card.vLScore ?? card.rankScore ?? 0)
      : (card.vRScore ?? card.rankScore ?? 0);
  }

  const usedHitterIds = new Set<number>();

  const vRAssignments = new Map<FieldingPosition | "DH", HitterCard>();
  for (const pos of positionOrder) {
    const candidates = hitterPool
      .filter((h) => !usedHitterIds.has(h.cardId))
      .map((h) => ({ card: h, score: hitterCompositeScore(h, pos, "vR") }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      vRAssignments.set(pos, candidates[0].card);
      usedHitterIds.add(candidates[0].card.cardId);
    }
  }

  if (era.dhEnabled) {
    const dhCandidates = hitterPool
      .filter((h) => !usedHitterIds.has(h.cardId))
      .map((h) => ({ card: h, score: dhScore(h, "vR") }))
      .sort((a, b) => b.score - a.score);

    if (dhCandidates.length > 0) {
      vRAssignments.set("DH", dhCandidates[0].card);
      usedHitterIds.add(dhCandidates[0].card.cardId);
    }
  }

  const usedHitterIdsVL = new Set<number>();
  const vLAssignments = new Map<FieldingPosition | "DH", HitterCard>();

  for (const pos of positionOrder) {
    const candidates = hitterPool
      .filter((h) => !usedHitterIdsVL.has(h.cardId))
      .map((h) => ({ card: h, score: hitterCompositeScore(h, pos, "vL") }))
      .filter((x) => x.score >= 0)
      .sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      vLAssignments.set(pos, candidates[0].card);
      usedHitterIdsVL.add(candidates[0].card.cardId);
    }
  }

  if (era.dhEnabled) {
    const dhCandidates = hitterPool
      .filter((h) => !usedHitterIdsVL.has(h.cardId))
      .map((h) => ({ card: h, score: dhScore(h, "vL") }))
      .sort((a, b) => b.score - a.score);

    if (dhCandidates.length > 0) {
      vLAssignments.set("DH", dhCandidates[0].card);
      usedHitterIdsVL.add(dhCandidates[0].card.cardId);
    }
  }

  const allPositions: (FieldingPosition | "DH")[] = era.dhEnabled
    ? [...positionOrder, "DH"]
    : positionOrder;

  const allUniqueHitterIds = new Set<number>();
  for (const pos of allPositions) {
    const vr = vRAssignments.get(pos);
    const vl = vLAssignments.get(pos);
    if (vr) allUniqueHitterIds.add(vr.cardId);
    if (vl) allUniqueHitterIds.add(vl.cardId);
  }

  const maxHitters = era.totalHitters;
  if (allUniqueHitterIds.size > maxHitters) {
    type PosScore = {
      pos: FieldingPosition | "DH";
      combinedScore: number;
    };
    const posScores: PosScore[] = [];

    for (const pos of allPositions) {
      const vr = vRAssignments.get(pos);
      const vl = vLAssignments.get(pos);
      const vrScore =
        pos === "DH"
          ? vr
            ? dhScore(vr, "vR")
            : 0
          : vr
            ? hitterCompositeScore(vr, pos as FieldingPosition, "vR")
            : 0;
      const vlScore =
        pos === "DH"
          ? vl
            ? dhScore(vl, "vL")
            : 0
          : vl
            ? hitterCompositeScore(vl, pos as FieldingPosition, "vL")
            : 0;
      posScores.push({ pos, combinedScore: vrScore + vlScore });
    }

    posScores.sort((a, b) => a.combinedScore - b.combinedScore);

    for (const ps of posScores) {
      if (allUniqueHitterIds.size <= maxHitters) break;
      const vr = vRAssignments.get(ps.pos);
      const vl = vLAssignments.get(ps.pos);
      if (vr && vl && vr.cardId !== vl.cardId) {
        const vrScore =
          ps.pos === "DH"
            ? dhScore(vr, "vR")
            : hitterCompositeScore(vr, ps.pos as FieldingPosition, "vR");
        const vlScore =
          ps.pos === "DH"
            ? dhScore(vl, "vL")
            : hitterCompositeScore(vl, ps.pos as FieldingPosition, "vL");

        if (vrScore >= vlScore) {
          vLAssignments.set(ps.pos, vr);
          allUniqueHitterIds.delete(vl.cardId);
        } else {
          vRAssignments.set(ps.pos, vl);
          allUniqueHitterIds.delete(vr.cardId);
        }
      }
    }
  }

  const starterIds = new Set<number>();
  for (const pos of allPositions) {
    const vr = vRAssignments.get(pos);
    const vl = vLAssignments.get(pos);
    if (vr) starterIds.add(vr.cardId);
    if (vl) starterIds.add(vl.cardId);
  }

  const positions: PositionAssignment[] = [];
  for (const pos of allPositions) {
    const vRStarter = vRAssignments.get(pos) ?? null;
    const vLStarter = vLAssignments.get(pos) ?? null;

    const backups: HitterCard[] = [];
    let defensiveSub: HitterCard | null = null;

    if (pos !== "DH") {
      const fp = pos as FieldingPosition;
      const backupCandidates = hitterPool
        .filter(
          (h) =>
            starterIds.has(h.cardId) &&
            h.defense &&
            getPosRating(h.defense, fp) > 0,
        )
        .filter(
          (h) =>
            h.cardId !== vRStarter?.cardId && h.cardId !== vLStarter?.cardId,
        )
        .sort(
          (a, b) => getPosRating(b.defense!, fp) - getPosRating(a.defense!, fp),
        )
        .slice(0, 3);

      backups.push(...backupCandidates);

      if (backupCandidates.length > 0) {
        defensiveSub = backupCandidates[0];
      }
    }

    positions.push({
      position: pos,
      vRStarter,
      vLStarter,
      backups,
      defensiveSub,
    });
  }

  const remainingSlots = maxHitters - starterIds.size;
  const remainingHitters = hitterPool
    .filter((h) => !starterIds.has(h.cardId))
    .sort((a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0));

  const pinchHitters: HitterCard[] = [];
  const pinchRunners: HitterCard[] = [];

  const availableForPinch = remainingHitters.slice(
    0,
    Math.max(0, remainingSlots),
  );

  const pinchHitterCount = Math.ceil(availableForPinch.length / 2);
  const pinchRunnerCount = availableForPinch.length - pinchHitterCount;

  const sortedByRank = [...availableForPinch].sort(
    (a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0),
  );
  const sortedBySpeed = [...availableForPinch].sort(
    (a, b) => (b.rankScore ?? 0) - (a.rankScore ?? 0),
  );

  const usedPinchIds = new Set<number>();
  for (const h of sortedByRank) {
    if (pinchHitters.length >= pinchHitterCount) break;
    pinchHitters.push(h);
    usedPinchIds.add(h.cardId);
  }
  for (const h of sortedBySpeed) {
    if (pinchRunners.length >= pinchRunnerCount) break;
    if (!usedPinchIds.has(h.cardId)) {
      pinchRunners.push(h);
    }
  }

  const totalPlayers =
    starters.length +
    relievers.length +
    starterIds.size +
    pinchHitters.length +
    pinchRunners.length;

  if (starters.length < spCount) {
    validationErrors.push(
      `Not enough starting pitchers: found ${starters.length}, need ${spCount}`,
    );
  }
  if (starters.length + relievers.length < era.totalPitchers) {
    validationErrors.push(
      `Not enough pitchers: found ${starters.length + relievers.length}, need ${era.totalPitchers}`,
    );
  }
  for (const pos of allPositions) {
    const assignment = positions.find((p) => p.position === pos);
    if (!assignment?.vRStarter) {
      validationErrors.push(`No vR starter assigned for position ${pos}`);
    }
  }

  return {
    rosterTypeId: rosterTypeMaxTier ?? "league",
    eraId: era.id,
    starters,
    relievers,
    positions,
    pinchHitters,
    pinchRunners,
    totalPlayers,
    validationErrors,
  };
}
