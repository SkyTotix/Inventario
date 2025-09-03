import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

export const useAuthStore = defineStore('auth', () => {
  const session = ref<Session | null>(null)
  const user = ref<User | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const initialized = ref(false)
  const isAdmin = ref<boolean | null>(null)

  const isAuthenticated = computed(() => !!session.value && !!user.value)

  async function fetchAdmin(): Promise<boolean> {
    try {
      if (!user.value) {
        isAdmin.value = false
        return false
      }
      const { data, error: rpcError } = await supabase.rpc('is_admin')
      if (rpcError) {
        console.error('[Auth] is_admin RPC error:', rpcError)
        isAdmin.value = false
        return false
      }
      // Supabase RPC returns the boolean directly in data
      isAdmin.value = !!data
      return !!data
    } catch (err) {
      console.error('[Auth] fetchAdmin exception:', err)
      isAdmin.value = false
      return false
    }
  }

  async function initAuth() {
    if (initialized.value) return
    try {
      loading.value = true
      const { data, error: sError } = await supabase.auth.getSession()
      if (sError) throw sError
      session.value = data.session
      user.value = data.session?.user ?? null

      if (user.value) {
        await fetchAdmin()
      } else {
        isAdmin.value = false
      }

      // Subscribe to auth changes
      supabase.auth.onAuthStateChange(async (_event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null
        if (user.value) {
          await fetchAdmin()
        } else {
          isAdmin.value = false
        }
      })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error inicializando autenticación'
      console.error('[Auth] initAuth error:', err)
    } finally {
      initialized.value = true
      loading.value = false
    }
  }

  async function login(email: string, password: string) {
    try {
      loading.value = true
      error.value = null
      const { data, error: sError } = await supabase.auth.signInWithPassword({ email, password })
      if (sError) throw sError
      session.value = data.session
      user.value = data.user
      await fetchAdmin()
      return data.user
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al iniciar sesión'
      console.error('[Auth] login error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    try {
      loading.value = true
      error.value = null
      const { error: sError } = await supabase.auth.signOut()
      if (sError) throw sError
      session.value = null
      user.value = null
      isAdmin.value = false
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al cerrar sesión'
      console.error('[Auth] logout error:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    // state
    session,
    user,
    loading,
    error,
    initialized,
    isAdmin,
    // getters
    isAuthenticated,
    // actions
    initAuth,
    login,
    logout,
    fetchAdmin,
  }
})