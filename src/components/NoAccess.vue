<script setup lang="ts">
import { useAuthStore } from '../stores/auth'
import { useRouter } from 'vue-router'

const auth = useAuthStore()
const router = useRouter()

async function goToLogin() {
  await router.replace({ name: 'login' })
}

async function doLogout() {
  try {
    await auth.logout()
  } finally {
    router.replace({ name: 'login' })
  }
}
</script>

<template>
  <div class="noaccess-container">
    <div class="noaccess-card">
      <div class="icon">🔒</div>
      <h2>Acceso restringido</h2>
      <p class="subtitle">Tu cuenta no tiene permisos para usar esta aplicación.</p>
      <p v-if="auth.user" class="user-info">
        Sesión iniciada como <strong>{{ auth.user.email }}</strong>
      </p>

      <div class="actions">
        <button class="button primary" @click="doLogout">Cerrar sesión</button>
        <button class="button" @click="goToLogin">Volver al inicio de sesión</button>
      </div>

      <p class="help-text">
        Si crees que deberías tener acceso, contacta al administrador.
      </p>
    </div>
  </div>
</template>

<style scoped>
.noaccess-container {
  min-height: 70vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
}

.noaccess-card {
  width: 100%;
  max-width: 520px;
  background: #fff;
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 10px 25px rgba(0,0,0,0.08);
  text-align: center;
}

.icon { font-size: 3rem; margin-bottom: 0.5rem; }

h2 { margin: 0.25rem 0 0.5rem; color: #2c3e50; }
.subtitle { color: #7f8c8d; margin: 0 0 0.5rem; }
.user-info { color: #7f8c8d; margin: 0.25rem 0 1.25rem; }

.actions { display: flex; gap: 0.75rem; justify-content: center; }
.button {
  padding: 0.75rem 1rem;
  border: 1px solid #ddd;
  background: #f7f7f7;
  color: #2c3e50;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}
.button.primary { background: #3498db; border-color: #3498db; color: #fff; }
.button:hover { opacity: 0.95; }

.help-text { color: #95a5a6; margin-top: 1rem; font-size: 0.9rem; }
</style>