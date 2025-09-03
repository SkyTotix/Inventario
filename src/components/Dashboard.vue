<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBooksStore } from '../stores/books'
import { useSalesStore } from '../stores/sales'
import { useCustomersStore } from '../stores/customers'

const booksStore = useBooksStore()
const salesStore = useSalesStore()
const customersStore = useCustomersStore()

const selectedPeriod = ref('today') // today, week, month, year
const showLowStockAlert = ref(true)

const periodOptions = [
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mes' },
  { value: 'year', label: 'Este Año' }
]

// Sales data based on selected period
const periodSales = computed(() => {
  const now = new Date()
  let startDate: Date
  
  switch (selectedPeriod.value) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'week':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  }
  
  // Use created_at when available to avoid UTC parsing issues of YYYY-MM-DD
  return salesStore.sales.filter(sale => {
    const saleDate = new Date(sale.created_at || `${sale.date}T00:00:00`)
    return saleDate >= startDate
  })
})

const periodRevenue = computed(() => {
  return periodSales.value.reduce((sum, sale) => sum + sale.total, 0)
})

const periodTransactions = computed(() => periodSales.value.length)

const averageOrderValue = computed(() => {
  return periodTransactions.value > 0 ? periodRevenue.value / periodTransactions.value : 0
})

// Top selling books
const topSellingBooks = computed(() => {
  const bookSales = new Map<string, { book: any, quantity: number, revenue: number }>()
  
  periodSales.value.forEach(sale => {
    sale.items.forEach(item => {
      const book = booksStore.books.find(b => b.id === item.bookId)
      if (book) {
        const existing = bookSales.get(item.bookId) || { book, quantity: 0, revenue: 0 }
        existing.quantity += item.quantity
        existing.revenue += item.price * item.quantity
        bookSales.set(item.bookId, existing)
      }
    })
  })
  
  return Array.from(bookSales.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
})

// Sales by genre
const salesByGenre = computed(() => {
  const genreSales = new Map<string, number>()
  
  periodSales.value.forEach(sale => {
    sale.items.forEach(item => {
      const book = booksStore.books.find(b => b.id === item.bookId)
      if (book) {
        const current = genreSales.get(book.genre) || 0
        genreSales.set(book.genre, current + item.price * item.quantity)
      }
    })
  })
  
  return Array.from(genreSales.entries())
    .map(([genre, revenue]) => ({ genre, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6)
})

// Daily sales for the last 7 days
const dailySales = computed(() => {
  const days = []
  const now = new Date()
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate())
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)
    
    const daySales = salesStore.sales.filter(sale => {
      const saleDate = new Date(sale.created_at || `${sale.date}T00:00:00`)
      return saleDate >= dayStart && saleDate < dayEnd
    })
    
    const revenue = daySales.reduce((sum, sale) => sum + sale.total, 0)
    
    days.push({
      date: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
      revenue,
      transactions: daySales.length
    })
  }
  
  return days
})

// Recent activities
const recentActivities = computed(() => {
  const activities = []
  
  // Recent sales
  const recentSales = salesStore.sales
    .slice(-5)
    .reverse()
    .map(sale => ({
      type: 'sale',
      message: `Venta completada - ${formatCurrency(sale.total)}`,
      time: sale.created_at || `${sale.date}T00:00:00`,
      icon: '💰'
    }))
  
  // Low stock alerts
  const lowStockBooks = booksStore.lowStockBooks.slice(0, 3).map(book => ({
    type: 'alert',
    message: `Alerta de stock bajo: ${book.title} (${book.stock} restantes)`,
    time: new Date(),
    icon: '⚠️'
  }))
  
  activities.push(...recentSales, ...lowStockBooks)
  
  return activities
})

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(date))
}

function getMaxRevenue() {
  return Math.max(...dailySales.value.map(day => day.revenue), 1)
}

function getGenreColor(index: number) {
  const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c']
  return colors[index % colors.length]
}

function dismissLowStockAlert() {
  showLowStockAlert.value = false
}
</script>

