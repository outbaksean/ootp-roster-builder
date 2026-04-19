import Dexie from "dexie";
import type { HitterCard, PitcherCard } from "@/models/types";

export class OOTPRosterBuilderDB extends Dexie {
  hitterCards!: Dexie.Table<HitterCard, number>;
  pitcherCards!: Dexie.Table<PitcherCard, number>;

  constructor() {
    super("OOTPRosterBuilderDB");
    this.version(1).stores({
      hitterCards: "cardId, overall, tier, owned",
      pitcherCards: "cardId, overall, tier, owned",
    });
    // v2: model fields changed; clear stale data on upgrade
    this.version(2)
      .stores({
        hitterCards: "cardId, overall, tier, owned",
        pitcherCards: "cardId, overall, tier, owned",
      })
      .upgrade(async (tx) => {
        await tx.table("hitterCards").clear();
        await tx.table("pitcherCards").clear();
      });
  }
}

const db = new OOTPRosterBuilderDB();
export default db;
