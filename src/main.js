import './assets/styles/main.css'

import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

const defaultSettings = {
  'Github username': 'Pinecraft-Project',
  'Repo name': 'Pinecraft-Project.github.io',
  'Branch': 'main',
  'Path': 'src/content/post',
  'Content Type': 'post'
};

Object.entries(defaultSettings).forEach(([key, value]) => {
  if (!window.localStorage.getItem(key)) {
    window.localStorage.setItem(key, value);
  }
});

const app = createApp(App)

app.use(router)

app.mount('#app')