<template>
  <div class="dashboard-container">
    <!-- Header -->
    <div class="dashboard-header">
      <div class="header-left">
        <h2>📊 Panel de Control</h2>
        <p class="subtitle">Resumen del rendimiento de tu librería</p>
      </div>
      <div class="period-selector">
        <select v-model="selectedPeriod" class="period-select">
          <option v-for="option in periodOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- Low Stock Alert -->
    <div v-if="showLowStockAlert && booksStore.lowStockBooks.length > 0" class="alert alert-warning">
      <div class="alert-content">
        <span class="alert-icon">⚠️</span>
        <div class="alert-text">
          <strong>¡Alerta de Stock Bajo!</strong>
          {{ booksStore.lowStockBooks.length }} libro(s) tienen poco stock.
        </div>
      </div>
      <button class="alert-close" @click="dismissLowStockAlert">×</button>
    </div>

    <!-- Key Metrics -->
    <div class="metrics-grid">
      <div class="metric-card revenue">
        <div class="metric-icon">💰</div>
        <div class="metric-content">
          <div class="metric-value">{{ formatCurrency(periodRevenue) }}</div>
          <div class="metric-label">Ingresos {{ periodOptions.find(p => p.value === selectedPeriod)?.label }}</div>
        </div>
      </div>
      
      <div class="metric-card transactions">
        <div class="metric-icon">🛒</div>
        <div class="metric-content">
          <div class="metric-value">{{ periodTransactions }}</div>
          <div class="metric-label">Transacciones</div>
        </div>
      </div>
      
      <div class="metric-card average">
        <div class="metric-icon">📈</div>
        <div class="metric-content">
          <div class="metric-value">{{ formatCurrency(averageOrderValue) }}</div>
          <div class="metric-label">Valor Promedio de Pedido</div>
        </div>
      </div>
      
      <div class="metric-card inventory">
        <div class="metric-icon">📚</div>
        <div class="metric-content">
          <div class="metric-value">{{ booksStore.totalBooks }}</div>
          <div class="metric-label">Libros en Stock</div>
        </div>
      </div>
      
      <div class="metric-card customers">
        <div class="metric-icon">👥</div>
        <div class="metric-content">
          <div class="metric-value">{{ customersStore.totalCustomers }}</div>
          <div class="metric-label">Total de Clientes</div>
        </div>
      </div>
      
      <div class="metric-card value">
        <div class="metric-icon">💎</div>
        <div class="metric-content">
          <div class="metric-value">{{ formatCurrency(booksStore.totalValue) }}</div>
          <div class="metric-label">Valor del Inventario</div>
        </div>
      </div>
    </div>

    <!-- Charts and Analytics -->
    <div class="analytics-grid">
      <!-- Sales Trend Chart -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>📈 Tendencia de Ventas (Últimos 7 Días)</h3>
        </div>
        <div class="chart-content">
          <div class="bar-chart">
            <div 
              v-for="day in dailySales" 
              :key="day.date" 
              class="bar-container"
            >
              <div class="bar-wrapper">
                <div 
                  class="bar"
                  :style="{ height: `${(day.revenue / getMaxRevenue()) * 100}%` }"
                  :title="`${day.date}: ${formatCurrency(day.revenue)}`"
                ></div>
              </div>
              <div class="bar-label">{{ day.date.split(' ')[0] }}</div>
              <div class="bar-value">{{ formatCurrency(day.revenue) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Selling Books -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>🏆 Libros Más Vendidos</h3>
        </div>
        <div class="chart-content">
          <div v-if="topSellingBooks.length === 0" class="no-data">
            <p>No hay datos de ventas disponibles para el período seleccionado.</p>
          </div>
          <div v-else class="top-books-list">
            <div 
              v-for="(item, index) in topSellingBooks" 
              :key="item.book.id" 
              class="book-item"
            >
              <div class="book-rank">{{ index + 1 }}</div>
              <div class="book-info">
                <div class="book-title">{{ item.book.title }}</div>
                <div class="book-author">{{ item.book.author }}</div>
              </div>
              <div class="book-stats">
                <div class="book-quantity">{{ item.quantity }} vendidos</div>
                <div class="book-revenue">{{ formatCurrency(item.revenue) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sales by Genre -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>📚 Ventas por Género</h3>
        </div>
        <div class="chart-content">
          <div v-if="salesByGenre.length === 0" class="no-data">
            <p>No hay datos de ventas disponibles para el período seleccionado.</p>
          </div>
          <div v-else class="genre-chart">
            <div 
              v-for="(genre, index) in salesByGenre" 
              :key="genre.genre" 
              class="genre-item"
            >
              <div class="genre-info">
                <div 
                  class="genre-color"
                  :style="{ backgroundColor: getGenreColor(index) }"
                ></div>
                <div class="genre-name">{{ genre.genre }}</div>
              </div>
              <div class="genre-revenue">{{ formatCurrency(genre.revenue) }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Recent Activity -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>🔔 Actividad Reciente</h3>
        </div>
        <div class="chart-content">
          <div class="activity-list">
            <div 
              v-for="activity in recentActivities" 
              :key="activity.message + activity.time" 
              class="activity-item"
              :class="activity.type"
            >
              <div class="activity-icon">{{ activity.icon }}</div>
              <div class="activity-content">
                <div class="activity-message">{{ activity.message }}</div>
                <div class="activity-time">{{ formatDate(activity.time) }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>⚡ Estadísticas Rápidas</h3>
        </div>
        <div class="chart-content">
          <div class="quick-stats">
            <div class="stat-row">
              <span class="stat-label">Artículos con Stock Bajo:</span>
              <span class="stat-value warning">{{ booksStore.lowStockBooks.length }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Sin Stock:</span>
              <span class="stat-value danger">{{ booksStore.outOfStockBooks.length }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Clientes Regulares:</span>
              <span class="stat-value success">{{ customersStore.regularCustomers.length }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Géneros Únicos:</span>
              <span class="stat-value info">{{ booksStore.genres.length }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Ventas de Hoy:</span>
              <span class="stat-value success">{{ salesStore.todaysSales.length }}</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Ingresos de Hoy:</span>
              <span class="stat-value success">{{ formatCurrency(salesStore.todaysRevenue) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Inventory Overview -->
      <div class="chart-card">
        <div class="chart-header">
          <h3>📦 Resumen del Inventario</h3>
        </div>
        <div class="chart-content">
          <div class="inventory-overview">
            <div class="inventory-stat">
              <div class="inventory-number">{{ booksStore.totalBooks }}</div>
              <div class="inventory-label">Total de Libros</div>
            </div>
            <div class="inventory-stat">
              <div class="inventory-number">{{ booksStore.genres.length }}</div>
              <div class="inventory-label">Géneros</div>
            </div>
            <div class="inventory-stat warning">
              <div class="inventory-number">{{ booksStore.lowStockBooks.length }}</div>
              <div class="inventory-label">Stock Bajo</div>
            </div>
            <div class="inventory-stat danger">
              <div class="inventory-number">{{ booksStore.outOfStockBooks.length }}</div>
              <div class="inventory-label">Sin Stock</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-container {
  padding: 0;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
}

.header-left h2 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
}

.subtitle {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.875rem;
}

.period-selector {
  display: flex;
  align-items: center;
}

.period-select {
  padding: 0.5rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  background: white;
  font-size: 0.875rem;
}

.alert {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff3cd;
  border: 1px solid #ffeeba;
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.alert-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.alert-icon {
  font-size: 1.25rem;
}

.alert-text strong { color: #856404; }

.alert-close {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.metric-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.metric-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.metric-icon {
  font-size: 2.5rem;
  opacity: 0.8;
}

.metric-content { flex: 1; }

.metric-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.metric-label {
  font-size: 0.875rem;
  color: #7f8c8d;
  font-weight: 500;
}

.metric-card.revenue .metric-icon { color: #27ae60; }
.metric-card.transactions .metric-icon { color: #3498db; }
.metric-card.average .metric-icon { color: #e74c3c; }
.metric-card.inventory .metric-icon { color: #f39c12; }
.metric-card.customers .metric-icon { color: #9b59b6; }
.metric-card.value .metric-icon { color: #1abc9c; }

/* Analytics Grid */
.analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 1.5rem;
}

.chart-card {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.chart-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e1e8ed;
}

.chart-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.125rem;
}

.chart-content { padding: 1.5rem; }

/* Bar Chart */
.bar-chart {
  display: flex;
  align-items: end;
  gap: 1rem;
  height: 200px;
  padding: 1rem 0;
}

.bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.bar-wrapper {
  width: 100%;
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  height: 150px;
  display: flex;
  align-items: flex-end;
}

.bar {
  width: 100%;
  background: linear-gradient(180deg, #3498db, #2980b9);
  border-radius: 6px 6px 0 0;
}

.bar-label { font-weight: 500; color: #2c3e50; }
.bar-value { font-size: 0.875rem; color: #7f8c8d; }

/* Top Books */
.top-books-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.book-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.book-rank {
  font-size: 1.25rem;
  font-weight: 700;
  color: #3498db;
}

.book-info { flex: 1; margin: 0 1rem; }
.book-title { font-weight: 600; color: #2c3e50; }
.book-author { color: #7f8c8d; font-size: 0.875rem; }

.book-stats { text-align: right; }
.book-quantity { color: #2c3e50; }
.book-revenue { color: #27ae60; font-weight: 600; }

/* Genre Chart */
.genre-chart {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.genre-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
}

.genre-info {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.genre-color {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
}

.genre-name { font-weight: 500; color: #2c3e50; }
.genre-revenue { font-weight: 600; color: #27ae60; }

/* Activity List */
.activity-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 300px;
  overflow-y: auto;
}

.activity-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 6px;
  border-left: 4px solid #e1e8ed;
}

.activity-item.sale { border-left-color: #27ae60; }
.activity-item.alert { border-left-color: #f39c12; }

.activity-icon { font-size: 1.25rem; }
.activity-content { flex: 1; }
.activity-message { font-size: 0.875rem; color: #2c3e50; margin-bottom: 0.25rem; }
.activity-time { font-size: 0.75rem; color: #7f8c8d; }

/* Quick Stats */
.quick-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e1e8ed;
}

.stat-row:last-child { border-bottom: none; }

.stat-label { font-size: 0.875rem; color: #7f8c8d; }

.stat-value {
  font-weight: 600;
  color: #2c3e50;
}

.stat-value.success { color: #27ae60; }
.stat-value.warning { color: #f39c12; }
.stat-value.danger { color: #e74c3c; }
.stat-value.info { color: #3498db; }

/* Inventory Overview */
.inventory-overview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.inventory-stat {
  text-align: center;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  border: 2px solid #e1e8ed;
}

.inventory-stat.warning {
  border-color: #f39c12;
  background: #fff3cd;
}

.inventory-stat.danger {
  border-color: #e74c3c;
  background: #f8d7da;
}

.inventory-number {
  font-size: 1.5rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.inventory-stat.warning .inventory-number {
  color: #856404;
}

.inventory-stat.danger .inventory-number {
  color: #721c24;
}

.inventory-label {
  font-size: 0.75rem;
  color: #7f8c8d;
  font-weight: 500;
  text-transform: uppercase;
}

/* No Data State */
.no-data {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

/* Responsive Design */
@media (max-width: 768px) {
  .dashboard-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .analytics-grid {
    grid-template-columns: 1fr;
  }
  
  .metric-card {
    flex-direction: column;
    text-align: center;
    gap: 0.5rem;
  }
  
  .metric-icon {
    font-size: 2rem;
  }
  
  .metric-value {
    font-size: 1.5rem;
  }
  
  .bar-chart {
    height: 150px;
  }
  
  .inventory-overview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .metrics-grid {
    grid-template-columns: 1fr;
  }
  
  .book-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
  
  .book-stats {
    text-align: left;
    width: 100%;
  }
}
</style>