import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import NoAccess from '../components/NoAccess.vue'

const routes = [
  { path: '/login', name: 'login', component: () => import('../components/Login.vue') },
  { path: '/', name: 'dashboard', component: () => import('../components/Dashboard.vue'), meta: { requiresAuth: true } },
  { path: '/inventory', name: 'inventory', component: () => import('../components/BookInventory.vue'), meta: { requiresAuth: true } },
  { path: '/sales', name: 'sales', component: () => import('../components/SalesTransaction.vue'), meta: { requiresAuth: true } },
  { path: '/customers', name: 'customers', component: () => import('../components/CustomerManagement.vue'), meta: { requiresAuth: true } },
  { path: '/reports', name: 'reports', component: () => import('../components/Reports.vue'), meta: { requiresAuth: true } },
  { path: '/no-access', name: 'no-access', component: NoAccess },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
})

router.beforeEach(async (to) => {
  // Always allow the no-access page to render
  if (to.name === 'no-access') return true

  const auth = useAuthStore()
  if (!auth.initialized) {
    await auth.initAuth()
  }
  const requiresAuth = to.matched.some(record => record.meta?.requiresAuth)
  if (requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  // If route requires auth and user is authenticated, ensure they are admin
  if (requiresAuth && auth.isAuthenticated) {
    if (auth.isAdmin === null) {
      await auth.fetchAdmin()
    }
    if (auth.isAdmin === false) {
      return { name: 'no-access' }
    }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    // If authenticated but not admin, go to no-access; otherwise go home or redirect target
    if (auth.isAdmin === false) {
      return { name: 'no-access' }
    }
    return { path: (to.query.redirect as string) || '/' }
  }
  return true
})

export default router
