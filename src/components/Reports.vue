<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBooksStore } from '../stores/books'
import { useSalesStore } from '../stores/sales'
import { useCustomersStore } from '../stores/customers'

const booksStore = useBooksStore()
const salesStore = useSalesStore()
const customersStore = useCustomersStore()

const selectedReport = ref('sales-summary')
const selectedPeriod = ref('month')
const customStartDate = ref('')
const customEndDate = ref('')
const showExportOptions = ref(false)

const reportTypes = [
  { value: 'sales-summary', label: '📊 Resumen de Ventas', description: 'Resumen del rendimiento de ventas' },
  { value: 'inventory-report', label: '📚 Reporte de Inventario', description: 'Niveles de stock y detalles de libros' },
  { value: 'customer-analysis', label: '👥 Análisis de Clientes', description: 'Comportamiento y preferencias de clientes' },
  { value: 'financial-report', label: '💰 Reporte Financiero', description: 'Análisis de ingresos y ganancias' },
  { value: 'product-performance', label: '🏆 Rendimiento de Productos', description: 'Libros más y menos vendidos' }
]

const periodOptions = [
  { value: 'today', label: 'Hoy' },
  { value: 'yesterday', label: 'Ayer' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'last-week', label: 'Semana Pasada' },
  { value: 'month', label: 'Este Mes' },
  { value: 'last-month', label: 'Mes Pasado' },
  { value: 'quarter', label: 'Este Trimestre' },
  { value: 'year', label: 'Este Año' },
  { value: 'custom', label: 'Rango Personalizado' }
]

// Date range calculation
const dateRange = computed(() => {
  const now = new Date()
  let startDate: Date
  let endDate: Date = new Date()
  
  switch (selectedPeriod.value) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      break
    case 'yesterday':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
      endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000)
      break
    case 'week':
      const dayOfWeek = now.getDay()
      startDate = new Date(now.getTime() - dayOfWeek * 24 * 60 * 60 * 1000)
      startDate = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate())
      break
    case 'last-week':
      const lastWeekEnd = new Date(now.getTime() - now.getDay() * 24 * 60 * 60 * 1000)
      const lastWeekStart = new Date(lastWeekEnd.getTime() - 6 * 24 * 60 * 60 * 1000)
      startDate = new Date(lastWeekStart.getFullYear(), lastWeekStart.getMonth(), lastWeekStart.getDate())
      endDate = new Date(lastWeekEnd.getFullYear(), lastWeekEnd.getMonth(), lastWeekEnd.getDate() + 1)
      break
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'last-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      endDate = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    case 'quarter':
      const quarterStart = Math.floor(now.getMonth() / 3) * 3
      startDate = new Date(now.getFullYear(), quarterStart, 1)
      break
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1)
      break
    case 'custom':
      startDate = customStartDate.value ? new Date(customStartDate.value) : new Date(now.getFullYear(), now.getMonth(), 1)
      endDate = customEndDate.value ? new Date(customEndDate.value) : new Date()
      break
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  }
  
  return { startDate, endDate }
})

// Filtered sales data
const filteredSales = computed(() => {
  const { startDate, endDate } = dateRange.value
  return salesStore.sales.filter(sale => {
    const saleDate = new Date(sale.date)
    return saleDate >= startDate && saleDate <= endDate
  })
})

