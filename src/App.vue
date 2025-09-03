<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import { useBooksStore } from './stores/books'
import { useSalesStore } from './stores/sales'
import { useCustomersStore } from './stores/customers'
import { useAuthStore } from './stores/auth'

const isMobileMenuOpen = ref(false)
const auth = useAuthStore()
const router = useRouter()

// Initialize stores
const booksStore = useBooksStore()
const salesStore = useSalesStore()
const customersStore = useCustomersStore()

async function loadAllData() {
  await Promise.all([
    booksStore.loadBooks(),
    salesStore.loadSales(),
    customersStore.loadCustomers()
  ])
}

// Load data when authenticated AND admin
onMounted(async () => {
  try {
    await auth.initAuth()
    if (auth.isAuthenticated && auth.isAdmin === true) {
      await loadAllData()
    }
  } catch (error) {
    console.error('Error loading initial data:', error)
  }
})

// React to admin/auth changes
watch(() => auth.isAuthenticated, async (val) => {
  if (val && auth.isAdmin === true) {
    await loadAllData()
  }
})

watch(() => auth.isAdmin, async (isAdmin) => {
  if (auth.isAuthenticated && isAdmin === true) {
    await loadAllData()
  }
})

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

async function doLogout() {
  try {
    await auth.logout()
  } finally {
    router.push({ name: 'login' })
  }
}
</script>

<template>
  <div class="app">
    <template v-if="$route.name !== 'login' && $route.name !== 'no-access'">
      <!-- Header -->
      <header class="header">
        <div class="header-content">
          <div class="logo">
            <h1>📚 Gestor de Librería</h1>
          </div>
          <div class="header-actions">
            <span v-if="auth.user" class="user-email">{{ auth.user.email }}</span>
            <button class="logout-btn" @click="doLogout">Cerrar sesión</button>
            <button class="mobile-menu-btn" @click="toggleMobileMenu">
              <span></span>
              <span></span>
              <span></span>
            </button>
          </div>
        </div>
      </header>

      <!-- Navigation -->
      <nav class="nav" :class="{ 'nav-open': isMobileMenuOpen }">
        <div class="nav-content">
          <RouterLink 
            class="nav-item" 
            :class="{ active: $route.name === 'dashboard' }"
            to="/"
            @click="closeMobileMenu"
          >
            📊 Panel de Control
          </RouterLink>
          <RouterLink 
            class="nav-item" 
            :class="{ active: $route.name === 'inventory' }"
            to="/inventory"
            @click="closeMobileMenu"
          >
            📖 Inventario
          </RouterLink>
          <RouterLink 
            class="nav-item" 
            :class="{ active: $route.name === 'sales' }"
            to="/sales"
            @click="closeMobileMenu"
          >
            💰 Ventas
          </RouterLink>
          <RouterLink 
            class="nav-item" 
            :class="{ active: $route.name === 'customers' }"
            to="/customers"
            @click="closeMobileMenu"
          >
            👥 Clientes
          </RouterLink>
          <RouterLink 
            class="nav-item" 
            :class="{ active: $route.name === 'reports' }"
            to="/reports"
            @click="closeMobileMenu"
          >
            📈 Reportes
          </RouterLink>
          <RouterLink v-if="!auth.isAuthenticated" class="nav-item" :class="{ active: $route.name === 'login' }" to="/login" @click="closeMobileMenu">🔐 Login</RouterLink>
        </div>
      </nav>
    </template>

    <!-- Main Content -->
    <main class="main">
      <div class="content">
        <div class="tab-content">
          <RouterView />
        </div>
      </div>
    </main>
  </div>
</template>

