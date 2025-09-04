<script setup lang="ts">
import { ref, computed } from 'vue'
import { useBooksStore } from '../stores/books'
import { useSalesStore } from '../stores/sales'
import { useCustomersStore } from '../stores/customers'

const booksStore = useBooksStore()
const salesStore = useSalesStore()
const customersStore = useCustomersStore()

const searchQuery = ref('')
const selectedCustomer = ref('')
const paymentMethod = ref<'cash' | 'card' | 'digital'>('cash')
const amountPaid = ref(0)
const showCustomerModal = ref(false)
const showReceiptModal = ref(false)
const lastSaleId = ref('')
const lastAmountPaid = ref(0)

const newCustomer = ref({
  name: '',
  email: '',
  phone: '',
  address: ''
})

const paymentMethods = [
  { value: 'cash', label: '💵 Efectivo', icon: '💵' },
  { value: 'card', label: '💳 Tarjeta', icon: '💳' },
  { value: 'digital', label: '📱 Digital', icon: '📱' }
]

const filteredBooks = computed(() => {
  if (!searchQuery.value.trim()) return []
  
  const query = searchQuery.value.toLowerCase()
  return booksStore.books
    .filter(book => 
      book.quantity > 0 && (
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.isbn.toLowerCase().includes(query) ||
        book.genre.toLowerCase().includes(query)
      )
    )
    .slice(0, 10)
})

const subtotal = computed(() => salesStore.currentSaleSubtotal)
const tax = computed(() => subtotal.value * 0.08) // 8% impuesto
const total = computed(() => subtotal.value + tax.value)
const change = computed(() => Math.max(0, amountPaid.value - total.value))

const canCompleteSale = computed(() => {
  return salesStore.currentSale.items.length > 0 && 
         amountPaid.value >= total.value
})

function addToSale(book: { id: string; title: string; author: string; price: number; quantity: number }) {
  salesStore.addItemToCurrentSale(book.id)
  searchQuery.value = ''
}

function removeFromSale(bookId: string) {
  salesStore.removeItemFromCurrentSale(bookId)
}

function updateQuantity(bookId: string, quantity: number) {
  if (quantity <= 0) {
    removeFromSale(bookId)
  } else {
    salesStore.updateItemQuantity(bookId, quantity)
  }
}

function clearSale() {
  salesStore.clearCurrentSale()
  selectedCustomer.value = ''
  amountPaid.value = 0
}

function openCustomerModal() {
  newCustomer.value = {
    name: '',
    email: '',
    phone: '',
    address: ''
  }
  showCustomerModal.value = true
}

function closeCustomerModal() {
  showCustomerModal.value = false
}

async function addCustomer() {
  if (!newCustomer.value.name.trim()) {
    alert('Por favor ingrese el nombre del cliente')
    return
  }
  try {
    const customer = await customersStore.addCustomer(newCustomer.value)
    selectedCustomer.value = customer.id
    closeCustomerModal()
  } catch (err) {
    alert('No se pudo agregar el cliente. Intenta de nuevo.')
    console.error(err)
  }
}

async function completeSale() {
  if (!canCompleteSale.value) {
    alert('Por favor asegúrese de que todos los artículos estén agregados y el pago sea suficiente')
    return
  }
  try {
    const customer = selectedCustomer.value ? getCustomerById(selectedCustomer.value) : undefined
    salesStore.setCustomer(customer?.id, customer?.name)
    salesStore.setPaymentMethod(paymentMethod.value)
    salesStore.setNotes('')

    const completedSale = await salesStore.completeSale()
    lastSaleId.value = completedSale.id
    lastAmountPaid.value = amountPaid.value

    // Vaciar carrito/venta actual
    salesStore.clearCurrentSale()

    // Reiniciar formulario
    selectedCustomer.value = ''
    amountPaid.value = 0
    paymentMethod.value = 'cash'

    // Mostrar recibo
    showReceiptModal.value = true
  } catch (err) {
    alert('Hubo un problema al completar la venta.')
    console.error(err)
  }
}

function printReceipt() {
  window.print()
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}

