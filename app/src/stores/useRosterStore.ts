import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type {
  Roster,
  LineupConfig,
  DepthSlot,
  HitterPosition,
  BullpenRole,
  SecondaryRole,
  RpUsage,
  UtilityStarts,
} from "@/models/types";
import { ERAS, ROSTER_TYPES, ALL_HITTER_POSITIONS } from "@/models/types";

const ROSTER_KEY = "ootp-rb-roster";

// ── Active slot descriptor ───────────────────────────────────────────────────

export type ActiveSlot =
  | { kind: "sp"; order: number }
  | { kind: "rp"; order: number }
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
    battingOrder: Array(9).fill(null),
    depth,
    pinchHitters: [null, null, null, null],
    pinchRunners: [null, null, null, null],
  };
}

function defaultRoster(): Roster {
  return {
    rosterPitcherIds: Array(12).fill(null),
    rosterHitterIds: Array(14).fill(null),
    pitchers: [],
    lineupVR: emptyLineupConfig(),
    lineupVL: emptyLineupConfig(),
    rosterTypeId: "league",
    eraId: "standard",
    spCount: 5,
  };
}

function migrateRoster(r: Roster): Roster {
  if (r.spCount == null) r.spCount = 5;
  for (const p of r.pitchers) {
    if (!p.secondaryRole) p.secondaryRole = "None" as const;
    if (!p.usage) p.usage = "NormalUsage" as const;
  }
  for (const side of ["lineupVR", "lineupVL"] as const) {
    const lu = r[side] as unknown as Record<string, unknown>;
    if (!lu.battingOrder) {
      lu.battingOrder = Array(9).fill(null);
      const oldSlots = lu.slots as
        | { position: HitterPosition | null }[]
        | undefined;
      if (oldSlots) {
        oldSlots.forEach((s, i) => {
          if (s.position)
            (lu.battingOrder as (HitterPosition | null)[])[i] = s.position;
        });
        delete lu.slots;
      }
    }
  }
  if (!r.rosterPitcherIds) {
    const existing = [...new Set(r.pitchers.map((p) => p.cardId))];
    const padded: (number | null)[] = [
      ...existing,
      ...Array(12).fill(null),
    ].slice(0, 12);
    r.rosterPitcherIds = padded;
  }
  if (!r.rosterHitterIds) {
    const seen = new Set<number>();
    for (const side of [r.lineupVR, r.lineupVL]) {
      for (const d of Object.values(side.depth) as DepthSlot[]) {
        if (d.depthStarterCardId != null) seen.add(d.depthStarterCardId);
        if (d.utility1CardId != null) seen.add(d.utility1CardId);
        if (d.utility2CardId != null) seen.add(d.utility2CardId);
        if (d.defSubCardId != null) seen.add(d.defSubCardId);
      }
      for (const id of side.pinchHitters) if (id != null) seen.add(id);
      for (const id of side.pinchRunners) if (id != null) seen.add(id);
    }
    const ids = [...seen];
    const padded: (number | null)[] = [...ids, ...Array(14).fill(null)].slice(
      0,
      14,
    );
    r.rosterHitterIds = padded;
  }
  return r;
}

