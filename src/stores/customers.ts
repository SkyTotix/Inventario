import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase, type Customer } from '../lib/supabase'

// Interfaz extendida para compatibilidad con la aplicación existente
export interface AppCustomer extends Customer {
  dateJoined?: string
  totalPurchases?: number
  totalSpent?: number
  lastPurchase?: string
  notes?: string
  isRegular?: boolean
  preferredGenres?: string[]
}

export const useCustomersStore = defineStore('customers', () => {
  const customers = ref<AppCustomer[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Función para mapear Customer de Supabase a AppCustomer
  const mapToAppCustomer = (customer: Customer): AppCustomer => ({
    ...customer,
    dateJoined: customer.created_at?.split('T')[0],
    totalPurchases: 0, // Se calculará desde las ventas
    totalSpent: 0, // Se calculará desde las ventas
    isRegular: false, // Se calculará basado en compras
    preferredGenres: [] // Se podría agregar como campo JSON en el futuro
  })

  // Función para mapear AppCustomer a Customer de Supabase
  const mapToSupabaseCustomer = (customer: Partial<AppCustomer>): Partial<Customer> => {
    const { dateJoined, totalPurchases, totalSpent, lastPurchase, notes, isRegular, preferredGenres, ...supabaseCustomer } = customer
    void dateJoined; void totalPurchases; void totalSpent; void lastPurchase; void notes; void isRegular; void preferredGenres
    return supabaseCustomer
  }

  const searchQuery = ref('')

  // Función para cargar clientes desde Supabase
  async function loadCustomers() {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: supabaseError } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (supabaseError) throw supabaseError
      
      customers.value = data?.map(mapToAppCustomer) || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al cargar clientes'
      console.error('Error loading customers:', err)
    } finally {
      loading.value = false
    }
  }

  // Computed properties
  const totalCustomers = computed(() => customers.value.length)
  const regularCustomers = computed(() => customers.value.filter(customer => customer.isRegular))
  const newCustomers = computed(() => {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]
    return customers.value.filter(customer => customer.dateJoined && customer.dateJoined >= cutoffDate)
  })

  const topCustomers = computed(() => 
    [...customers.value]
      .sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0))
      .slice(0, 10)
  )

  const filteredCustomers = computed(() => {
    if (!searchQuery.value) return customers.value
    
    const query = searchQuery.value.toLowerCase()
    return customers.value.filter(customer => 
      customer.name.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.includes(query)
    )
  })

  const customersByGenre = computed(() => {
    const genreMap: { [genre: string]: AppCustomer[] } = {}
    
    customers.value.forEach(customer => {
      customer.preferredGenres?.forEach(genre => {
        if (!genreMap[genre]) {
          genreMap[genre] = []
        }
        genreMap[genre].push(customer)
      })
    })
    
    return genreMap
  })

  // Actions
  async function addCustomer(customer: Omit<AppCustomer, 'id' | 'dateJoined' | 'totalPurchases' | 'totalSpent'>) {
    try {
      loading.value = true
      error.value = null
      
      const supabaseCustomer = mapToSupabaseCustomer(customer)
      const { data, error: supabaseError } = await supabase
        .from('customers')
        .insert([supabaseCustomer])
        .select()
        .single()
      
      if (supabaseError) throw supabaseError
      
      const newCustomer = mapToAppCustomer(data)
      customers.value.unshift(newCustomer)
      return newCustomer
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al agregar cliente'
      console.error('Error adding customer:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function updateCustomer(id: string, updates: Partial<AppCustomer>) {
    try {
      loading.value = true
      error.value = null
      
      const supabaseUpdates = mapToSupabaseCustomer(updates)
      const { data, error: supabaseError } = await supabase
        .from('customers')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (supabaseError) throw supabaseError
      
      const updatedCustomer = mapToAppCustomer(data)
      const index = customers.value.findIndex(customer => customer.id === id)
      if (index !== -1) {
        customers.value[index] = updatedCustomer
      }
      return updatedCustomer
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al actualizar cliente'
      console.error('Error updating customer:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  async function deleteCustomer(id: string) {
    try {
      loading.value = true
      error.value = null
      
      const { error: supabaseError } = await supabase
        .from('customers')
        .delete()
        .eq('id', id)
      
      if (supabaseError) throw supabaseError
      
      const index = customers.value.findIndex(customer => customer.id === id)
      if (index !== -1) {
        customers.value.splice(index, 1)
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al eliminar cliente'
      console.error('Error deleting customer:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function getCustomerById(id: string) {
    return customers.value.find(customer => customer.id === id)
  }

  function getCustomerByName(name: string) {
    return customers.value.find(customer => 
      customer.name.toLowerCase() === name.toLowerCase()
    )
  }

  function recordPurchase(customerId: string, amount: number) {
    const customer = customers.value.find(customer => customer.id === customerId)
    if (customer) {
      customer.totalPurchases = (customer.totalPurchases || 0) + 1
      customer.totalSpent = (customer.totalSpent || 0) + amount
      customer.lastPurchase = new Date().toISOString().split('T')[0]
      
      // Mark as regular customer if they have made 3+ purchases
      if ((customer.totalPurchases || 0) >= 3) {
        customer.isRegular = true
      }
    }
  }

  function addPreferredGenre(customerId: string, genre: string) {
    const customer = customers.value.find(customer => customer.id === customerId)
    if (customer) {
      if (!customer.preferredGenres) customer.preferredGenres = []
      if (!customer.preferredGenres.includes(genre)) {
        customer.preferredGenres.push(genre)
      }
    }
  }

  function removePreferredGenre(customerId: string, genre: string) {
    const customer = customers.value.find(customer => customer.id === customerId)
    if (customer && customer.preferredGenres) {
      const index = customer.preferredGenres.indexOf(genre)
      if (index !== -1) {
        customer.preferredGenres.splice(index, 1)
      }
    }
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function clearSearch() {
    searchQuery.value = ''
  }

  function getCustomerRecommendations(customerId: string) {
    const customer = getCustomerById(customerId)
    if (!customer) return []
    
    // This would typically integrate with the books store
    // For now, return the customer's preferred genres
    return customer.preferredGenres
  }

  function getCustomerPurchaseHistory(customerId: string) {
    // This would typically integrate with the sales store
    // to get actual purchase history
    const customer = getCustomerById(customerId)
    return customer ? {
      totalPurchases: customer.totalPurchases,
      totalSpent: customer.totalSpent,
      lastPurchase: customer.lastPurchase
    } : null
  }

  return {
    customers,
    loading,
    error,
    searchQuery,
    totalCustomers,
    regularCustomers,
    newCustomers,
    topCustomers,
    filteredCustomers,
    customersByGenre,
    loadCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    getCustomerById,
    getCustomerByName,
    recordPurchase,
    addPreferredGenre,
    removePreferredGenre,
    setSearchQuery,
    clearSearch,
    getCustomerRecommendations,
    getCustomerPurchaseHistory
  }
})