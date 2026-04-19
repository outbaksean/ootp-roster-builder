<script setup lang="ts">
import { ref, computed } from "vue";
import { useCardStore } from "@/stores/useCardStore";

const cardStore = useCardStore();
const fileInput = ref<HTMLInputElement | null>(null);

const statusText = computed(() =>
  cardStore.hasCards
    ? `${cardStore.cardCount.toLocaleString()} cards`
    : "No cards loaded",
);

const loadedAtText = computed(() => {
  if (!cardStore.loadedAt) return null;
  const date = new Date(cardStore.loadedAt);
  if (cardStore.loadedFrom === "bundled") {
    return `bundled ${date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return `uploaded ${date.toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}`;
});

function triggerUpload() {
  fileInput.value?.click();
}

async function onFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  await cardStore.uploadPtCardList(file);
  if (fileInput.value) fileInput.value.value = "";
}
</script>

<template>
  <div class="uploader">
    <div class="uploader-header">
      <span class="uploader-label">Card Data</span>
    </div>
    <div class="uploader-body">
      <div class="status-row">
        <div class="status-left">
          <span
            class="status-dot"
            :class="cardStore.hasCards ? 'dot-green' : 'dot-red'"
          />
          <span
            class="status-text"
            :class="cardStore.hasCards ? 'text-green' : 'text-red'"
          >
            {{ statusText }}
          </span>
        </div>
        <button
          class="upload-btn"
          :disabled="cardStore.isLoading"
          @click="triggerUpload"
        >
          {{ cardStore.isLoading ? "Loading..." : "Upload" }}
        </button>
      </div>
      <div v-if="loadedAtText" class="loaded-at">{{ loadedAtText }}</div>
      <div v-if="cardStore.loadedFrom === 'uploaded'" class="revert-row">
        <button
          class="revert-btn"
          :disabled="cardStore.isLoading"
          @click="cardStore.revertToBundled()"
        >
          Use bundled
        </button>
      </div>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept=".csv"
      style="display: none"
      @change="onFileChange"
    />
  </div>
</template>

<style scoped>
.uploader {
  padding: 0.6rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.uploader-header {
  margin-bottom: 0.35rem;
}

.uploader-label {
  font-size: 0.65rem;
  font-weight: 600;
  letter-spacing: 0.07em;
  text-transform: uppercase;
  color: #64748b;
}

.uploader-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.status-left {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.dot-green {
  background: #4ade80;
  box-shadow: 0 0 5px rgba(74, 222, 128, 0.45);
}

.dot-red {
  background: #fca5a5;
  box-shadow: 0 0 5px rgba(252, 165, 165, 0.45);
}

.status-text {
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-green {
  color: #4ade80;
}

.text-red {
  color: #fca5a5;
}

.upload-btn {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 4px;
  color: #cbd5e1;
  font-size: 0.72rem;
  padding: 2px 8px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.12s;
}

.upload-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.13);
}

.upload-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loaded-at {
  font-size: 0.66rem;
  color: #475569;
  padding-left: 0.9rem;
}

.revert-row {
  padding-left: 0.9rem;
}

.revert-btn {
  background: none;
  border: none;
  padding: 0;
  color: #475569;
  font-size: 0.66rem;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.revert-btn:hover:not(:disabled) {
  color: #64748b;
}

.revert-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