function loadRoster(): Roster {
  try {
    const raw = localStorage.getItem(ROSTER_KEY);
    if (raw) return migrateRoster(JSON.parse(raw) as Roster);
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

  const rosterPitcherIdSet = computed(
    () =>
      new Set(
        roster.value.rosterPitcherIds.filter((id): id is number => id !== null),
      ),
  );
  const rosterHitterIdSet = computed(
    () =>
      new Set(
        roster.value.rosterHitterIds.filter((id): id is number => id !== null),
      ),
  );

  const totalPlayers = computed(
    () => rosterPitcherIdSet.value.size + rosterHitterIdSet.value.size,
  );

  function persist() {
    saveRoster(roster.value);
  }

  // ── Active slot ────────────────────────────────────────────────────────────

  function setActiveSlot(slot: ActiveSlot | null) {
    activeSlot.value = slot;
  }

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
    else if (slot.kind === "depth")
      assignDepthSlot(slot.side, slot.position, slot.slot, cardId);
    else if (slot.kind === "pinchHitter")
      assignBenchSlot(slot.side, "pinchHitter", slot.order, cardId);
    else if (slot.kind === "pinchRunner")
      assignBenchSlot(slot.side, "pinchRunner", slot.order, cardId);
  }

  // ── Roster membership ──────────────────────────────────────────────────────

  function addToRoster(cardId: number, type: "pitcher" | "hitter" | "twoWay") {
    if (type === "pitcher" || type === "twoWay") {
      if (!rosterPitcherIdSet.value.has(cardId)) {
        const ids = [...roster.value.rosterPitcherIds];
        const idx = ids.findIndex((id) => id === null);
        if (idx !== -1) {
          ids[idx] = cardId;
          roster.value = { ...roster.value, rosterPitcherIds: ids };
        }
      }
    }
    if (type === "hitter" || type === "twoWay") {
      if (!rosterHitterIdSet.value.has(cardId)) {
        const ids = [...roster.value.rosterHitterIds];
        const idx = ids.findIndex((id) => id === null);
        if (idx !== -1) {
          ids[idx] = cardId;
          roster.value = { ...roster.value, rosterHitterIds: ids };
        }
      }
    }
    persist();
  }

  function removeFromRoster(cardId: number) {
    const rosterPitcherIds = roster.value.rosterPitcherIds.map((id) =>
      id === cardId ? null : id,
    );
    const rosterHitterIds = roster.value.rosterHitterIds.map((id) =>
      id === cardId ? null : id,
    );
    const pitchers = roster.value.pitchers.filter((p) => p.cardId !== cardId);

    function clearFromLineup(lineup: LineupConfig): LineupConfig {
      const battingOrder = [...lineup.battingOrder];
      const depth = {} as Record<HitterPosition, DepthSlot>;
      for (const pos of ALL_HITTER_POSITIONS) {
        const d = { ...lineup.depth[pos] };
        if (d.depthStarterCardId === cardId) {
          d.depthStarterCardId = null;
          const idx = battingOrder.indexOf(pos);
          if (idx !== -1) battingOrder[idx] = null;
        }
        if (d.utility1CardId === cardId) d.utility1CardId = null;
        if (d.utility2CardId === cardId) d.utility2CardId = null;
        if (d.defSubCardId === cardId) d.defSubCardId = null;
        depth[pos] = d;
      }
      const pinchHitters = lineup.pinchHitters.map((id) =>
        id === cardId ? null : id,
      );
      const pinchRunners = lineup.pinchRunners.map((id) =>
        id === cardId ? null : id,
      );
      return { battingOrder, depth, pinchHitters, pinchRunners };
    }

    roster.value = {
      ...roster.value,
      rosterPitcherIds,
      rosterHitterIds,
      pitchers,
      lineupVR: clearFromLineup(roster.value.lineupVR),
      lineupVL: clearFromLineup(roster.value.lineupVL),
    };
    persist();
  }

  const spCount = computed(() => roster.value.spCount);

  // ── Settings ───────────────────────────────────────────────────────────────

  function setRosterType(id: string) {
    roster.value = { ...roster.value, rosterTypeId: id };
    persist();
  }

  function setSpCount(n: number) {
    const clamped = Math.max(4, Math.min(6, n));
    const newRpCount = era.value.totalPitchers - clamped;
    const pitchers = roster.value.pitchers.filter(
      (p) =>
        !(p.role === "SP" && p.order > clamped) &&
        !(p.role === "RP" && p.order > newRpCount),
    );
    roster.value = { ...roster.value, spCount: clamped, pitchers };
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
      secondaryRole: existing?.secondaryRole ?? "None",
      usage: existing?.usage ?? "NormalUsage",
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
    const rpCount = era.value.totalPitchers - roster.value.spCount;
    const max = role === "SP" ? roster.value.spCount : rpCount;
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

  function setSecondaryRole(cardId: number, secondaryRole: SecondaryRole) {
    const pitchers = roster.value.pitchers.map((p) =>
      p.cardId === cardId ? { ...p, secondaryRole } : p,
    );
    roster.value = { ...roster.value, pitchers };
    persist();
  }

  function setRpUsage(cardId: number, usage: RpUsage) {
    const pitchers = roster.value.pitchers.map((p) =>
      p.cardId === cardId ? { ...p, usage } : p,
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
    if (slot === "depth") {
      pos.depthStarterCardId = cardId;
      const battingOrder = [...lineup.battingOrder];
      if (!battingOrder.includes(position)) {
        const emptyIdx = battingOrder.indexOf(null);
        if (emptyIdx !== -1) battingOrder[emptyIdx] = position;
      }
      lineup.battingOrder = battingOrder;
    } else if (slot === "utility1") {
      pos.utility1CardId = cardId;
    } else if (slot === "utility2") {
      pos.utility2CardId = cardId;
    } else {
      pos.defSubCardId = cardId;
    }
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
    if (slot === "depth") {
      pos.depthStarterCardId = null;
      lineup.battingOrder = lineup.battingOrder.map((p) =>
        p === position ? null : p,
      );
    } else if (slot === "utility1") {
      pos.utility1CardId = null;
    } else if (slot === "utility2") {
      pos.utility2CardId = null;
    } else {
      pos.defSubCardId = null;
    }
    depth[position] = pos;
    lineup.depth = depth;
    setLineup(side, lineup);
  }

  function reorderBattingOrder(
    side: "vr" | "vl",
    fromIdx: number,
    toIdx: number,
  ) {
    const lineup = { ...getLineup(side) };
    const order = [...lineup.battingOrder];
    const [item] = order.splice(fromIdx, 1);
    order.splice(toIdx, 0, item);
    lineup.battingOrder = order;
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

  function clearRoster() {
    roster.value = {
      ...roster.value,
      rosterPitcherIds: Array(12).fill(null),
      rosterHitterIds: Array(14).fill(null),
      pitchers: [],
      lineupVR: emptyLineupConfig(),
      lineupVL: emptyLineupConfig(),
    };
    activeSlot.value = null;
    persist();
  }

  return {
    roster,
    activeSlot,
    activeSlotType,
    era,
    spCount,
    rosterType,
    starters,
    relievers,
    rosterPitcherIdSet,
    rosterHitterIdSet,
    totalPlayers,
    setActiveSlot,
    assignToActiveSlot,
    addToRoster,
    removeFromRoster,
    setRosterType,
    setSpCount,
    assignPitcher,
    clearPitcherSlot,
    movePitcher,
    setBullpenRole,
    setSecondaryRole,
    setRpUsage,
    getLineup,
    assignDepthSlot,
    clearDepthSlot,
    reorderBattingOrder,
    setUtilityStarts,
    assignBenchSlot,
    clearBenchSlot,
    resetRoster,
    clearRoster,
  };
});
