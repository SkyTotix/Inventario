<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'
import { useRouter, useRoute } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()
const email = ref('')
const password = ref('')

async function onSubmit(e: Event) {
  e.preventDefault()
  try {
    await auth.login(email.value, password.value)
    const redirect = (route.query.redirect as string) || '/'
    router.replace(redirect)
  } catch (err) {
    // error already handled in store
  }
}
</script>

<template>
  <div class="login-container">
    <form class="login-card" @submit="onSubmit">
      <h2>Iniciar sesión</h2>
      <p class="subtitle">Accede con tu correo y contraseña</p>

      <label class="label" for="email">Correo electrónico</label>
      <input id="email" v-model="email" type="email" class="input" placeholder="usuario@ejemplo.com" required />

      <label class="label" for="password">Contraseña</label>
      <input id="password" v-model="password" type="password" class="input" placeholder="••••••••" required />

      <button class="button" type="submit" :disabled="auth.loading">
        {{ auth.loading ? 'Ingresando...' : 'Entrar' }}
      </button>

      <p v-if="auth.error" class="error">{{ auth.error }}</p>
    </form>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 60vh;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-card {
  width: 100%;
  max-width: 380px;
  background: white;
  border-radius: 10px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
}
.label { display:block; margin: 1rem 0 0.25rem; color:#2c3e50; font-weight:600; }
.input { width:100%; padding:0.75rem 1rem; border:1px solid #ddd; border-radius:8px; font-size:1rem; }
.button { width:100%; margin-top:1.25rem; padding:0.75rem 1rem; background:#3498db; color:#fff; border:none; border-radius:8px; cursor:pointer; font-weight:600; }
.button:disabled { opacity:.7; cursor:not-allowed }
.subtitle { color:#7f8c8d; margin-top:.35rem; margin-bottom:1rem; }
.error { color:#e74c3c; margin-top:.75rem; }
</style>