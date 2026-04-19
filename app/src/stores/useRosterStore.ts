import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  Roster,
  LineupConfig,
  DepthSlot,
  HitterPosition,
  BullpenRole,
  UtilityStarts,
} from "@/models/types";
import { ERAS, ROSTER_TYPES, ALL_HITTER_POSITIONS } from "@/models/types";

const ROSTER_KEY = "ootp-rb-roster";

// ── Active slot descriptor ───────────────────────────────────────────────────

export type ActiveSlot =
  | { kind: "sp"; order: number }
  | { kind: "rp"; order: number }
  | { kind: "lineup"; side: "vr" | "vl"; order: number }
  | {
      kind: "depth";
      side: "vr" | "vl";
      position: HitterPosition;
      slot: "depth" | "utility1" | "utility2" | "defSub";
    }
  | { kind: "pinchHitter"; side: "vr" | "vl"; order: number }
  | { kind: "pinchRunner"; side: "vr" | "vl"; order: number };

// ── Roster factory helpers ───────────────────────────────────────────────────

function emptyDepthSlot(): DepthSlot {
  return {
    depthStarterCardId: null,
    utility1CardId: null,
    utility1Starts: "IfStarterTired",
    utility2CardId: null,
    utility2Starts: "IfStarterTired",
    defSubCardId: null,
  };
}

function emptyLineupConfig(): LineupConfig {
  const depth = {} as Record<HitterPosition, DepthSlot>;
  for (const pos of ALL_HITTER_POSITIONS) {
    depth[pos] = emptyDepthSlot();
  }
  return {
    slots: Array.from({ length: 9 }, () => ({ cardId: null, position: null })),
    depth,
    pinchHitters: [null, null, null, null],
    pinchRunners: [null, null, null, null],
  };
}

function defaultRoster(): Roster {
  return {
    pitchers: [],
    lineupVR: emptyLineupConfig(),
    lineupVL: emptyLineupConfig(),
    rosterTypeId: "league",
    eraId: "standard",
  };
}

function loadRoster(): Roster {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (raw) return JSON.parse(raw) as Roster;
  } catch {
    /* ignore */
  }
  return defaultRoster();
}

function saveRoster(r: Roster) {
  localStorage.setItem(ROSTER_KEY, JSON.stringify(r));
}

// ── Store ────────────────────────────────────────────────────────────────────

