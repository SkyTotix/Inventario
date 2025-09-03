<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBooksStore, type AppBook } from '../stores/books'

const booksStore = useBooksStore()

const showAddModal = ref(false)
const showEditModal = ref(false)
const showDeleteModal = ref(false)
const selectedBook = ref<AppBook | null>(null)

const newBook = ref({
  title: '',
  author: '',
  isbn: '',
  genre: '',
  price: 0,
  cost: 0,
  quantity: 0,
  description: '',
  publishedYear: new Date().getFullYear(),
  condition: 'new' as 'new' | 'used' | 'damaged',
  location: ''
})

const editBook = ref<Partial<AppBook>>({})

const genres = [
  'Literatura Clásica',
  'Ciencia Ficción',
  'Fantasía',
  'Misterio',
  'Suspenso',
  'Romance',
  'Ficción Histórica',
  'Biografía',
  'Autoayuda',
  'Negocios',
  'Infantil',
  'Juvenil',
  'Poesía',
  'Drama',
  'Otro'
]

const conditions = [
  { value: 'new', label: 'Nuevo' },
  { value: 'used', label: 'Usado' },
  { value: 'damaged', label: 'Dañado' }
]

const sortBy = ref('title')
const sortOrder = ref<'asc' | 'desc'>('asc')

const sortedBooks = computed(() => {
  const books = [...booksStore.filteredBooks]
  return books.sort((a, b) => {
    const field = sortBy.value as keyof AppBook
    const numericFields = new Set(['price', 'quantity'])

    const aRaw = (a as any)[field]
    const bRaw = (b as any)[field]

    if (numericFields.has(field as string)) {
      const an = Number(aRaw ?? 0)
      const bn = Number(bRaw ?? 0)
      return sortOrder.value === 'asc' ? an - bn : bn - an
    } else {
      const as = String(aRaw ?? '').toLowerCase()
      const bs = String(bRaw ?? '').toLowerCase()
      return sortOrder.value === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as)
    }
  })
})

function openAddModal() {
  newBook.value = {
    title: '',
    author: '',
    isbn: '',
    genre: '',
    price: 0,
    cost: 0,
    quantity: 0,
    description: '',
    publishedYear: new Date().getFullYear(),
    condition: 'new',
    location: ''
  }
  showAddModal.value = true
}

function openEditModal(book: AppBook) {
  selectedBook.value = book
  editBook.value = { ...book }
  showEditModal.value = true
}

function openDeleteModal(book: AppBook) {
  selectedBook.value = book
  showDeleteModal.value = true
}

function closeModals() {
  showAddModal.value = false
  showEditModal.value = false
  showDeleteModal.value = false
  selectedBook.value = null
}

async function addBook() {
  if (!newBook.value.title || !newBook.value.author || !newBook.value.genre) {
    alert('Por favor complete todos los campos requeridos')
    return
  }
  try {
    await booksStore.addBook({ ...(newBook.value as any), stock: newBook.value.quantity } as any)
    closeModals()
  } catch (e: any) {
    alert(booksStore.error || e?.message || 'Error al agregar libro')
  }
}

async function updateBook() {
  if (!selectedBook.value || !editBook.value.title || !editBook.value.author) {
    alert('Por favor complete todos los campos requeridos')
    return
  }
  try {
    await booksStore.updateBook(selectedBook.value.id, editBook.value)
    closeModals()
  } catch (e: any) {
    alert(booksStore.error || e?.message || 'Error al actualizar libro')
  }
}

async function deleteBook() {
  if (!selectedBook.value) return
  try {
    await booksStore.deleteBook(selectedBook.value.id)
    closeModals()
  } catch (e: any) {
    alert(booksStore.error || e?.message || 'Error al eliminar libro')
  }
}

function setSortBy(field: string) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
}

function getStockStatus(quantity: number) {
  if (quantity === 0) return 'out-of-stock'
  if (quantity <= 2) return 'low-stock'
  return 'in-stock'
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}
</script>

