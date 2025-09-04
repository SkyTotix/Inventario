<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCustomersStore, type AppCustomer } from '../stores/customers'
import { useSalesStore } from '../stores/sales'

const customersStore = useCustomersStore()
const salesStore = useSalesStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const showDetailsModal = ref(false)
const selectedCustomer = ref<AppCustomer | null>(null)

const newCustomer = ref({
  name: '',
  email: '',
  phone: '',
  address: '',
  preferredGenres: [] as string[]
})

const editCustomer = ref<Partial<AppCustomer>>({})

const sortBy = ref('name')
const sortOrder = ref<'asc' | 'desc'>('asc')
const filterBy = ref('all') // all, regular, new, inactive
const currentPage = ref(1)
const itemsPerPage = ref(20)

const genres = [
  'Classic Literature',
  'Science Fiction',
  'Fantasy',
  'Mystery',
  'Thriller',
  'Romance',
  'Historical Fiction',
  'Biography',
  'Self-Help',
  'Business',
  'Children',
  'Young Adult',
  'Poetry',
  'Drama',
  'Other'
]

const filteredCustomers = computed(() => {
  let customers = [...customersStore.filteredCustomers]
  
  // Apply additional filters
  if (filterBy.value === 'regular') {
    customers = customersStore.regularCustomers
  } else if (filterBy.value === 'new') {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    customers = customers.filter(customer => 
      customer.dateJoined ? new Date(customer.dateJoined) >= thirtyDaysAgo : false
    )
  } else if (filterBy.value === 'inactive') {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    customers = customers.filter(customer => 
      !customer.lastPurchase || new Date(customer.lastPurchase) < sixMonthsAgo
    )
  }
  
  // Sort customers
  return customers.sort((a, b) => {
    let aValue = a[sortBy.value as keyof AppCustomer]
    let bValue = b[sortBy.value as keyof AppCustomer]
    
    if (typeof aValue === 'string') aValue = (aValue as string).toLowerCase()
    if (typeof bValue === 'string') bValue = (bValue as string).toLowerCase()
    
    // Handle undefined values
    if (aValue === undefined && bValue === undefined) return 0
    if (aValue === undefined) return sortOrder.value === 'asc' ? -1 : 1
    if (bValue === undefined) return sortOrder.value === 'asc' ? 1 : -1
    
    if (sortOrder.value === 'asc') {
      return aValue < bValue ? -1 : aValue > bValue ? 1 : 0
    } else {
      return aValue > bValue ? -1 : aValue < bValue ? 1 : 0
    }
  })
})

const paginatedCustomers = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value
  const end = start + itemsPerPage.value
  return filteredCustomers.value.slice(start, end)
})

const totalPages = computed(() => {
  return Math.ceil(filteredCustomers.value.length / itemsPerPage.value)
})

const paginationInfo = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage.value + 1
  const end = Math.min(currentPage.value * itemsPerPage.value, filteredCustomers.value.length)
  return { start, end, total: filteredCustomers.value.length }
})

function openAddModal() {
  newCustomer.value = {
    name: '',
    email: '',
    phone: '',
    address: '',
    preferredGenres: []
  }
  showAddModal.value = true
}

function openEditModal(customer: AppCustomer) {
  selectedCustomer.value = customer
  editCustomer.value = { ...customer }
  showEditModal.value = true
}

function openDeleteModal(customer: AppCustomer) {
  selectedCustomer.value = customer
  showDeleteModal.value = true
}

function openDetailsModal(customer: AppCustomer) {
  selectedCustomer.value = customer
  showDetailsModal.value = true
}

function closeModals() {
  showAddModal.value = false
  showEditModal.value = false
  showDeleteModal.value = false
  showDetailsModal.value = false
  selectedCustomer.value = null
}

async function addCustomer() {
  if (!newCustomer.value.name.trim()) {
    alert('Por favor ingrese el nombre del cliente')
    return
  }
  await customersStore.addCustomer(newCustomer.value as Omit<AppCustomer, 'id' | 'dateJoined' | 'totalPurchases' | 'totalSpent'>)
  closeModals()
}

async function updateCustomer() {
  if (!selectedCustomer.value || !editCustomer.value.name?.trim()) {
    alert('Por favor ingrese el nombre del cliente')
    return
  }
  await customersStore.updateCustomer(selectedCustomer.value.id, editCustomer.value)
  closeModals()
}

async function deleteCustomer() {
  if (selectedCustomer.value) {
    await customersStore.deleteCustomer(selectedCustomer.value.id)
    closeModals()
  }
}

