import "./assets/main.css";

import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import { useCardStore } from "./stores/useCardStore";

const app = createApp(App);
app.use(createPinia());

const cardStore = useCardStore();
await cardStore.initialize();

app.mount("#app");
