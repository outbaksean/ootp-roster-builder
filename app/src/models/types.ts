export type FieldingPosition =
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF";
export type HitterPosition = FieldingPosition | "DH";
export type PitcherHand = "L" | "R";
export type BatterHand = "L" | "R" | "S";
export type CardTier =
  | "Iron"
  | "Bronze"
  | "Silver"
  | "Gold"
  | "Diamond"
  | "Perfect";
export type BullpenRole =
  | "Closer"
  | "MiddleRelief"
  | "LongRelief"
  | "Specialist";
export type UtilityStarts =
  | "IfStarterTired"
  | "Every3rdGame"
  | "Every5thGame"
  | "Never";

export const FIELDING_POSITIONS: FieldingPosition[] = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
];
export const ALL_HITTER_POSITIONS: HitterPosition[] = [
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
];

export const BULLPEN_ROLE_LABELS: Record<BullpenRole, string> = {
  Closer: "Closer",
  MiddleRelief: "Middle Relief",
  LongRelief: "Long Relief",
  Specialist: "Specialist",
};

export const UTILITY_STARTS_LABELS: Record<UtilityStarts, string> = {
  IfStarterTired: "If Starter Tired",
  Every3rdGame: "Every 3rd Game",
  Every5thGame: "Every 5th Game",
  Never: "Never",
};

export function getTier(overall: number): CardTier {
  if (overall < 60) return "Iron";
  if (overall < 70) return "Bronze";
  if (overall < 80) return "Silver";
  if (overall < 90) return "Gold";
  if (overall < 100) return "Diamond";
  return "Perfect";
}

export type DefenseRatings = {
  posRatingC: number;
  posRating1B: number;
  posRating2B: number;
  posRating3B: number;
  posRatingSS: number;
  posRatingLF: number;
  posRatingCF: number;
  posRatingRF: number;
};

export function getPosRating(
  defense: DefenseRatings,
  pos: FieldingPosition,
): number {
  const map: Record<FieldingPosition, number> = {
    C: defense.posRatingC,
    "1B": defense.posRating1B,
    "2B": defense.posRating2B,
    "3B": defense.posRating3B,
    SS: defense.posRatingSS,
    LF: defense.posRatingLF,
    CF: defense.posRatingCF,
    RF: defense.posRatingRF,
  };
  return map[pos];
}

export type HitterCard = {
  cardId: number;
  name: string;
  cardTitle: string;
  overall: number;
  tier: CardTier;
  bats: BatterHand | null;
  vLScore: number;
  vRScore: number;
  contactVL: number;
  gapVL: number;
  powerVL: number;
  eyeVL: number;
  avoidKVL: number;
  contactVR: number;
  gapVR: number;
  powerVR: number;
  eyeVR: number;
  avoidKVR: number;
  defense: DefenseRatings;
  owned: boolean;
  sellOrderLow: number;
  last10Price: number;
};

export type PitcherCard = {
  cardId: number;
  name: string;
  cardTitle: string;
  overall: number;
  tier: CardTier;
  throws: PitcherHand | null;
  pitcherRoleCode: number;
  stamina: number;
  owned: boolean;
  sellOrderLow: number;
  last10Price: number;
};

export type RosterType = {
  id: string;
  label: string;
  maxTier: CardTier | null;
};

export const ROSTER_TYPES: RosterType[] = [
  { id: "league", label: "League", maxTier: null },
  { id: "iron", label: "Iron", maxTier: "Iron" },
  { id: "bronze", label: "Bronze", maxTier: "Bronze" },
  { id: "silver", label: "Silver", maxTier: "Silver" },
  { id: "gold", label: "Gold", maxTier: "Gold" },
  { id: "diamond", label: "Diamond", maxTier: "Diamond" },
];

export const TIER_ORDER: CardTier[] = [
  "Iron",
  "Bronze",
  "Silver",
  "Gold",
  "Diamond",
  "Perfect",
];

export function isTierEligible(
  cardTier: CardTier,
  maxTier: CardTier | null,
): boolean {
  if (maxTier === null) return true;
  return TIER_ORDER.indexOf(cardTier) <= TIER_ORDER.indexOf(maxTier);
}

export type Era = {
  id: string;
  label: string;
  spCount: number;
  totalPitchers: number;
  dhEnabled: boolean;
  totalHitters: number;
};

export const ERAS: Era[] = [
  {
    id: "standard",
    label: "Standard (MLB 2025)",
    spCount: 5,
    totalPitchers: 12,
    dhEnabled: true,
    totalHitters: 14,
  },
];

// ── Roster data model ────────────────────────────────────────────────────────

export type RosterPitcher = {
  cardId: number;
  role: "SP" | "RP";
  order: number;
  bullpenRole: BullpenRole;
};

export type DepthSlot = {
  depthStarterCardId: number | null;
  utility1CardId: number | null;
  utility1Starts: UtilityStarts;
  utility2CardId: number | null;
  utility2Starts: UtilityStarts;
  defSubCardId: number | null;
};

export type LineupSlot = {
  cardId: number | null;
  position: HitterPosition | null;
};

export type LineupConfig = {
  slots: LineupSlot[];
  depth: Record<HitterPosition, DepthSlot>;
  pinchHitters: (number | null)[];
  pinchRunners: (number | null)[];
};

export type Roster = {
  pitchers: RosterPitcher[];
  lineupVR: LineupConfig;
  lineupVL: LineupConfig;
  rosterTypeId: string;
  eraId: string;
};
