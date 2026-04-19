<script setup lang="ts">
import { computed } from "vue";
import { useRosterStore } from "@/stores/useRosterStore";
import type { PositionAssignment } from "@/models/types";
import { getPosRating } from "@/models/types";

const rosterStore = useRosterStore();
const roster = computed(() => rosterStore.currentRoster);

function backupNames(assignment: PositionAssignment): string {
  if (assignment.position === "DH") return "";
  return assignment.backups
    .map((b) => {
      const rating = b.defense
        ? getPosRating(
            b.defense,
            assignment.position as import("@/models/types").FieldingPosition,
          )
        : 0;
      return `${b.name} (${rating})`;
    })
    .join(", ");
}

const unownedCount = computed(() => {
  if (!roster.value) return 0;
  const pitcherUnowned = [
    ...roster.value.starters,
    ...roster.value.relievers,
  ].filter((p) => !p.owned).length;
  const hitterIds = new Set<number>();
  let hitterUnowned = 0;
  for (const pos of roster.value.positions) {
    if (pos.vRStarter && !hitterIds.has(pos.vRStarter.cardId)) {
      if (!pos.vRStarter.owned) hitterUnowned++;
      hitterIds.add(pos.vRStarter.cardId);
    }
    if (pos.vLStarter && !hitterIds.has(pos.vLStarter.cardId)) {
      if (!pos.vLStarter.owned) hitterUnowned++;
      hitterIds.add(pos.vLStarter.cardId);
    }
  }
  for (const h of roster.value.pinchHitters) {
    if (!hitterIds.has(h.cardId)) {
      if (!h.owned) hitterUnowned++;
      hitterIds.add(h.cardId);
    }
  }
  for (const h of roster.value.pinchRunners) {
    if (!hitterIds.has(h.cardId)) {
      if (!h.owned) hitterUnowned++;
      hitterIds.add(h.cardId);
    }
  }
  return pitcherUnowned + hitterUnowned;
});
</script>