function formatDateTime(date: Date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function getBookById(id: string) {
  return booksStore.books.find(book => book.id === id)
}

function getCustomerById(id: string) {
  return customersStore.customers.find(customer => customer.id === id)
}

function getSaleById(id: string) {
  return salesStore.sales.find(sale => sale.id === id)
}
</script>

<template>
  <div class="sales-container">
    <!-- Header -->
    <div class="sales-header">
      <h2>🛒 Punto de Venta</h2>
      <div class="header-stats">
        <div class="stat-item">
          <span class="stat-value">{{ formatCurrency(salesStore.todaysRevenue) }}</span>
          <span class="stat-label">Ventas de Hoy</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ salesStore.todaysSales.length }}</span>
          <span class="stat-label">Transacciones</span>
        </div>
      </div>
    </div>

    <div class="sales-layout">
      <!-- Left Panel - Product Search & Cart -->
      <div class="left-panel">
        <!-- Product Search -->
        <div class="search-section">
          <h3>🔍 Buscar Productos</h3>
          <div class="search-box">
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar libros por título, autor, ISBN o género..."
              class="search-input"
            >
          </div>
          
          <div v-if="filteredBooks.length > 0" class="search-results">
            <div 
              v-for="book in filteredBooks" 
              :key="book.id" 
              class="book-item"
              @click="addToSale(book)"
            >
              <div class="book-info">
                <strong>{{ book.title }}</strong>
                <div class="book-details">
                  <span>{{ book.author }}</span>
                  <span class="genre">{{ book.genre }}</span>
                </div>
                <div class="book-meta">
                  <span class="price">{{ formatCurrency(book.price) }}</span>
                  <span class="stock">Inventario: {{ book.quantity }}</span>
                </div>
              </div>
              <button class="add-btn">+</button>
            </div>
          </div>
          
          <div v-else-if="searchQuery.trim()" class="no-results">
            <p>No se encontraron libros que coincidan con "{{ searchQuery }}"</p>
          </div>
        </div>

        <!-- Shopping Cart -->
        <div class="cart-section">
          <div class="cart-header">
            <h3>🛒 Venta Actual</h3>
            <button 
              v-if="salesStore.currentSale.items.length > 0" 
              class="btn btn-secondary btn-sm"
              @click="clearSale"
            >
              Limpiar Todo
            </button>
          </div>
          
          <div v-if="salesStore.currentSale.items.length === 0" class="empty-cart">
            <p>No hay artículos en el carrito</p>
            <p class="help-text">Busque y haga clic en los libros para agregarlos a la venta</p>
          </div>
          
          <div v-else class="cart-items">
            <div 
              v-for="item in salesStore.currentSale.items" 
              :key="item.bookId" 
              class="cart-item"
            >
              <div class="item-info">
                <strong>{{ getBookById(item.bookId)?.title }}</strong>
                <div class="item-details">
                  <span>{{ getBookById(item.bookId)?.author }}</span>
                  <span class="item-price">{{ formatCurrency(item.price) }} c/u</span>
                </div>
              </div>
              <div class="item-controls">
                <div class="quantity-controls">
                  <button 
                    class="qty-btn"
                    @click="updateQuantity(item.bookId, item.quantity - 1)"
                  >
                    -
                  </button>
                  <span class="quantity">{{ item.quantity }}</span>
                  <button 
                    class="qty-btn"
                    @click="updateQuantity(item.bookId, item.quantity + 1)"
                    :disabled="item.quantity >= (getBookById(item.bookId)?.quantity || 0)"
                  >
                    +
                  </button>
                </div>
                <div class="item-total">{{ formatCurrency(item.price * item.quantity) }}</div>
                <button 
                  class="remove-btn"
                  @click="removeFromSale(item.bookId)"
                  title="Eliminar artículo"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Panel - Checkout -->
      <div class="right-panel">
        <div class="checkout-section">
          <h3>💳 Pagar</h3>
          
          <!-- Customer Selection -->
          <div class="form-group">
            <label>Cliente (Opcional)</label>
            <div class="customer-input">
              <select v-model="selectedCustomer" class="customer-select">
                <option value="">Cliente Ocasional</option>
                <option 
                  v-for="customer in customersStore.customers" 
                  :key="customer.id" 
                  :value="customer.id"
                >
                  {{ customer.name }} - {{ customer.phone }}
                </option>
              </select>
              <button class="btn btn-secondary btn-sm" @click="openCustomerModal">
                + Nuevo
              </button>
            </div>
          </div>

          <!-- Payment Method -->
          <div class="form-group">
            <label>Método de Pago</label>
            <div class="payment-methods">
              <label 
                v-for="method in paymentMethods" 
                :key="method.value" 
                class="payment-option"
                :class="{ active: paymentMethod === method.value }"
              >
                <input 
                  v-model="paymentMethod" 
                  type="radio" 
                  :value="method.value"
                  class="payment-radio"
                >
                <span class="payment-label">
                  <span class="payment-icon">{{ method.icon }}</span>
                  {{ method.label.replace(/^.+ /, '') }}
                </span>
              </label>
            </div>
          </div>

          <!-- Order Summary -->
          <div class="order-summary">
            <div class="summary-row">
              <span>Subtotal:</span>
              <span>{{ formatCurrency(subtotal) }}</span>
            </div>
            <div class="summary-row">
              <span>Impuesto (8%):</span>
              <span>{{ formatCurrency(tax) }}</span>
            </div>
            <div class="summary-row total">
              <span>Total:</span>
              <span>{{ formatCurrency(total) }}</span>
            </div>
          </div>

          <!-- Payment Input -->
          <div class="form-group">
            <label>Monto Pagado</label>
            <input 
              v-model.number="amountPaid" 
              type="number" 
              step="0.01" 
              min="0"
              class="amount-input"
              :class="{ error: amountPaid < total && amountPaid > 0 }"
            >
            <div v-if="amountPaid >= total && amountPaid > 0" class="change-display">
              Cambio: {{ formatCurrency(change) }}
            </div>
            <div v-else-if="amountPaid > 0 && amountPaid < total" class="insufficient-funds">
              Pago insuficiente: faltan {{ formatCurrency(total - amountPaid) }}
            </div>
          </div>

          <!-- Quick Amount Buttons -->
          <div class="quick-amounts">
            <button 
              class="btn btn-outline"
              @click="amountPaid = total"
            >
              Exacto
            </button>
            <button 
              class="btn btn-outline"
              @click="amountPaid = Math.ceil(total)"
            >
              {{ formatCurrency(Math.ceil(total)) }}
            </button>
            <button 
              class="btn btn-outline"
              @click="amountPaid = Math.ceil(total / 5) * 5"
            >
              {{ formatCurrency(Math.ceil(total / 5) * 5) }}
            </button>
          </div>

          <!-- Complete Sale Button -->
          <button 
            class="btn btn-primary btn-large"
            :disabled="!canCompleteSale"
            @click="completeSale"
          >
            🛒 Completar Venta
          </button>
        </div>
      </div>
    </div>

    <!-- Add Customer Modal -->
    <div v-if="showCustomerModal" class="modal-overlay" @click="closeCustomerModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Agregar Nuevo Cliente</h3>
          <button class="close-btn" @click="closeCustomerModal">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Nombre *</label>
            <input v-model="newCustomer.name" type="text" required>
          </div>
          <div class="form-group">
            <label>Teléfono</label>
            <input v-model="newCustomer.phone" type="tel">
          </div>
          <div class="form-group">
            <label>Correo</label>
            <input v-model="newCustomer.email" type="email">
          </div>
          <div class="form-group">
            <label>Dirección</label>
            <textarea v-model="newCustomer.address" rows="2"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeCustomerModal">Cancelar</button>
          <button class="btn btn-primary" @click="addCustomer">Agregar Cliente</button>
        </div>
      </div>
    </div>

    <!-- Receipt Modal -->
    <div v-if="showReceiptModal" class="modal-overlay" @click="showReceiptModal = false">
      <div class="modal receipt-modal" @click.stop>
        <div class="modal-header">
          <h3>Venta Completada</h3>
          <button class="close-btn" @click="showReceiptModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="receipt" v-if="getSaleById(lastSaleId)">
            <div class="receipt-header">
              <h2>📚 Gestor de Librería</h2>
              <p>Recibo de Librería</p>
              <p>{{ formatDateTime(new Date(getSaleById(lastSaleId)?.created_at || Date.now())) }}</p>
              <p>Venta #{{ lastSaleId.slice(-6).toUpperCase() }}</p>
            </div>
            
            <div class="receipt-customer" v-if="getSaleById(lastSaleId)?.customerId">
              <p><strong>Cliente:</strong> {{ getCustomerById(getSaleById(lastSaleId)?.customerId || '')?.name }}</p>
            </div>
            
            <div class="receipt-items">
              <div class="receipt-item" v-for="item in getSaleById(lastSaleId)?.items" :key="item.bookId">
                <div class="item-line">
                  <span class="item-name">{{ getBookById(item.bookId)?.title }}</span>
                  <span class="item-qty">{{ item.quantity }}x</span>
                  <span class="item-price">{{ formatCurrency(item.price * item.quantity) }}</span>
                </div>
                <div class="item-author">{{ getBookById(item.bookId)?.author }}</div>
              </div>
            </div>
            
            <div class="receipt-totals">
              <div class="total-line">
                <span>Subtotal:</span>
                <span>{{ formatCurrency(getSaleById(lastSaleId)?.subtotal || 0) }}</span>
              </div>
              <div class="total-line">
                <span>Impuesto:</span>
                <span>{{ formatCurrency(getSaleById(lastSaleId)?.tax || 0) }}</span>
              </div>
              <div class="total-line final">
                <span>Total:</span>
                <span>{{ formatCurrency(getSaleById(lastSaleId)?.total || 0) }}</span>
              </div>
              <div class="total-line">
                <span>Pagado ({{ getSaleById(lastSaleId)?.paymentMethod }}):</span>
                <span>{{ formatCurrency(lastAmountPaid) }}</span>
              </div>
              <div class="total-line" v-if="lastAmountPaid > (getSaleById(lastSaleId)?.total || 0)">
                <span>Cambio:</span>
                <span>{{ formatCurrency(lastAmountPaid - (getSaleById(lastSaleId)?.total || 0)) }}</span>
              </div>
            </div>
            
            <div class="receipt-footer">
              <p>¡Gracias por su compra!</p>
              <p>¡Vuelva pronto! 📖</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showReceiptModal = false">Cerrar</button>
          <button class="btn btn-primary" @click="printReceipt">🖨️ Imprimir Recibo</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sales-container {
  padding: 0;
  height: 100%;
}