export const useRosterStore = defineStore("roster", () => {
  const roster = ref<Roster>(loadRoster());
  const activeSlot = ref<ActiveSlot | null>(null);

  const era = computed(
    () => ERAS.find((e) => e.id === roster.value.eraId) ?? ERAS[0],
  );
  const rosterType = computed(
    () =>
      ROSTER_TYPES.find((r) => r.id === roster.value.rosterTypeId) ??
      ROSTER_TYPES[0],
  );

  const starters = computed(() =>
    roster.value.pitchers
      .filter((p) => p.role === "SP")
      .sort((a, b) => a.order - b.order),
  );
  const relievers = computed(() =>
    roster.value.pitchers
      .filter((p) => p.role === "RP")
      .sort((a, b) => a.order - b.order),
  );

  // All unique cardIds placed anywhere in the roster
  const assignedCardIds = computed(() => {
    const ids = new Set<number>();
    for (const p of roster.value.pitchers) ids.add(p.cardId);
    for (const side of [roster.value.lineupVR, roster.value.lineupVL]) {
      for (const s of side.slots) if (s.cardId != null) ids.add(s.cardId);
      for (const d of Object.values(side.depth)) {
        if (d.depthStarterCardId != null) ids.add(d.depthStarterCardId);
        if (d.utility1CardId != null) ids.add(d.utility1CardId);
        if (d.utility2CardId != null) ids.add(d.utility2CardId);
        if (d.defSubCardId != null) ids.add(d.defSubCardId);
      }
      for (const id of side.pinchHitters) if (id != null) ids.add(id);
      for (const id of side.pinchRunners) if (id != null) ids.add(id);
    }
    return ids;
  });

  const totalPlayers = computed(() => assignedCardIds.value.size);

  function persist() {
    saveRoster(roster.value);
  }

  // ── Active slot ────────────────────────────────────────────────────────────

  function setActiveSlot(slot: ActiveSlot | null) {
    activeSlot.value = slot;
  }

  // What card type does the active slot expect? Drives table filtering.
  const activeSlotType = computed<"pitcher" | "hitter" | null>(() => {
    if (!activeSlot.value) return null;
    return activeSlot.value.kind === "sp" || activeSlot.value.kind === "rp"
      ? "pitcher"
      : "hitter";
  });

  // ── Assign to active slot ─────────────────────────────────────────────────

  function assignToActiveSlot(cardId: number) {
    const slot = activeSlot.value;
    if (!slot) return;
    if (slot.kind === "sp") assignPitcher(cardId, "SP", slot.order);
    else if (slot.kind === "rp") assignPitcher(cardId, "RP", slot.order);
    else if (slot.kind === "lineup")
      assignLineupSlot(slot.side, slot.order, cardId);
    else if (slot.kind === "depth")
      assignDepthSlot(slot.side, slot.position, slot.slot, cardId);
    else if (slot.kind === "pinchHitter")
      assignBenchSlot(slot.side, "pinchHitter", slot.order, cardId);
    else if (slot.kind === "pinchRunner")
      assignBenchSlot(slot.side, "pinchRunner", slot.order, cardId);
  }

  // ── Settings ───────────────────────────────────────────────────────────────

  function setRosterType(id: string) {
    roster.value = { ...roster.value, rosterTypeId: id };
    persist();
  }

  // ── Pitching staff ─────────────────────────────────────────────────────────

  function assignPitcher(cardId: number, role: "SP" | "RP", order: number) {
    let pitchers = roster.value.pitchers.filter((p) => p.cardId !== cardId);
    pitchers = pitchers.filter((p) => !(p.role === role && p.order === order));
    const existing = roster.value.pitchers.find(
      (p) => p.role === role && p.order === order,
    );
    pitchers.push({
      cardId,
      role,
      order,
      bullpenRole: existing?.bullpenRole ?? "MiddleRelief",
    });
    roster.value = { ...roster.value, pitchers };
    persist();
  }

  function clearPitcherSlot(role: "SP" | "RP", order: number) {
    roster.value = {
      ...roster.value,
      pitchers: roster.value.pitchers.filter(
        (p) => !(p.role === role && p.order === order),
      ),
    };
    persist();
  }

  function movePitcher(
    role: "SP" | "RP",
    fromOrder: number,
    dir: "up" | "down",
  ) {
    const toOrder = dir === "up" ? fromOrder - 1 : fromOrder + 1;
    const rpCount = era.value.totalPitchers - era.value.spCount;
    const max = role === "SP" ? era.value.spCount : rpCount;
    if (toOrder < 1 || toOrder > max) return;
    const pitchers = roster.value.pitchers.map((p) => {
      if (p.role === role && p.order === fromOrder)
        return { ...p, order: toOrder };
      if (p.role === role && p.order === toOrder)
        return { ...p, order: fromOrder };
      return p;
    });
    roster.value = { ...roster.value, pitchers };
    persist();
  }

  function setBullpenRole(cardId: number, bullpenRole: BullpenRole) {
    const pitchers = roster.value.pitchers.map((p) =>
      p.cardId === cardId ? { ...p, bullpenRole } : p,
    );
    roster.value = { ...roster.value, pitchers };
    persist();
  }

  // ── Lineup ─────────────────────────────────────────────────────────────────

  function getLineup(side: "vr" | "vl"): LineupConfig {
    return side === "vr" ? roster.value.lineupVR : roster.value.lineupVL;
  }

  function setLineup(side: "vr" | "vl", lineup: LineupConfig) {
    roster.value =
      side === "vr"
        ? { ...roster.value, lineupVR: lineup }
        : { ...roster.value, lineupVL: lineup };
    persist();
  }

  function assignLineupSlot(side: "vr" | "vl", order: number, cardId: number) {
    const lineup = { ...getLineup(side) };
    lineup.slots = lineup.slots.map((s, i) =>
      i === order - 1 ? { ...s, cardId } : s,
    );
    setLineup(side, lineup);
  }

  function clearLineupSlot(side: "vr" | "vl", order: number) {
    const lineup = { ...getLineup(side) };
    lineup.slots = lineup.slots.map((s, i) =>
      i === order - 1 ? { cardId: null, position: null } : s,
    );
    setLineup(side, lineup);
  }

  function setLineupPosition(
    side: "vr" | "vl",
    order: number,
    position: HitterPosition | null,
  ) {
    const lineup = { ...getLineup(side) };
    lineup.slots = lineup.slots.map((s, i) =>
      i === order - 1 ? { ...s, position } : s,
    );
    setLineup(side, lineup);
  }

  function moveLineupSlot(
    side: "vr" | "vl",
    fromOrder: number,
    dir: "up" | "down",
  ) {
    const toOrder = dir === "up" ? fromOrder - 1 : fromOrder + 1;
    if (toOrder < 1 || toOrder > 9) return;
    const lineup = { ...getLineup(side) };
    const slots = [...lineup.slots];
    [slots[fromOrder - 1], slots[toOrder - 1]] = [
      slots[toOrder - 1],
      slots[fromOrder - 1],
    ];
    lineup.slots = slots;
    setLineup(side, lineup);
  }

  // ── Depth chart ────────────────────────────────────────────────────────────

  function assignDepthSlot(
    side: "vr" | "vl",
    position: HitterPosition,
    slot: "depth" | "utility1" | "utility2" | "defSub",
    cardId: number,
  ) {
    const lineup = { ...getLineup(side) };
    const depth = { ...lineup.depth };
    const pos = { ...depth[position] };
    if (slot === "depth") pos.depthStarterCardId = cardId;
    else if (slot === "utility1") pos.utility1CardId = cardId;
    else if (slot === "utility2") pos.utility2CardId = cardId;
    else pos.defSubCardId = cardId;
    depth[position] = pos;
    lineup.depth = depth;
    setLineup(side, lineup);
  }

  function clearDepthSlot(
    side: "vr" | "vl",
    position: HitterPosition,
    slot: "depth" | "utility1" | "utility2" | "defSub",
  ) {
    const lineup = { ...getLineup(side) };
    const depth = { ...lineup.depth };
    const pos = { ...depth[position] };
    if (slot === "depth") pos.depthStarterCardId = null;
    else if (slot === "utility1") pos.utility1CardId = null;
    else if (slot === "utility2") pos.utility2CardId = null;
    else pos.defSubCardId = null;
    depth[position] = pos;
    lineup.depth = depth;
    setLineup(side, lineup);
  }

  function setUtilityStarts(
    side: "vr" | "vl",
    position: HitterPosition,
    slot: "utility1" | "utility2",
    starts: UtilityStarts,
  ) {
    const lineup = { ...getLineup(side) };
    const depth = { ...lineup.depth };
    const pos = { ...depth[position] };
    if (slot === "utility1") pos.utility1Starts = starts;
    else pos.utility2Starts = starts;
    depth[position] = pos;
    lineup.depth = depth;
    setLineup(side, lineup);
  }

  // ── Bench ──────────────────────────────────────────────────────────────────

  function assignBenchSlot(
    side: "vr" | "vl",
    type: "pinchHitter" | "pinchRunner",
    order: number,
    cardId: number,
  ) {
    const lineup = { ...getLineup(side) };
    if (type === "pinchHitter") {
      const arr = [...lineup.pinchHitters];
      arr[order - 1] = cardId;
      lineup.pinchHitters = arr;
    } else {
      const arr = [...lineup.pinchRunners];
      arr[order - 1] = cardId;
      lineup.pinchRunners = arr;
    }
    setLineup(side, lineup);
  }

  function clearBenchSlot(
    side: "vr" | "vl",
    type: "pinchHitter" | "pinchRunner",
    order: number,
  ) {
    const lineup = { ...getLineup(side) };
    if (type === "pinchHitter") {
      const arr = [...lineup.pinchHitters];
      arr[order - 1] = null;
      lineup.pinchHitters = arr;
    } else {
      const arr = [...lineup.pinchRunners];
      arr[order - 1] = null;
      lineup.pinchRunners = arr;
    }
    setLineup(side, lineup);
  }

  // ── Reset ──────────────────────────────────────────────────────────────────

  function resetRoster() {
    roster.value = defaultRoster();
    activeSlot.value = null;
    persist();
  }

  return {
    roster,
    activeSlot,
    activeSlotType,
    era,
    rosterType,
    starters,
    relievers,
    assignedCardIds,
    totalPlayers,
    setActiveSlot,
    assignToActiveSlot,
    setRosterType,
    assignPitcher,
    clearPitcherSlot,
    movePitcher,
    setBullpenRole,
    getLineup,
    assignLineupSlot,
    clearLineupSlot,
    setLineupPosition,
    moveLineupSlot,
    assignDepthSlot,
    clearDepthSlot,
    setUtilityStarts,
    assignBenchSlot,
    clearBenchSlot,
    resetRoster,
  };
});