// Sales Summary Report
const salesSummary = computed(() => {
  const sales = filteredSales.value
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalTransactions = sales.length
  const totalItemsSold = sales.reduce((sum, sale) => 
    sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0
  )
  const averageOrderValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
  
  // Daily breakdown
  const dailyData = new Map<string, { revenue: number, transactions: number, items: number }>()
  sales.forEach(sale => {
    const dateKey = new Date(sale.date).toDateString()
    const existing = dailyData.get(dateKey) || { revenue: 0, transactions: 0, items: 0 }
    existing.revenue += sale.total
    existing.transactions += 1
    existing.items += sale.items.reduce((sum, item) => sum + item.quantity, 0)
    dailyData.set(dateKey, existing)
  })
  
  const dailyBreakdown = Array.from(dailyData.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  return {
    totalRevenue,
    totalTransactions,
    totalItemsSold,
    averageOrderValue,
    dailyBreakdown
  }
})

// Inventory Report
const inventoryReport = computed(() => {
  const books = booksStore.books
  const totalBooks = books.length
  const totalValue = books.reduce((sum, book) => sum + (book.price * book.stock), 0)
  const lowStockCount = booksStore.lowStockBooks.length
  const outOfStockCount = booksStore.outOfStockBooks.length
  
  // By genre
  const genreData = new Map<string, { count: number, value: number, quantity: number }>()
  books.forEach(book => {
    const existing = genreData.get(book.genre) || { count: 0, value: 0, quantity: 0 }
    existing.count += 1
    existing.value += book.price * book.stock
    existing.quantity += book.stock
    genreData.set(book.genre, existing)
  })
  
  const genreBreakdown = Array.from(genreData.entries())
    .map(([genre, data]) => ({ genre, ...data }))
    .sort((a, b) => b.value - a.value)
  
  return {
    totalBooks,
    totalValue,
    lowStockCount,
    outOfStockCount,
    genreBreakdown,
    lowStockBooks: booksStore.lowStockBooks,
    outOfStockBooks: booksStore.outOfStockBooks
  }
})

// Customer Analysis
const customerAnalysis = computed(() => {
  const customers = customersStore.customers
  const sales = filteredSales.value
  
  // Customer purchase data
  const customerPurchases = new Map<string, { customer: any, purchases: number, revenue: number, lastPurchase: Date }>()
  
  sales.forEach(sale => {
    if (sale.customerId) {
      const customer = customers.find(c => c.id === sale.customerId)
      if (customer) {
        const existing = customerPurchases.get(sale.customerId) || {
          customer,
          purchases: 0,
          revenue: 0,
          lastPurchase: new Date(sale.date)
        }
        existing.purchases += 1
        existing.revenue += sale.total
        if (new Date(sale.date) > existing.lastPurchase) {
          existing.lastPurchase = new Date(sale.date)
        }
        customerPurchases.set(sale.customerId, existing)
      }
    }
  })
  
  const topCustomers = Array.from(customerPurchases.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
  
  const newCustomers = customers.filter(customer => {
    if (!customer.dateJoined) return false
    const joinDate = new Date(customer.dateJoined)
    return joinDate >= dateRange.value.startDate && joinDate <= dateRange.value.endDate
  })
  
  return {
    totalCustomers: customers.length,
    activeCustomers: customerPurchases.size,
    newCustomers: newCustomers.length,
    topCustomers,
    averageCustomerValue: customerPurchases.size > 0 ? 
      Array.from(customerPurchases.values()).reduce((sum, c) => sum + c.revenue, 0) / customerPurchases.size : 0
  }
})

// Product Performance
const productPerformance = computed(() => {
  const bookSales = new Map<string, { book: any, quantity: number, revenue: number, transactions: number }>()
  
  filteredSales.value.forEach(sale => {
    sale.items.forEach(item => {
      const book = booksStore.books.find(b => b.id === item.bookId)
      if (book) {
        const existing = bookSales.get(item.bookId) || {
          book,
          quantity: 0,
          revenue: 0,
          transactions: 0
        }
        existing.quantity += item.quantity
        existing.revenue += item.price * item.quantity
        existing.transactions += 1
        bookSales.set(item.bookId, existing)
      }
    })
  })
  
  const performanceData = Array.from(bookSales.values())
  
  const topSelling = [...performanceData]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10)
  
  const topRevenue = [...performanceData]
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10)
  
  const slowMoving = booksStore.books
    .filter(book => !bookSales.has(book.id))
    .slice(0, 10)
  
  return {
    topSelling,
    topRevenue,
    slowMoving,
    totalProductsSold: performanceData.length
  }
})