.sales-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
}

.sales-header h2 {
  margin: 0;
  color: #2c3e50;
}

.header-stats {
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
  color: #27ae60;
}

.stat-label {
  display: block;
  font-size: 0.875rem;
  color: #7f8c8d;
  margin-top: 0.25rem;
}

.sales-layout {
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 2rem;
  height: calc(100vh - 200px);
}

.left-panel,
.right-panel {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.search-section,
.cart-section,
.checkout-section {
  padding: 1.5rem;
}

.search-section {
  border-bottom: 1px solid #e1e8ed;
}

.search-section h3,
.cart-section h3,
.checkout-section h3 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
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

.search-results {
  max-height: 300px;
  overflow-y: auto;
  margin-top: 1rem;
}

.book-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border: 1px solid #e1e8ed;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.book-item:hover {
  background: #f8f9fa;
  border-color: #3498db;
}

.book-info {
  flex: 1;
}

.book-info strong {
  display: block;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.book-details {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
  color: #7f8c8d;
}

.genre {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.book-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.875rem;
}

.price {
  font-weight: 600;
  color: #27ae60;
}

.stock {
  color: #7f8c8d;
}

.add-btn {
  background: #3498db;
  color: white;
  border: none;
  border-radius: 50%;
  width: 2rem;
  height: 2rem;
  font-size: 1.25rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.add-btn:hover {
  background: #2980b9;
}

.no-results {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

.cart-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.cart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.empty-cart {
  text-align: center;
  padding: 2rem;
  color: #7f8c8d;
}

.help-text {
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.cart-items {
  flex: 1;
  overflow-y: auto;
}

.cart-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1rem;
  border-bottom: 1px solid #e1e8ed;
  gap: 1rem;
}

.item-info {
  flex: 1;
}

.item-info strong {
  display: block;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.item-details {
  font-size: 0.875rem;
  color: #7f8c8d;
}

.item-price {
  color: #27ae60;
  font-weight: 500;
}

.item-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.5rem;
}

.quantity-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.qty-btn {
  background: #f8f9fa;
  border: 1px solid #e1e8ed;
  border-radius: 4px;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.qty-btn:hover:not(:disabled) {
  background: #e9ecef;
}

.qty-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.quantity {
  min-width: 2rem;
  text-align: center;
  font-weight: 500;
}

.item-total {
  font-weight: 600;
  color: #27ae60;
}

.remove-btn {
  background: #e74c3c;
  color: white;
  border: none;
  border-radius: 4px;
  width: 2rem;
  height: 2rem;
  cursor: pointer;
  font-size: 1.25rem;
  transition: background-color 0.3s ease;
}

.remove-btn:hover {
  background: #c0392b;
}

.checkout-section {
  height: 100%;
  overflow-y: auto;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #2c3e50;
}

.customer-input {
  display: flex;
  gap: 0.5rem;
}

.customer-select {
  flex: 1;
  padding: 0.75rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  font-size: 0.875rem;
}

.payment-methods {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.payment-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.payment-option.active {
  border-color: #3498db;
  background: #f8f9fa;
}

.payment-radio {
  display: none;
}

.payment-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.payment-icon {
  font-size: 1.5rem;
}

.order-summary {
  background: #f8f9fa;
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1.5rem;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.summary-row.total {
  font-weight: 600;
  font-size: 1.125rem;
  color: #2c3e50;
  border-top: 1px solid #e1e8ed;
  padding-top: 0.5rem;
  margin-top: 0.5rem;
}

.amount-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  font-size: 1.125rem;
  font-weight: 500;
  transition: border-color 0.3s ease;
}

.amount-input:focus {
  outline: none;
  border-color: #3498db;
}

.amount-input.error {
  border-color: #e74c3c;
}

.change-display {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #d4edda;
  color: #155724;
  border-radius: 4px;
  font-weight: 500;
}

.insufficient-funds {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: #f8d7da;
  color: #721c24;
  border-radius: 4px;
  font-weight: 500;
}

.quick-amounts {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

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
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #2980b9;
}

.btn-primary:disabled {
  background: #bdc3c7;
  cursor: not-allowed;
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-outline {
  background: transparent;
  color: #3498db;
  border: 2px solid #3498db;
}

.btn-outline:hover {
  background: #3498db;
  color: white;
}

.btn-sm {
  padding: 0.5rem 1rem;
  font-size: 0.75rem;
}

.btn-large {
  width: 100%;
  padding: 1rem;
  font-size: 1.125rem;
  font-weight: 600;
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
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.receipt-modal {
  max-width: 400px;
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

.modal-body .form-group {
  margin-bottom: 1rem;
}

.modal-body input,
.modal-body textarea {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.3s ease;
}

.modal-body input:focus,
.modal-body textarea:focus {
  outline: none;
  border-color: #3498db;
}

/* Receipt Styles */
.receipt {
  font-family: 'Courier New', monospace;
  max-width: 300px;
  margin: 0 auto;
}

.receipt-header {
  text-align: center;
  border-bottom: 2px solid #000;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.receipt-header h2 {
  margin: 0 0 0.5rem 0;
  font-size: 1.25rem;
}

.receipt-header p {
  margin: 0.25rem 0;
  font-size: 0.875rem;
}

.receipt-customer {
  margin-bottom: 1rem;
  font-size: 0.875rem;
}

.receipt-items {
  margin-bottom: 1rem;
}

.receipt-item {
  margin-bottom: 0.75rem;
}

.item-line {
  display: flex;
  justify-content: space-between;
  font-size: 0.875rem;
}

.item-name {
  flex: 1;
  margin-right: 0.5rem;
}

.item-qty {
  margin-right: 0.5rem;
}

.item-author {
  font-size: 0.75rem;
  color: #666;
  margin-left: 1rem;
}

.receipt-totals {
  border-top: 1px solid #000;
  padding-top: 0.5rem;
  margin-bottom: 1rem;
}

.total-line {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
  font-size: 0.875rem;
}

.total-line.final {
  font-weight: bold;
  font-size: 1rem;
  border-top: 1px solid #000;
  padding-top: 0.25rem;
  margin-top: 0.25rem;
}

.receipt-footer {
  text-align: center;
  border-top: 2px solid #000;
  padding-top: 1rem;
  font-size: 0.875rem;
}

.receipt-footer p {
  margin: 0.25rem 0;
}

/* Responsive Design */
@media (max-width: 1024px) {
  .sales-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
    height: auto;
  }
  
  .right-panel {
    order: -1;
  }
  
  .left-panel {
    height: 600px;
  }
}

@media (max-width: 768px) {
  .sales-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-stats {
    justify-content: space-around;
    width: 100%;
  }
  
  .payment-methods {
    grid-template-columns: 1fr;
  }
  
  .quick-amounts {
    flex-direction: column;
  }
  
  .customer-input {
    flex-direction: column;
  }
}

@media print {
  .modal-overlay,
  .modal-header,
  .modal-footer {
    display: none !important;
  }
  
  .modal {
    box-shadow: none;
    max-width: none;
    width: auto;
  }
  
  .receipt {
    max-width: none;
  }
}
</style>