function setSortBy(field: string) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
  currentPage.value = 1 // Reset to first page when sorting
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page
  }
}

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--
  }
}

function getCustomerStatus(customer: AppCustomer) {
  const purchases = customer.totalPurchases || 0
  if (purchases >= 5) return 'vip'
  if (purchases >= 2) return 'regular'
  return 'new'
}

function getCustomerSales(customerId: string) {
  return salesStore.sales.filter(sale => sale.customerId === customerId)
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date))
}

function formatDateTime(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

function toggleGenre(genre: string, genres: string[]) {
  const index = genres.indexOf(genre)
  if (index > -1) {
    genres.splice(index, 1)
  } else {
    genres.push(genre)
  }
}
</script>

<template>
  <div class="customers-container">
    <!-- Header Section -->
    <div class="customers-header">
      <div class="header-left">
        <h2>👥 Gestión de Clientes</h2>
        <div class="stats">
          <div class="stat-item">
            <span class="stat-value">{{ customersStore.totalCustomers }}</span>
            <span class="stat-label">Total de Clientes</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ customersStore.regularCustomers.length }}</span>
            <span class="stat-label">Clientes Regulares</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatCurrency(salesStore.totalRevenue) }}</span>
            <span class="stat-label">Ingresos Totales</span>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        ➕ Agregar Nuevo Cliente
      </button>
    </div>

    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="search-box">
        <input
          type="text"
          placeholder="Buscar clientes por nombre, email o teléfono..."
          :value="customersStore.searchQuery"
          @input="customersStore.setSearchQuery(($event.target as HTMLInputElement).value)"
          class="search-input"
        >
      </div>
      <div class="filter-controls">
        <select v-model="filterBy" class="filter-select">
          <option value="all">Todos los Clientes</option>
          <option value="regular">Clientes Regulares</option>
          <option value="new">Clientes Nuevos (30 días)</option>
          <option value="inactive">Inactivos (6+ meses)</option>
        </select>
        <button class="btn btn-secondary" @click="customersStore.clearSearch()">
          Limpiar Búsqueda
        </button>
      </div>
    </div>

    <!-- Customers Table -->
    <div class="table-container">
      <table class="customers-table">
        <thead>
          <tr>
            <th @click="setSortBy('name')" class="sortable">
              Nombre
              <span v-if="sortBy === 'name'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="setSortBy('email')" class="sortable">
              Contacto
              <span v-if="sortBy === 'email'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="setSortBy('totalPurchases')" class="sortable">
              Compras
              <span v-if="sortBy === 'totalPurchases'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="setSortBy('totalSpent')" class="sortable">
              Total Gastado
              <span v-if="sortBy === 'totalSpent'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="setSortBy('lastPurchase')" class="sortable">
              Última Compra
              <span v-if="sortBy === 'lastPurchase'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="customer in paginatedCustomers" :key="customer.id" class="customer-row">
            <td class="customer-name">
              <div>
                <strong>{{ customer.name }}</strong>
                <div class="preferred-genres" v-if="(customer.preferredGenres?.length || 0) > 0">
                  <span 
                    v-for="genre in (customer.preferredGenres?.slice(0, 2) || [])"
                    :key="genre" 
                    class="genre-tag"
                  >
                    {{ genre }}
                  </span>
                  <span v-if="(customer.preferredGenres?.length || 0) > 2" class="more-genres">
                    +{{ (customer.preferredGenres?.length || 0) - 2 }} más
                  </span>
                </div>
              </div>
            </td>
            <td class="contact-info">
              <div v-if="customer.email">📧 {{ customer.email }}</div>
              <div v-if="customer.phone">📞 {{ customer.phone }}</div>
            </td>
            <td class="purchases">{{ customer.totalPurchases }}</td>
            <td class="total-spent">{{ formatCurrency(customer.totalSpent || 0) }}</td>
            <td class="last-purchase">
              {{ customer.lastPurchase ? formatDate(customer.lastPurchase) : 'Nunca' }}
            </td>
            <td>
              <span class="status-badge" :class="getCustomerStatus(customer)">
                {{ getCustomerStatus(customer).toUpperCase() }}
              </span>
            </td>
            <td class="actions">
              <button class="btn-icon btn-view" @click="openDetailsModal(customer)" title="Ver Detalles">
                👁️
              </button>
              <button class="btn-icon btn-edit" @click="openEditModal(customer)" title="Editar">
                ✏️
              </button>
              <button class="btn-icon btn-delete" @click="openDeleteModal(customer)" title="Eliminar">
                🗑️
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="filteredCustomers.length === 0" class="empty-state">
        <p>No se encontraron clientes que coincidan con sus criterios.</p>
      </div>
      
      <!-- Pagination Controls -->
      <div v-if="totalPages > 1" class="pagination-container">
        <div class="pagination-info">
          Mostrando {{ paginationInfo.start }} - {{ paginationInfo.end }} de {{ paginationInfo.total }} clientes
        </div>
        <div class="pagination-controls">
          <button 
            class="btn btn-secondary btn-sm" 
            @click="prevPage" 
            :disabled="currentPage === 1"
          >
            ← Anterior
          </button>
          
          <div class="page-numbers">
            <button 
              v-for="page in Math.min(5, totalPages)" 
              :key="page" 
              class="page-btn"
              :class="{ active: currentPage === page }"
              @click="goToPage(page)"
            >
              {{ page }}
            </button>
            <span v-if="totalPages > 5" class="page-ellipsis">...</span>
            <button 
              v-if="totalPages > 5 && currentPage < totalPages - 2" 
              class="page-btn"
              @click="goToPage(totalPages)"
            >
              {{ totalPages }}
            </button>
          </div>
          
          <button 
            class="btn btn-secondary btn-sm" 
            @click="nextPage" 
            :disabled="currentPage === totalPages"
          >
            Siguiente →
          </button>
        </div>
        
        <div class="items-per-page">
          <label>Elementos por página:</label>
          <select v-model="itemsPerPage" @change="currentPage = 1" class="items-select">
            <option :value="10">10</option>
            <option :value="20">20</option>
            <option :value="50">50</option>
            <option :value="100">100</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Add Customer Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Agregar Nuevo Cliente</h3>
          <button class="close-btn" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre *</label>
              <input v-model="newCustomer.name" type="text" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="newCustomer.email" type="email">
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input v-model="newCustomer.phone" type="tel">
            </div>
            <div class="form-group full-width">
              <label>Dirección</label>
              <textarea v-model="newCustomer.address" rows="2"></textarea>
            </div>
            <div class="form-group full-width">
              <label>Géneros Preferidos</label>
              <div class="genres-grid">
                <label 
                  v-for="genre in genres" 
                  :key="genre" 
                  class="genre-checkbox"
                >
                  <input 
                    type="checkbox" 
                    :checked="newCustomer.preferredGenres.includes(genre)"
                    @change="toggleGenre(genre, newCustomer.preferredGenres)"
                  >
                  <span>{{ genre }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModals">Cancelar</button>
          <button class="btn btn-primary" @click="addCustomer">Agregar Cliente</button>
        </div>
      </div>
    </div>

    <!-- Edit Customer Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Editar Cliente</h3>
          <button class="close-btn" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Nombre *</label>
              <input v-model="editCustomer.name" type="text" required>
            </div>
            <div class="form-group">
              <label>Email</label>
              <input v-model="editCustomer.email" type="email">
            </div>
            <div class="form-group">
              <label>Teléfono</label>
              <input v-model="editCustomer.phone" type="tel">
            </div>
            <div class="form-group full-width">
              <label>Dirección</label>
              <textarea v-model="editCustomer.address" rows="2"></textarea>
            </div>
            <div class="form-group full-width">
              <label>Géneros Preferidos</label>
              <div class="genres-grid">
                <label 
                  v-for="genre in genres" 
                  :key="genre" 
                  class="genre-checkbox"
                >
                  <input 
                    type="checkbox" 
                    :checked="editCustomer.preferredGenres?.includes(genre)"
                    @change="() => { if (!editCustomer.preferredGenres) editCustomer.preferredGenres = []; toggleGenre(genre, editCustomer.preferredGenres) }"
                  >
                  <span>{{ genre }}</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModals">Cancelar</button>
          <button class="btn btn-primary" @click="updateCustomer">Actualizar Cliente</button>
        </div>
      </div>
    </div>

    <!-- Customer Details Modal -->
    <div v-if="showDetailsModal && selectedCustomer" class="modal-overlay" @click="closeModals">
      <div class="modal modal-large" @click.stop>
        <div class="modal-header">
          <h3>{{ selectedCustomer.name }} - Detalles del Cliente</h3>
          <button class="close-btn" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <div class="customer-details">
            <!-- Customer Info -->
            <div class="details-section">
              <h4>📋 Información del Cliente</h4>
              <div class="info-grid">
                <div class="info-item">
                  <label>Nombre:</label>
                  <span>{{ selectedCustomer.name }}</span>
                </div>
                <div class="info-item" v-if="selectedCustomer.email">
                  <label>Email:</label>
                  <span>{{ selectedCustomer.email }}</span>
                </div>
                <div class="info-item" v-if="selectedCustomer.phone">
                  <label>Teléfono:</label>
                  <span>{{ selectedCustomer.phone }}</span>
                </div>
                <div class="info-item" v-if="selectedCustomer.address">
                  <label>Dirección:</label>
                  <span>{{ selectedCustomer.address }}</span>
                </div>
                <div class="info-item">
                  <label>Cliente Desde:</label>
                  <span>{{ selectedCustomer?.dateJoined ? formatDate(selectedCustomer.dateJoined) : 'Desconocido' }}</span>
                </div>
                <div class="info-item">
                  <label>Estado:</label>
                  <span class="status-badge" :class="getCustomerStatus(selectedCustomer)">
                    {{ getCustomerStatus(selectedCustomer).toUpperCase() }}
                  </span>
                </div>
              </div>
            </div>

            <!-- Purchase Statistics -->
            <div class="details-section">
              <h4>📊 Estadísticas de Compra</h4>
              <div class="stats-grid">
                <div class="stat-card">
                  <div class="stat-number">{{ selectedCustomer.totalPurchases }}</div>
                  <div class="stat-label">Total de Compras</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">{{ formatCurrency(selectedCustomer.totalSpent || 0) }}</div>
                  <div class="stat-label">Total Gastado</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">{{ formatCurrency((selectedCustomer.totalSpent || 0) / Math.max(selectedCustomer.totalPurchases || 0, 1)) }}</div>
                  <div class="stat-label">Compra Promedio</div>
                </div>
                <div class="stat-card">
                  <div class="stat-number">{{ selectedCustomer.lastPurchase ? formatDate(selectedCustomer.lastPurchase) : 'Nunca' }}</div>
                  <div class="stat-label">Última Compra</div>
                </div>
              </div>
            </div>

            <!-- Preferred Genres -->
            <div class="details-section" v-if="(selectedCustomer.preferredGenres?.length || 0) > 0">
              <h4>📚 Géneros Preferidos</h4>
              <div class="genres-list">
                <span 
                  v-for="genre in (selectedCustomer.preferredGenres || [])" 
                  :key="genre" 
                  class="genre-tag"
                >
                  {{ genre }}
                </span>
              </div>
            </div>

            <!-- Purchase History -->
            <div class="details-section">
              <h4>🛒 Historial de Compras Reciente</h4>
              <div class="purchase-history">
                <div 
                  v-for="sale in getCustomerSales(selectedCustomer.id).slice(0, 10)" 
                  :key="sale.id" 
                  class="purchase-item"
                >
                  <div class="purchase-info">
                    <div class="purchase-date">{{ formatDateTime(sale.date) }}</div>
                    <div class="purchase-items">{{ sale.items.length }} artículo(s)</div>
                  </div>
                  <div class="purchase-amount">{{ formatCurrency(sale.total) }}</div>
                </div>
                <div v-if="getCustomerSales(selectedCustomer.id).length === 0" class="no-purchases">
                  <p>No hay historial de compras disponible.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModals">Cerrar</button>
          <button class="btn btn-primary" @click="openEditModal(selectedCustomer); showDetailsModal = false">
            Editar Cliente
          </button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeModals">
      <div class="modal modal-small" @click.stop>
        <div class="modal-header">
          <h3>Eliminar Cliente</h3>
          <button class="close-btn" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <p>¿Está seguro de que desea eliminar a "{{ selectedCustomer?.name }}"?</p>
          <p class="warning">Esta acción no se puede deshacer y eliminará todos los datos del cliente.</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModals">Cancelar</button>
          <button class="btn btn-danger" @click="deleteCustomer">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.customers-container {
  padding: 0;
}

.customers-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
}

