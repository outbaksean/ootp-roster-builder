<script setup lang="ts">
import { ref } from "vue";
import { usePlayerStore } from "@/stores/usePlayerStore";

const playerStore = usePlayerStore();

const exportStatus = ref("");
const ptStatus = ref("");

async function handleExportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  exportStatus.value = "Loading...";
  try {
    const text = await file.text();
    await playerStore.uploadExport(text);
    exportStatus.value = `Loaded: ${file.name} (total exports: ${playerStore.exportCount})`;
  } catch (e) {
    exportStatus.value = `Error loading file: ${String(e)}`;
  }
  input.value = "";
}

async function handlePtCardFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  ptStatus.value = "Loading...";
  try {
    const text = await file.text();
    await playerStore.uploadPtCardList(text);
    ptStatus.value = `Loaded: ${file.name}`;
  } catch (e) {
    ptStatus.value = `Error loading file: ${String(e)}`;
  }
  input.value = "";
}
</script>

<template>
  <Teleport to="body">
  <div
    id="dataImportModal"
    class="modal fade"
    tabindex="-1"
    aria-labelledby="dataImportModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog dark-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h5 id="dataImportModalLabel" class="modal-title">Import Data</h5>
          <button
            type="button"
            class="btn-close"
            data-bs-dismiss="modal"
            aria-label="Close"
          ></button>
        </div>
        <div class="modal-body">
          <div class="mb-4">
            <h6>Tournament Export CSV</h6>
            <p class="text-muted mb-2">
              Upload one or more tournament result exports. Each file is merged
              into the existing data set.
            </p>
            <div class="upload-zone">
              <label class="btn btn-secondary w-100" for="exportFileInput">
                Choose Export File
                <input
                  id="exportFileInput"
                  type="file"
                  accept=".csv"
                  class="d-none"
                  @change="handleExportFile"
                />
              </label>
            </div>
            <div v-if="exportStatus" class="mt-2 status-text">
              {{ exportStatus }}
            </div>
            <div
              v-else-if="playerStore.exportCount > 0"
              class="mt-2 status-text"
            >
              {{ playerStore.exportCount }} export(s) loaded
            </div>
          </div>

          <div>
            <h6>pt_card_list CSV</h6>
            <p class="text-muted mb-2">
              Upload pt_card_list.csv exported from the OOTP client. Provides
              ownership, split ratings, and defense data.
            </p>
            <div class="upload-zone">
              <label class="btn btn-secondary w-100" for="ptCardFileInput">
                Choose pt_card_list.csv
                <input
                  id="ptCardFileInput"
                  type="file"
                  accept=".csv"
                  class="d-none"
                  @change="handlePtCardFile"
                />
              </label>
            </div>
            <div v-if="ptStatus" class="mt-2 status-text">{{ ptStatus }}</div>
            <div v-else-if="playerStore.hasPtCardList" class="mt-2 status-text">
              Loaded at {{ playerStore.ptCardListLoadedAt }}
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            data-bs-dismiss="modal"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
  </Teleport>
</template>

<style scoped>
.upload-zone {
  border: 1px dashed rgba(255, 255, 255, 0.2);
  border-radius: 6px;
  padding: 0.5rem;
}

.status-text {
  font-size: 0.875rem;
  color: #94a3b8;
}
</style>