<template>
  <div class="inventory-container">
    <!-- Header Section -->
    <div class="inventory-header">
      <div class="header-left">
        <h2>📖 Inventario de Libros</h2>
        <div class="stats">
          <div class="stat-item">
            <span class="stat-value">{{ booksStore.totalBooks }}</span>
            <span class="stat-label">Total de Libros</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ formatCurrency(booksStore.totalValue) }}</span>
            <span class="stat-label">Valor Total</span>
          </div>
          <div class="stat-item">
            <span class="stat-value">{{ booksStore.lowStockBooks.length }}</span>
            <span class="stat-label">Stock Bajo</span>
          </div>
        </div>
      </div>
      <button class="btn btn-primary" @click="openAddModal">
        ➕ Agregar Nuevo Libro
      </button>
    </div>

    <!-- Search and Filters -->
    <div class="filters-section">
      <div class="search-box">
        <input
          type="text"
          placeholder="Buscar libros por título, autor, ISBN o género..."
          :value="booksStore.searchQuery"
          @input="booksStore.setSearchQuery(($event.target as HTMLInputElement)?.value || '')"
          class="search-input"
        >
      </div>
      <div class="filter-controls">
        <select 
          :value="booksStore.selectedGenre" 
          @change="booksStore.setGenreFilter(($event.target as HTMLSelectElement)?.value || '')"
          class="filter-select"
        >
          <option value="">Todos los Géneros</option>
          <option v-for="genre in booksStore.genres" :key="genre" :value="genre">
            {{ genre }}
          </option>
        </select>
        <select 
          :value="booksStore.selectedCondition" 
          @change="booksStore.setConditionFilter(($event.target as HTMLSelectElement)?.value || '')"
          class="filter-select"
        >
          <option value="">Todas las Condiciones</option>
          <option v-for="condition in conditions" :key="condition.value" :value="condition.value">
            {{ condition.label }}
          </option>
        </select>
        <button class="btn btn-secondary" @click="booksStore.clearFilters()">
          Limpiar Filtros
        </button>
      </div>
    </div>

    <!-- Books Table -->
    <div class="table-container">
      <table class="books-table">
        <thead>
          <tr>
            <th @click="setSortBy('title')" class="sortable">
              Título
              <span v-if="sortBy === 'title'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="setSortBy('author')" class="sortable">
              Autor
              <span v-if="sortBy === 'author'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="setSortBy('genre')" class="sortable">
              Género
              <span v-if="sortBy === 'genre'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="setSortBy('price')" class="sortable">
              Precio
              <span v-if="sortBy === 'price'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th @click="setSortBy('quantity')" class="sortable">
              Cantidad
              <span v-if="sortBy === 'quantity'" class="sort-indicator">
                {{ sortOrder === 'asc' ? '↑' : '↓' }}
              </span>
            </th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="book in sortedBooks" :key="book.id">
            <td>{{ book.title }}</td>
            <td>{{ book.author }}</td>
            <td>{{ book.genre }}</td>
            <td>{{ formatCurrency(book.price) }}</td>
            <td>
              <span :class="['stock-badge', getStockStatus(book.quantity)]">{{ book.quantity }}</span>
            </td>
            <td>
              <div class="actions">
                <button class="btn-icon btn-edit" @click="openEditModal(book)" title="Editar">
                  ✏️
                </button>
                <button class="btn-icon btn-delete" @click="openDeleteModal(book)" title="Eliminar">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
      
      <div v-if="sortedBooks.length === 0" class="empty-state">
        <p>No se encontraron libros que coincidan con sus criterios.</p>
      </div>
    </div>

    <!-- Add Book Modal -->
    <div v-if="showAddModal" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Agregar Nuevo Libro</h3>
          <button class="close-btn" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Título *</label>
              <input v-model="newBook.title" type="text" required>
            </div>
            <div class="form-group">
              <label>Autor *</label>
              <input v-model="newBook.author" type="text" required>
            </div>
            <div class="form-group">
              <label>ISBN</label>
              <input v-model="newBook.isbn" type="text">
            </div>
            <div class="form-group">
              <label>Género *</label>
              <select v-model="newBook.genre" required>
                <option value="">Seleccionar Género</option>
                <option v-for="genre in genres" :key="genre" :value="genre">
                  {{ genre }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Precio *</label>
              <input v-model.number="newBook.price" type="number" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label>Costo</label>
              <input v-model.number="newBook.cost" type="number" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label>Cantidad *</label>
              <input v-model.number="newBook.quantity" type="number" min="0" required>
            </div>
            <div class="form-group">
              <label>Año de Publicación</label>
              <input v-model.number="newBook.publishedYear" type="number" min="1000" :max="new Date().getFullYear()">
            </div>
            <div class="form-group">
              <label>Condición</label>
              <select v-model="newBook.condition">
                <option v-for="condition in conditions" :key="condition.value" :value="condition.value">
                  {{ condition.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Ubicación</label>
              <input v-model="newBook.location" type="text" placeholder="ej., Estante A1">
            </div>
            <div class="form-group full-width">
              <label>Descripción</label>
              <textarea v-model="newBook.description" rows="3"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModals">Cancelar</button>
          <button class="btn btn-primary" @click="addBook">Agregar Libro</button>
        </div>
      </div>
    </div>

    <!-- Edit Book Modal -->
    <div v-if="showEditModal" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Editar Libro</h3>
          <button class="close-btn" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <div class="form-grid">
            <div class="form-group">
              <label>Título *</label>
              <input v-model="editBook.title" type="text" required>
            </div>
            <div class="form-group">
              <label>Autor *</label>
              <input v-model="editBook.author" type="text" required>
            </div>
            <div class="form-group">
              <label>ISBN</label>
              <input v-model="editBook.isbn" type="text">
            </div>
            <div class="form-group">
              <label>Género *</label>
              <select v-model="editBook.genre" required>
                <option value="">Seleccionar Género</option>
                <option v-for="genre in genres" :key="genre" :value="genre">
                  {{ genre }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Precio *</label>
              <input v-model.number="editBook.price" type="number" step="0.01" min="0" required>
            </div>
            <div class="form-group">
              <label>Costo</label>
              <input v-model.number="editBook.cost" type="number" step="0.01" min="0">
            </div>
            <div class="form-group">
              <label>Cantidad *</label>
              <input v-model.number="editBook.quantity" type="number" min="0" required>
            </div>
            <div class="form-group">
              <label>Año de Publicación</label>
              <input v-model.number="editBook.publishedYear" type="number" min="1000" :max="new Date().getFullYear()">
            </div>
            <div class="form-group">
              <label>Condición</label>
              <select v-model="editBook.condition">
                <option v-for="condition in conditions" :key="condition.value" :value="condition.value">
                  {{ condition.label }}
                </option>
              </select>
            </div>
            <div class="form-group">
              <label>Ubicación</label>
              <input v-model="editBook.location" type="text" placeholder="ej., Estante A1">
            </div>
            <div class="form-group full-width">
              <label>Descripción</label>
              <textarea v-model="editBook.description" rows="3"></textarea>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModals">Cancelar</button>
          <button class="btn btn-primary" @click="updateBook">Guardar Cambios</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div v-if="showDeleteModal" class="modal-overlay" @click="closeModals">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Confirmar Eliminación</h3>
          <button class="close-btn" @click="closeModals">×</button>
        </div>
        <div class="modal-body">
          <p>¿Estás seguro de que deseas eliminar el libro "{{ selectedBook?.title }}"?</p>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeModals">Cancelar</button>
          <button class="btn btn-danger" @click="deleteBook">Eliminar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.inventory-container {
  padding: 0;
}

.inventory-header {
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
  min-width: 150px;
}

.table-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  overflow: hidden;
}

.books-table {
  width: 100%;
  border-collapse: collapse;
}

.books-table th {
  background: #f8f9fa;
  padding: 1rem;
  text-align: left;
  font-weight: 600;
  color: #2c3e50;
  border-bottom: 2px solid #e1e8ed;
}

.books-table th.sortable {
  cursor: pointer;
  user-select: none;
  position: relative;
}

.books-table th.sortable:hover {
  background: #e9ecef;
}

.sort-indicator {
  margin-left: 0.5rem;
  font-size: 0.875rem;
}

.books-table td {
  padding: 1rem;
  border-bottom: 1px solid #e1e8ed;
  vertical-align: top;
}

.book-row:hover {
  background: #f8f9fa;
}

.book-title strong {
  display: block;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.book-title small {
  color: #7f8c8d;
  font-size: 0.75rem;
}

.genre-tag {
  background: #e3f2fd;
  color: #1976d2;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
}

.price {
  font-weight: 600;
  color: #27ae60;
}

.stock-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
}

.stock-badge.in-stock {
  background: #d4edda;
  color: #155724;
}

.stock-badge.low-stock {
  background: #fff3cd;
  color: #856404;
}

.stock-badge.out-of-stock {
  background: #f8d7da;
  color: #721c24;
}

.condition-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: capitalize;
}

.condition-badge.new {
  background: #d4edda;
  color: #155724;
}

.condition-badge.used {
  background: #fff3cd;
  color: #856404;
}

.condition-badge.damaged {
  background: #f8d7da;
  color: #721c24;
}

.actions {
  display: flex;
  gap: 0.5rem;
}

.btn-icon {
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  padding: 0.25rem 0.35rem;
  border-radius: 6px;
  transition: background-color 0.15s ease;
}

.btn-icon:hover {
  background-color: rgba(0,0,0,0.06);
}

.btn-edit {
  color: #2c3e50;
}

.btn-delete {
  color: #e74c3c;
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
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-small {
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
.form-group select,
.form-group textarea {
  padding: 0.75rem;
  border: 2px solid #e1e8ed;
  border-radius: 6px;
  font-size: 0.875rem;
  transition: border-color 0.3s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #3498db;
}

.warning {
  color: #e74c3c;
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .inventory-header {
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
  
  .books-table {
    min-width: 800px;
  }
  
  .form-grid {
    grid-template-columns: 1fr;
  }
  
  .modal {
    margin: 1rem;
    max-width: none;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .form-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>