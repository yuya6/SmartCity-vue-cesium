import { createApp } from 'vue'
import App from './App.vue'
import { installSmartDash } from './components'

const app = createApp(App);
app.use(installSmartDash);
app.mount('#app')