<style>
/* Estilos Globales */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Estilos del Encabezado */
.header {
  background-color: #2c3e50;
  color: white;
  padding: 0;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-email {
  opacity: 0.9;
  font-size: 0.9rem;
}

.logout-btn {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.5rem 0.875rem;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease, transform 0.05s ease;
}

.logout-btn:hover {
  background: #c0392b;
}

.logout-btn:active {
  transform: translateY(1px);
}
.logo h1 {
  font-size: 1.5rem;
  font-weight: 600;
}

.mobile-menu-btn {
  display: none;
  flex-direction: column;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
}

.mobile-menu-btn span {
  width: 25px;
  height: 3px;
  background-color: white;
  margin: 3px 0;
  transition: 0.3s;
}

/* Estilos de Navegación */
.nav {
  background-color: #34495e;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.nav-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  gap: 0;
}

.nav-item {
  background: none;
  border: none;
  color: #ecf0f1;
  padding: 1rem 1.5rem;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.3s ease;
  border-bottom: 3px solid transparent;
  text-decoration: none;
}

.nav-item:hover {
  background-color: #3b5998;
  color: white;
}

.nav-item.active {
  background-color: #3498db;
  color: white;
  border-bottom-color: #2980b9;
}

/* Estilos del Contenido Principal */
.main {
  flex: 1;
  padding: 2rem 0;
}

.content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem;
}

.tab-content {
  background: white;
  border-radius: 8px;
  padding: 2rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  min-height: 400px;
}

.tab-content h2 {
  color: #2c3e50;
  margin-bottom: 1rem;
  font-size: 1.8rem;
  font-weight: 600;
}

.tab-content p {
  color: #7f8c8d;
  font-size: 1.1rem;
  line-height: 1.6;
}

/* Diseño Responsivo - Enfoque Mobile First */

/* Móvil (320px - 767px) */
@media (max-width: 767px) {
  .mobile-menu-btn {
    display: flex;
  }
  
  .header-content {
    padding: 1rem;
  }
  
  .logo h1 {
    font-size: 1.25rem;
  }
  
  .nav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    transform: translateY(-100%);
    opacity: 0;
    visibility: hidden;
    transition: all 0.3s ease;
    z-index: 99;
  }
  
  .nav-open {
    transform: translateY(0);
    opacity: 1;
    visibility: visible;
  }
  
  .nav-content {
    flex-direction: column;
    padding: 0;
  }
  
  .nav-item {
    border-bottom: 1px solid #2c3e50;
    border-radius: 0;
    padding: 1rem;
    text-align: center;
    font-size: 0.9rem;
  }
  
  .nav-item:last-child {
    border-bottom: none;
  }
  
  .content {
    padding: 0 1rem;
  }
  
  .tab-content {
    padding: 1rem;
    margin-bottom: 1rem;
  }
  
  .main {
    padding: 1rem 0;
  }
}

/* Tablet Vertical (768px - 1023px) */
@media (min-width: 768px) and (max-width: 1023px) {
  .mobile-menu-btn {
    display: none;
  }
  
  .header-content {
    padding: 1rem 1.5rem;
  }
  
  .logo h1 {
    font-size: 1.6rem;
  }
  
  .nav {
    position: static;
    transform: none;
    opacity: 1;
    visibility: visible;
  }
  
  .nav-content {
    padding: 0 1.5rem;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  
  .nav-item {
    flex: 1;
    min-width: calc(50% - 0.25rem);
    font-size: 0.9rem;
    padding: 0.875rem 1rem;
    text-align: center;
  }
  
  .content {
    padding: 0 1.5rem;
  }
  
  .tab-content {
    padding: 1.5rem;
  }
  
  .main {
    padding: 1.5rem 0;
  }
}

/* Tablet Horizontal y Escritorio Pequeño (1024px - 1279px) */
@media (min-width: 1024px) and (max-width: 1279px) {
  .mobile-menu-btn {
    display: none;
  }
  
  .header-content {
    padding: 1.25rem 2rem;
  }
  
  .logo h1 {
    font-size: 1.75rem;
  }
  
  .nav-content {
    padding: 0 2rem;
    flex-wrap: nowrap;
    gap: 0;
  }
  
  .nav-item {
    padding: 1rem 1.75rem;
    font-size: 1rem;
    min-width: auto;
    flex: 1;
  }
  
  .content {
    padding: 0 2rem;
  }
}
</style>
