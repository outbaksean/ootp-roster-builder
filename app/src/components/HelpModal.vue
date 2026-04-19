<script setup lang="ts">
defineProps<{ show: boolean }>();
defineEmits<{ close: [] }>();
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-box">
        <div class="modal-header">
          <span class="modal-title">Help</span>
          <button class="modal-close" @click="$emit('close')">x</button>
        </div>
        <div class="modal-body">
          <section>
            <h3>Card Data</h3>
            <p>
              Cards load automatically from a bundled card list on first visit.
              Upload your own <strong>pt_card_list.csv</strong> (exported from
              the OOTP client) to get current ownership data and pricing. Use
              the <strong>Use bundled</strong> link to revert to the default
              list.
            </p>
          </section>

          <section>
            <h3>Roster Tab</h3>
            <p>
              Browse all available cards. Click a row to add or remove a player
              from your roster. Filter by name, OVR range, or position using the
              bar at the top. Dimmed rows mean the roster is full for that
              player type.
            </p>
            <p>
              Toggle <strong>Owned cards only</strong> in the sidebar to limit
              the list to cards you own. Two-way players (like Shohei Ohtani)
              appear once and are added to both the pitching and hitting rosters
              when selected.
            </p>
          </section>

          <section>
            <h3>Pitching Tab</h3>
            <p>
              Assign pitchers to Starting Rotation and Bullpen slots. Click a
              slot to activate it, then click a pitcher in the roster panel, or
              drag a pitcher directly onto a slot. Use the
              <strong>4 / 5 / 6</strong>
              buttons to set rotation size.
            </p>
            <p>
              Each bullpen slot lets you set a primary role, secondary role, and
              usage preference. Only pitchers with stamina above 40 are eligible
              for SP slots.
            </p>
          </section>

          <section>
            <h3>Lineups Tab</h3>
            <p>
              Set a depth starter for each position to build your batting order.
              The nine starters automatically fill batting order slots in the
              order they are assigned. Drag rows in the batting order to
              reorder.
            </p>
            <p>
              Each position also supports Utility 1, Utility 2, and Defensive
              Sub slots. Use the starts dropdown to control how often each
              utility player appears. Separate depth charts are maintained for
              vs Right and vs Left.
            </p>
          </section>

          <section>
            <h3>Graphical Depth Chart Tab</h3>
            <p>
              A read-only baseball diamond view of your current depth chart.
              Position cards show the depth starter and any utility or defensive
              sub players. DH and pinch hitters appear in the side panel. Toggle
              vs R / vs L to switch lineups.
            </p>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-box {
  background: #1e293b;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  width: 560px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 64px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}

.modal-title {
  font-size: 1rem;
  font-weight: 600;
  color: #f1f5f9;
}

.modal-close {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: #64748b;
  font-size: 0.72rem;
  padding: 2px 7px;
  cursor: pointer;
  transition: color 0.1s;
}

.modal-close:hover {
  color: #f87171;
}

.modal-body {
  overflow-y: auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0;
}

section {
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  margin-bottom: 1rem;
}

section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

h3 {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #4ade80;
  margin: 0 0 0.5rem 0;
}

p {
  font-size: 0.82rem;
  color: #94a3b8;
  line-height: 1.6;
  margin: 0 0 0.4rem 0;
}

p:last-child {
  margin-bottom: 0;
}

strong {
  color: #cbd5e1;
  font-weight: 600;
}
</style>