// Financial Report
const financialReport = computed(() => {
  const sales = filteredSales.value
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  
  // Calculate cost of goods sold (assuming 60% of selling price is cost)
  const totalCOGS = sales.reduce((sum, sale) => {
    return sum + sale.items.reduce((itemSum, item) => {
      return itemSum + (item.price * item.quantity * 0.6) // 60% cost ratio
    }, 0)
  }, 0)
  
  const grossProfit = totalRevenue - totalCOGS
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0
  
  // Payment method breakdown
  const paymentMethods = new Map<string, { count: number, amount: number }>()
  sales.forEach(sale => {
    const existing = paymentMethods.get(sale.paymentMethod) || { count: 0, amount: 0 }
    existing.count += 1
    existing.amount += sale.total
    paymentMethods.set(sale.paymentMethod, existing)
  })
  
  const paymentBreakdown = Array.from(paymentMethods.entries())
    .map(([method, data]) => ({ method, ...data }))
    .sort((a, b) => b.amount - a.amount)
  
  return {
    totalRevenue,
    totalCOGS,
    grossProfit,
    grossMargin,
    paymentBreakdown
  }
})

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

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function toCSVValue(v: any): string {
  if (v === null || v === undefined) return ''
  let s = String(v)
  if (s.includes('"')) s = s.replace(/"/g, '""')
  if (/[",\n]/.test(s)) s = `"${s}` + `"`
  return s
}

function downloadCSV(filename: string, rows: Array<Record<string, any>>, headers?: string[]) {
  if (!rows || rows.length === 0) {
    alert('No hay datos para exportar en este período.')
    return
  }
  const cols = headers && headers.length ? headers : Object.keys(rows[0])
  const csvLines: string[] = []
  csvLines.push(cols.join(','))
  for (const row of rows) {
    const line = cols.map(c => toCSVValue((row as any)[c])).join(',')
    csvLines.push(line)
  }
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function getReportCSV() {
  const periodText = getDateRangeText()
  switch (selectedReport.value) {
    case 'sales-summary': {
      const rows = salesSummary.value.dailyBreakdown.map(d => ({
        Fecha: d.date,
        Ingresos: d.revenue,
        Transacciones: d.transactions,
        Articulos: d.items,
        ValorPromedioOrden: d.transactions > 0 ? (d.revenue / d.transactions).toFixed(2) : '0'
      }))
      const filename = `reporte-ventas-${periodText}.csv`.replace(/\s+/g, '_')
      return { filename, rows }
    }
    case 'inventory-report': {
      const rows = booksStore.books.map(b => ({
        Titulo: b.title,
        Autor: b.author,
        Genero: b.genre,
        Precio: b.price,
        Stock: b.stock,
        ValorInventario: b.price * b.stock
      }))
      const filename = `reporte-inventario-${periodText}.csv`.replace(/\s+/g, '_')
      return { filename, rows }
    }
    case 'customer-analysis': {
      const rows = customerAnalysis.value.topCustomers.map(c => ({
        Cliente: c.customer.name,
        Compras: c.purchases,
        Ingresos: c.revenue,
        UltimaCompra: formatDate(c.lastPurchase)
      }))
      const filename = `reporte-clientes-${periodText}.csv`.replace(/\s+/g, '_')
      return { filename, rows }
    }
    case 'financial-report': {
      const summary = financialReport.value
      const rows = summary.paymentBreakdown.map(p => ({
        Metodo: p.method,
        Transacciones: p.count,
        Monto: p.amount
      }))
      const filename = `reporte-financiero-${periodText}.csv`.replace(/\s+/g, '_')
      return { filename, rows }
    }
    case 'product-performance': {
      const perfMap = new Map<string, { book: any, quantity: number, revenue: number, transactions: number }>()
      filteredSales.value.forEach(sale => {
        sale.items.forEach(item => {
          const b = booksStore.books.find(bb => bb.id === item.bookId)
          if (!b) return
          const existing = perfMap.get(item.bookId) || { book: b, quantity: 0, revenue: 0, transactions: 0 }
          existing.quantity += item.quantity
          existing.revenue += item.price * item.quantity
          existing.transactions += 1
          perfMap.set(item.bookId, existing)
        })
      })
      const rows = Array.from(perfMap.values()).map(x => ({
        Libro: x.book.title,
        Genero: x.book.genre,
        CantidadVendida: x.quantity,
        Ingresos: x.revenue,
        Transacciones: x.transactions
      }))
      const filename = `reporte-productos-${periodText}.csv`.replace(/\s+/g, '_')
      return { filename, rows }
    }
    default: {
      const rows = filteredSales.value.map(sale => ({
        Fecha: formatDate(sale.date),
        Cliente: sale.customerName || '',
        MetodoPago: sale.paymentMethod,
        Subtotal: sale.subtotal,
        Impuesto: sale.tax,
        Descuento: sale.discount || 0,
        Total: sale.total,
        Items: sale.items.map(i => `${i.title || (booksStore.books.find(b => b.id === i.bookId)?.title || '')} x${i.quantity}`).join('; ')
      }))
      const filename = `reporte-${selectedReport.value}-${periodText}.csv`.replace(/\s+/g, '_')
      return { filename, rows }
    }
  }
}

function exportReport(format: 'csv' | 'pdf' | 'print') {
  showExportOptions.value = false
  if (format === 'print') {
    window.print()
    return
  }
  if (format === 'csv') {
    const { filename, rows } = getReportCSV()
    downloadCSV(filename, rows)
    return
  }
  console.info('Exportar a PDF no implementado aún.')
}

function getPeriodLabel() {
  const option = periodOptions.find(p => p.value === selectedPeriod.value)
  return option?.label || 'Custom Range'
}

function getDateRangeText() {
  const { startDate, endDate } = dateRange.value
  if (selectedPeriod.value === 'custom') {
    return `${formatDate(startDate)} - ${formatDate(endDate)}`
  }
  return getPeriodLabel()
}
</script>

<template>
  <div class="reports-container">
    <!-- Header -->
    <div class="reports-header">
      <div class="header-left">
        <h2>📈 Reports & Analytics</h2>
        <p class="subtitle">Comprehensive business insights and performance metrics</p>
      </div>
      <div class="header-actions">
        <button 
          class="export-btn"
          @click="showExportOptions = !showExportOptions"
        >
          📤 Export
        </button>
        <div v-if="showExportOptions" class="export-dropdown">
          <button @click="exportReport('print')">🖨️ Print</button>
          <button @click="exportReport('csv')">📊 CSV</button>
          <button @click="exportReport('pdf')">📄 PDF</button>
        </div>
      </div>
    </div>

    <!-- Report Controls -->
    <div class="report-controls">
      <div class="control-group">
        <label>Tipo de Reporte:</label>
        <select v-model="selectedReport" class="control-select">
          <option v-for="report in reportTypes" :key="report.value" :value="report.value">
            {{ report.label }}
          </option>
        </select>
      </div>
      
      <div class="control-group">
        <label>Período:</label>
        <select v-model="selectedPeriod" class="control-select">
          <option v-for="period in periodOptions" :key="period.value" :value="period.value">
            {{ period.label }}
          </option>
        </select>
      </div>
      
      <div v-if="selectedPeriod === 'custom'" class="date-range">
        <div class="date-input">
          <label>Desde:</label>
          <input v-model="customStartDate" type="date" class="control-input">
        </div>
        <div class="date-input">
          <label>Hasta:</label>
          <input v-model="customEndDate" type="date" class="control-input">
        </div>
      </div>
    </div>

    <!-- Report Content -->
    <div class="report-content">
      <!-- Report Header -->
      <div class="report-title">
        <h3>{{ reportTypes.find(r => r.value === selectedReport)?.label }}</h3>
        <p class="report-period">{{ getDateRangeText() }}</p>
      </div>

      <!-- Sales Summary Report -->
      <div v-if="selectedReport === 'sales-summary'" class="report-section">
        <div class="summary-metrics">
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(salesSummary.totalRevenue) }}</div>
            <div class="metric-label">Ingresos Totales</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ salesSummary.totalTransactions }}</div>
            <div class="metric-label">Transacciones</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ salesSummary.totalItemsSold }}</div>
            <div class="metric-label">Artículos Vendidos</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(salesSummary.averageOrderValue) }}</div>
            <div class="metric-label">Valor Promedio de Orden</div>
          </div>
        </div>
        
        <div v-if="salesSummary.dailyBreakdown.length > 0" class="daily-breakdown">
          <h4>Desglose Diario</h4>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Ingresos</th>
                  <th>Transacciones</th>
                  <th>Artículos Vendidos</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="day in salesSummary.dailyBreakdown" :key="day.date">
                  <td>{{ formatDate(day.date) }}</td>
                  <td>{{ formatCurrency(day.revenue) }}</td>
                  <td>{{ day.transactions }}</td>
                  <td>{{ day.items }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Inventory Report -->
      <div v-if="selectedReport === 'inventory-report'" class="report-section">
        <div class="summary-metrics">
          <div class="metric-card">
            <div class="metric-value">{{ inventoryReport.totalBooks }}</div>
            <div class="metric-label">Total de Libros</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(inventoryReport.totalValue) }}</div>
            <div class="metric-label">Valor del Inventario</div>
          </div>
          <div class="metric-card warning">
            <div class="metric-value">{{ inventoryReport.lowStockCount }}</div>
            <div class="metric-label">Stock Bajo</div>
          </div>
          <div class="metric-card danger">
            <div class="metric-value">{{ inventoryReport.outOfStockCount }}</div>
            <div class="metric-label">Sin Stock</div>
          </div>
        </div>
        
        <div class="inventory-details">
          <div class="detail-section">
            <h4>Inventario por Género</h4>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Género</th>
                    <th>Libros</th>
                    <th>Cantidad</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="genre in inventoryReport.genreBreakdown" :key="genre.genre">
                    <td>{{ genre.genre }}</td>
                    <td>{{ genre.count }}</td>
                    <td>{{ genre.quantity }}</td>
                    <td>{{ formatCurrency(genre.value) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div v-if="inventoryReport.lowStockBooks.length > 0" class="detail-section">
            <h4>Alerta de Stock Bajo</h4>
            <div class="alert-list">
              <div v-for="book in inventoryReport.lowStockBooks" :key="book.id" class="alert-item">
                <div class="book-info">
                  <div class="book-title">{{ book.title }}</div>
                  <div class="book-author">{{ book.author }}</div>
                </div>
                <div class="stock-info">
                  <span class="current-stock">{{ book.stock }}</span> / 
                  <span class="min-stock">2</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Customer Analysis -->
      <div v-if="selectedReport === 'customer-analysis'" class="report-section">
        <div class="summary-metrics">
          <div class="metric-card">
            <div class="metric-value">{{ customerAnalysis.totalCustomers }}</div>
            <div class="metric-label">Total de Clientes</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ customerAnalysis.activeCustomers }}</div>
            <div class="metric-label">Clientes Activos</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ customerAnalysis.newCustomers }}</div>
            <div class="metric-label">Clientes Nuevos</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(customerAnalysis.averageCustomerValue) }}</div>
            <div class="metric-label">Valor Promedio del Cliente</div>
          </div>
        </div>
        
        <div v-if="customerAnalysis.topCustomers.length > 0" class="customer-details">
          <h4>Mejores Clientes</h4>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Compras</th>
                  <th>Ingresos</th>
                  <th>Última Compra</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="customer in customerAnalysis.topCustomers" :key="customer.customer.id">
                  <td>
                    <div class="customer-info">
                      <div class="customer-name">{{ customer.customer.name }}</div>
                      <div class="customer-email">{{ customer.customer.email }}</div>
                    </div>
                  </td>
                  <td>{{ customer.purchases }}</td>
                  <td>{{ formatCurrency(customer.revenue) }}</td>
                  <td>{{ formatDate(customer.lastPurchase) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Product Performance -->
      <div v-if="selectedReport === 'product-performance'" class="report-section">
        <div class="performance-tabs">
          <div class="tab-buttons">
            <button class="tab-btn active">Más Vendidos</button>
            <button class="tab-btn">Mayores Ingresos</button>
            <button class="tab-btn">Movimiento Lento</button>
          </div>
          
          <div class="performance-content">
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Libro</th>
                    <th>Cantidad Vendida</th>
                    <th>Ingresos</th>
                    <th>Transacciones</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in productPerformance.topSelling" :key="item.book.id">
                    <td>
                      <div class="book-info">
                        <div class="book-title">{{ item.book.title }}</div>
                        <div class="book-author">{{ item.book.author }}</div>
                      </div>
                    </td>
                    <td>{{ item.quantity }}</td>
                    <td>{{ formatCurrency(item.revenue) }}</td>
                    <td>{{ item.transactions }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Financial Report -->
      <div v-if="selectedReport === 'financial-report'" class="report-section">
        <div class="summary-metrics">
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(financialReport.totalRevenue) }}</div>
            <div class="metric-label">Ingresos Totales</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(financialReport.totalCOGS) }}</div>
            <div class="metric-label">Costo de Mercancías</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatCurrency(financialReport.grossProfit) }}</div>
            <div class="metric-label">Ganancia Bruta</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">{{ formatPercent(financialReport.grossMargin) }}</div>
            <div class="metric-label">Margen Bruto</div>
          </div>
        </div>
        
        <div class="payment-breakdown">
          <h4>Métodos de Pago</h4>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Método de Pago</th>
                  <th>Transacciones</th>
                  <th>Monto</th>
                  <th>Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="payment in financialReport.paymentBreakdown" :key="payment.method">
                  <td>{{ payment.method }}</td>
                  <td>{{ payment.count }}</td>
                  <td>{{ formatCurrency(payment.amount) }}</td>
                  <td>{{ formatPercent((payment.amount / financialReport.totalRevenue) * 100) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.reports-container {
  padding: 0;
}

.reports-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  position: relative;
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

.header-actions {
  position: relative;
}

.export-btn {
  padding: 0.75rem 1.5rem;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.export-btn:hover {
  background: #2980b9;
}

.export-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  background: white;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 10;
  min-width: 120px;
  margin-top: 0.5rem;
}

.export-dropdown button {
  display: block;
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.export-dropdown button:hover {
  background: #f8f9fa;
}

.export-dropdown button:first-child {
  border-radius: 6px 6px 0 0;
}

.export-dropdown button:last-child {
  border-radius: 0 0 6px 6px;
}

/* Report Controls */
.report-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: end;
  padding: 1.5rem;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  margin-bottom: 2rem;
}

.control-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.control-group label {
  font-size: 0.875rem;
  font-weight: 500;
  color: #2c3e50;
}

.control-select,
.control-input {
  padding: 0.75rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  font-size: 0.875rem;
  background: white;
  color: #2c3e50;
}

.control-select:focus,
.control-input:focus {
  outline: none;
  border-color: #3498db;
}

.date-range {
  display: flex;
  gap: 1rem;
}

.date-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* Report Content */
.report-content {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.report-title {
  padding: 2rem;
  border-bottom: 1px solid #e1e8ed;
  background: #f8f9fa;
}

.report-title h3 {
  margin: 0 0 0.5rem 0;
  color: #2c3e50;
  font-size: 1.5rem;
}

.report-period {
  margin: 0;
  color: #7f8c8d;
  font-size: 0.875rem;
}

.report-section {
  padding: 2rem;
}

/* Summary Metrics */
.summary-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.metric-card {
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
  text-align: center;
  border: 2px solid #e1e8ed;
}

.metric-card.warning {
  border-color: #f39c12;
  background: #fff3cd;
}

.metric-card.danger {
  border-color: #e74c3c;
  background: #f8d7da;
}

.metric-value {
  font-size: 1.75rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.metric-card.warning .metric-value {
  color: #856404;
}

.metric-card.danger .metric-value {
  color: #721c24;
}

.metric-label {
  font-size: 0.875rem;
  color: #7f8c8d;
  font-weight: 500;
  text-transform: uppercase;
}

/* Tables */
.table-container {
  overflow-x: auto;
  border-radius: 6px;
  border: 1px solid #e1e8ed;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
}

.data-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e1e8ed;
}

.data-table td {
  padding: 1rem;
  border-bottom: 1px solid #e1e8ed;
  color: #2c3e50;
}

.data-table tr:hover {
  background: #f8f9fa;
}

.book-info,
.customer-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.book-title,
.customer-name {
  font-weight: 500;
  color: #2c3e50;
}

.book-author,
.customer-email {
  font-size: 0.875rem;
  color: #7f8c8d;
}

/* Detail Sections */
.detail-section,
.inventory-details,
.customer-details,
.payment-breakdown {
  margin-top: 2rem;
}

.detail-section h4,
.inventory-details h4,
.customer-details h4,
.payment-breakdown h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.125rem;
}

/* Alert Items */
.alert-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.alert-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 6px;
}

.stock-info {
  font-weight: 600;
  color: #856404;
}

.current-stock {
  color: #e74c3c;
}

.min-stock {
  color: #7f8c8d;
}

/* Performance Tabs */
.performance-tabs {
  margin-top: 1rem;
}

.tab-buttons {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tab-btn.active {
  background: #3498db;
  color: white;
  border-color: #3498db;
}

.tab-btn:hover:not(.active) {
  background: #e9ecef;
}

/* Responsive Design */
@media (max-width: 768px) {
  .reports-header {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
  
  .report-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .date-range {
    flex-direction: column;
  }
  
  .summary-metrics {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .report-title {
    padding: 1.5rem;
  }
  
  .report-section {
    padding: 1.5rem;
  }
  
  .tab-buttons {
    flex-direction: column;
  }
}

@media (max-width: 480px) {
  .summary-metrics {
    grid-template-columns: 1fr;
  }
  
  .data-table {
    font-size: 0.875rem;
  }
  
  .data-table th,
  .data-table td {
    padding: 0.75rem 0.5rem;
  }
  
  .report-title h3 {
    font-size: 1.25rem;
  }
}

/* Print Styles */
@media print {
  .reports-header,
  .report-controls {
    display: none;
  }
  
  .report-content {
    box-shadow: none;
    border: none;
  }
  
  .report-section {
    padding: 1rem 0;
  }
  
  .summary-metrics {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .data-table {
    font-size: 0.75rem;
  }
}
</style>