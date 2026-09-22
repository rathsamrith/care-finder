import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './app.vue'
import router from './router'
import i18n, { warmFonts } from './i18n'
import axios from './plugins/axios'
import { configure } from 'vee-validate'

import 'uno.css'
// Self-hosted Khmer font (Khmer subset only; Latin text keeps Plus Jakarta Sans).
import '@fontsource/noto-sans-khmer/khmer-400.css'
import '@fontsource/noto-sans-khmer/khmer-500.css'
import '@fontsource/noto-sans-khmer/khmer-600.css'
import '@fontsource/noto-sans-khmer/khmer-700.css'
import './assets/main.css'

const app = createApp(App)

configure({
  validateOnInput: true
})

app.use(createPinia()).use(router.router).use(router.simpleAcl).use(i18n)

app.config.globalProperties.$axios = axios
app.mount('#app')
warmFonts()