.header-left h2 {
  margin-bottom: 1rem;
  color: #2c3e50;
}

.stats {
  display: flex;
  gap: 2rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: #3498db;
}

.stat-label {
  display: block;
  font-size: 0.875rem;
  color: #7f8c8d;
  margin-top: 0.25rem;
}

.filters-section {
  background: white;
  padding: 1.5rem;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 1.5rem;
}

.search-box {
  margin-bottom: 1rem;
}

.search-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  font-size: 1rem;
  transition: border-color 0.3s ease;
}

.search-input:focus {
  outline: none;
  border-color: #3498db;
}

.filter-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  padding: 0.5rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
  min-width: 200px;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.customers-table {
  width: 100%;
  border-collapse: collapse;
}

.customers-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e1e8ed;
}

.customers-table th.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.customers-table th.sortable:hover {
  background: #e9ecef;
}

.sort-indicator {
  margin-left: 0.5rem;
  font-size: 0.875rem;
}

.customers-table td {
  padding: 1rem;
  border-bottom: 1px solid #e1e8ed;
  vertical-align: top;
}

.customer-row:hover {
  background: #f8f9fa;
}

.customer-name strong {
  display: block;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.preferred-genres {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.genre-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.625rem;
  font-weight: 500;
}

.more-genres {
  color: #7f8c8d;
  font-size: 0.625rem;
  padding: 0.125rem 0.25rem;
}

.contact-info {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.contact-info div {
  margin-bottom: 0.25rem;
}

.purchases,
.total-spent {
  font-weight: 600;
  color: #27ae60;
}

.last-purchase {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.new {
  background: #fff3cd;
  color: #856404;
}

.status-badge.regular {
  background: #d4edda;
  color: #155724;
}

.status-badge.vip {
  background: #f8d7da;
  color: #721c24;
  background: linear-gradient(45deg, #ffd700, #ffed4e);
  color: #8b4513;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: none;
  border: none;
  padding: 0.5rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  transition: background-color 0.3s ease;
}

.btn-icon:hover {
  background: #f8f9fa;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #7f8c8d;
}

/* Button Styles */
.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal {
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-small {
  max-width: 400px;
}

.modal-large {
  max-width: 800px;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e1e8ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  color: #2c3e50;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #7f8c8d;
  padding: 0;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #2c3e50;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 1px solid #e1e8ed;
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.form-group.full-width {
  grid-column: 1 / -1;
}

.form-group label {
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
}

.form-group input,
.form-group textarea {
  padding: 0.75rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
}

.genres-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  padding: 1rem;
}

.genre-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: background-color 0.3s ease;
}

.genre-checkbox:hover {
  background: #f8f9fa;
}

.genre-checkbox input {
  margin: 0;
}

.genre-checkbox span {
  font-size: 0.875rem;
}

.warning {
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Customer Details Styles */
.customer-details {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.details-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  border-bottom: 2px solid #e1e8ed;
  padding-bottom: 0.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-item label {
  font-weight: 600;
  color: #7f8c8d;
  font-size: 0.875rem;
}

.info-item span {
  color: #2c3e50;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.stat-card {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  text-align: center;
}

.stat-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: #3498db;
  margin-bottom: 0.25rem;
}

.stat-label {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.genres-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.purchase-history {
  max-height: 300px;
  overflow-y: auto;
}

.purchase-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  margin-bottom: 0.5rem;
}

.purchase-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.purchase-date {
  font-weight: 500;
  color: #2c3e50;
}

.purchase-items {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.purchase-amount {
  font-weight: 600;
  color: #27ae60;
}

.no-purchases {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

/* Pagination Styles */
.pagination-container {
  padding: 1.5rem;
  border-top: 1px solid #e1e8ed;
  background: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.pagination-info {
  font-size: 0.875rem;
  color: #7f8c8d;
  font-weight: 500;
}

.pagination-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.page-numbers {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.page-btn {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e1e8ed;
  background: white;
  color: #2c3e50;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.3s ease;
}

.page-btn:hover {
  background: #f8f9fa;
  border-color: #3498db;
}

.page-btn.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.page-ellipsis {
  padding: 0.5rem;
  color: #7f8c8d;
}

.items-per-page {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.items-per-page label {
  color: #7f8c8d;
  font-weight: 500;
}

.items-select {
  padding: 0.25rem 0.5rem;
  border: 1px solid #e1e8ed;
  border-radius: 4px;
  background: white;
  font-size: 0.875rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .customers-header {
    flex-direction: column;
    align-items: stretch;
  }
  
  .stats {
    justify-content: space-around;
  }
  
  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-select {
    min-width: auto;
  }
  
  .table-container {
    overflow-x: auto;
  }
  
  .customers-table {
    min-width: 900px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .genres-grid {
    grid-template-columns: 1fr;
  }
  
  .info-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
  
  .modal {
    margin: 1rem;
    max-width: none;
  }
  
  .pagination-container {
    flex-direction: column;
    align-items: stretch;
    text-align: center;
  }
  
  .pagination-controls {
    justify-content: center;
    flex-wrap: wrap;
  }
  
  .items-per-page {
    justify-content: center;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .genres-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>