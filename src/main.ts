import { createApp } from "vue";
import { createPinia } from "pinia";
import "./styles/main.css";
import "./plugins/dayjs";
import App from "./App.vue";
import { i18n } from "./plugins/i18n";
import { router } from "./router";
import { stagger } from "./directives/stagger";
import { media } from "./directives/media";
import { installBackButton } from "./services/backButton";

const app = createApp(App).use(createPinia()).use(i18n).use(router);
app.directive("stagger", stagger);
app.directive("media", media);
installBackButton(router);
app.mount("#app");