<template>
  <div v-if="roster" class="roster-view">
    <div
      v-if="roster.validationErrors.length > 0"
      class="validation-errors mb-3"
    >
      <div v-for="err in roster.validationErrors" :key="err" class="error-msg">
        {{ err }}
      </div>
    </div>

    <div class="pitching-section mb-4">
      <h5 class="section-title">Pitching Staff</h5>
      <div class="d-flex gap-3 flex-wrap">
        <div class="pitcher-table-wrap">
          <h6 class="subsection-title">Starters</h6>
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>OVR</th>
                <th>Tier</th>
                <th>Stam</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(p, i) in roster.starters"
                :key="p.cardId"
                :class="{ unowned: !p.owned }"
              >
                <td>{{ i + 1 }}</td>
                <td>{{ p.name }}</td>
                <td>{{ p.overall }}</td>
                <td>{{ p.tier }}</td>
                <td>{{ p.stamina ?? "-" }}</td>
              </tr>
              <tr v-if="roster.starters.length === 0">
                <td colspan="5" class="text-muted">No starters</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="pitcher-table-wrap">
          <h6 class="subsection-title">Relievers</h6>
          <table class="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>OVR</th>
                <th>Tier</th>
                <th>Stam</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(p, i) in roster.relievers"
                :key="p.cardId"
                :class="{ unowned: !p.owned }"
              >
                <td>{{ i + 1 }}</td>
                <td>{{ p.name }}</td>
                <td>{{ p.overall }}</td>
                <td>{{ p.tier }}</td>
                <td>{{ p.stamina ?? "-" }}</td>
              </tr>
              <tr v-if="roster.relievers.length === 0">
                <td colspan="5" class="text-muted">No relievers</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div class="hitting-section mb-4">
      <h5 class="section-title">Lineup</h5>
      <table class="data-table lineup-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th>vR Starter</th>
            <th>vL Starter</th>
            <th>Backups (rating)</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="pos in roster.positions" :key="pos.position">
            <td class="pos-cell">{{ pos.position }}</td>
            <td :class="{ unowned: pos.vRStarter && !pos.vRStarter.owned }">
              <span v-if="pos.vRStarter">
                {{ pos.vRStarter.name }}
                <span class="ovr-badge">{{ pos.vRStarter.overall }}</span>
              </span>
              <span v-else class="text-muted">-</span>
            </td>
            <td :class="{ unowned: pos.vLStarter && !pos.vLStarter.owned }">
              <span
                v-if="
                  pos.vLStarter &&
                  pos.vLStarter.cardId !== pos.vRStarter?.cardId
                "
              >
                {{ pos.vLStarter.name }}
                <span class="ovr-badge">{{ pos.vLStarter.overall }}</span>
              </span>
              <span
                v-else-if="
                  pos.vLStarter &&
                  pos.vLStarter.cardId === pos.vRStarter?.cardId
                "
                class="text-muted"
                >same</span
              >
              <span v-else class="text-muted">-</span>
            </td>
            <td class="backups-cell text-muted">{{ backupNames(pos) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="roster.pinchHitters.length > 0 || roster.pinchRunners.length > 0"
      class="bench-section mb-4"
    >
      <h5 class="section-title">Bench</h5>
      <div class="d-flex gap-3 flex-wrap">
        <div v-if="roster.pinchHitters.length > 0">
          <h6 class="subsection-title">Pinch Hitters</h6>
          <div
            v-for="h in roster.pinchHitters"
            :key="h.cardId"
            :class="['bench-player', { unowned: !h.owned }]"
          >
            {{ h.name }} <span class="ovr-badge">{{ h.overall }}</span>
          </div>
        </div>
        <div v-if="roster.pinchRunners.length > 0">
          <h6 class="subsection-title">Pinch Runners</h6>
          <div
            v-for="h in roster.pinchRunners"
            :key="h.cardId"
            :class="['bench-player', { unowned: !h.owned }]"
          >
            {{ h.name }} <span class="ovr-badge">{{ h.overall }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="roster-summary">
      {{ roster.totalPlayers }}/26 players, {{ unownedCount }} unowned
    </div>
  </div>
  <div v-else class="text-muted p-3">No roster built yet.</div>
</template>

<style scoped>
.roster-view {
  padding: 1rem;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  margin-bottom: 0.75rem;
}

.subsection-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted, #64748b);
  margin-bottom: 0.5rem;
}

.data-table {
  border-collapse: collapse;
  font-size: 0.825rem;
  width: 100%;
}

.data-table th {
  text-align: left;
  padding: 4px 8px;
  border-bottom: 1px solid var(--card-border, #e2e8f0);
  color: var(--text-muted, #64748b);
  font-weight: 600;
  white-space: nowrap;
}

.data-table td {
  padding: 4px 8px;
  border-bottom: 1px solid var(--card-border, #e2e8f0);
  white-space: nowrap;
}

.pitcher-table-wrap {
  min-width: 280px;
}

.lineup-table {
  max-width: 700px;
}

.pos-cell {
  font-weight: 600;
  color: var(--text-primary, #1e293b);
  width: 48px;
}

.backups-cell {
  font-size: 0.775rem;
  max-width: 200px;
  white-space: normal;
}

.ovr-badge {
  display: inline-block;
  font-size: 0.75rem;
  color: var(--text-muted, #64748b);
  margin-left: 4px;
}

.unowned {
  opacity: 0.5;
}

.roster-summary {
  font-size: 0.875rem;
  color: var(--text-muted, #64748b);
  padding-top: 0.5rem;
  border-top: 1px solid var(--card-border, #e2e8f0);
}

.bench-player {
  font-size: 0.825rem;
  padding: 2px 0;
  color: var(--text-primary, #1e293b);
}

.validation-errors {
  background: rgba(220, 38, 38, 0.1);
  border: 1px solid rgba(220, 38, 38, 0.3);
  border-radius: 6px;
  padding: 0.75rem;
}

.error-msg {
  font-size: 0.875rem;
  color: #dc2626;
}
</style>
