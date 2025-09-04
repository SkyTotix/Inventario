import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { supabase, type Book } from '../lib/supabase'

// Interfaz extendida para compatibilidad con la aplicación existente
export interface AppBook extends Book {
  cost?: number
  quantity: number // Mapea a stock
  publishedYear?: number
  condition?: 'new' | 'used' | 'damaged'
  location?: string
  dateAdded?: string
}

export const useBooksStore = defineStore('books', () => {
  const books = ref<AppBook[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const searchQuery = ref('')
  const selectedGenre = ref('')
  const selectedCondition = ref('')

  // Computed properties
  const totalBooks = computed(() => books.value.reduce((sum, book) => sum + book.stock, 0))
  const totalValue = computed(() => books.value.reduce((sum, book) => sum + (book.price * book.stock), 0))
  const lowStockBooks = computed(() => books.value.filter(book => book.stock <= 2))
  const outOfStockBooks = computed(() => books.value.filter(book => book.stock === 0))
  const genres = computed(() => [...new Set(books.value.map(book => book.genre))])

  // Función para mapear Book de Supabase a AppBook
  const mapToAppBook = (book: Book): AppBook => ({
    ...book,
    quantity: book.stock,
    dateAdded: book.created_at?.split('T')[0]
  })

  // Función para mapear AppBook a Book de Supabase
  const mapToSupabaseBook = (book: Partial<AppBook>): Partial<Book> => {
    const { quantity, dateAdded: _dateAdded, cost: _cost, publishedYear: _publishedYear, condition: _condition, location: _location, id: _id, created_at: _created_at, updated_at: _updated_at, ...rest } = book
    void _dateAdded; void _cost; void _publishedYear; void _condition; void _location; void _id; void _created_at; void _updated_at
    const result: Partial<Book> = { ...rest }

    // Asegurar tipos numéricos correctos
    if (result.price !== undefined) {
      result.price = Number(result.price as unknown as number)
    }

    if (quantity !== undefined) {
      result.stock = Number(quantity as unknown as number)
    } else if (result.stock !== undefined) {
      result.stock = Number(result.stock as unknown as number)
    }

    // Normalizar ISBN vacío a NULL (soporta INSERT y UPDATE para limpiar el campo)
    if (result.isbn !== undefined && String(result.isbn).trim() === '') {
      result.isbn = null as unknown as string
    }

    return result
  }
  
  const filteredBooks = computed(() => {
    let filtered = books.value
    
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query) ||
        book.isbn?.toLowerCase().includes(query) ||
        book.genre.toLowerCase().includes(query)
      )
    }
    
    if (selectedGenre.value) {
      filtered = filtered.filter(book => book.genre === selectedGenre.value)
    }
    
    if (selectedCondition.value) {
      filtered = filtered.filter(book => book.condition === selectedCondition.value)
    }
    
    return filtered
  })

  // Función para cargar libros desde Supabase con paginación
  async function loadBooks(limit = 1000, offset = 0) {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: supabaseError } = await supabase
        .from('books')
        .select('id, title, author, isbn, genre, price, stock, description, created_at, updated_at')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)
      
      if (supabaseError) throw supabaseError
      
      if (offset === 0) {
        books.value = data?.map(mapToAppBook) || []
      } else {
        books.value.push(...(data?.map(mapToAppBook) || []))
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al cargar libros'
      console.error('Error loading books:', err)
    } finally {
      loading.value = false
    }
  }
  
  // Función para cargar más libros (paginación infinita)
  async function loadMoreBooks() {
    if (!loading.value) {
      await loadBooks(100, books.value.length)
    }
  }
  
  // Función para buscar libros con límite
  async function searchBooks(query: string, limit = 50) {
    try {
      loading.value = true
      error.value = null
      
      const { data, error: supabaseError } = await supabase
        .from('books')
        .select('id, title, author, isbn, genre, price, stock')
        .or(`title.ilike.%${query}%,author.ilike.%${query}%,isbn.ilike.%${query}%,genre.ilike.%${query}%`)
        .limit(limit)
        .order('title')
      
      if (supabaseError) throw supabaseError
      
      return data?.map(mapToAppBook) || []
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al buscar libros'
      console.error('Error searching books:', err)
      return []
    } finally {
      loading.value = false
    }
  }

  // Actions
  async function addBook(book: Omit<AppBook, 'id' | 'dateAdded'>) {
    try {
      loading.value = true
      error.value = null
      
      const supabaseBook = mapToSupabaseBook(book)
      const { data, error: supabaseError } = await supabase
        .from('books')
        .insert([supabaseBook])
        .select()
        .single()
      
      if (supabaseError) throw supabaseError
      
      const newBook = mapToAppBook(data)
      books.value.unshift(newBook)
      return newBook
    } catch (err: unknown) {
      // Manejo de errores comunes
      let friendly = 'Error al agregar libro'
      if ((err as { code?: string })?.code === '23505') {
        // unique_violation: probablemente ISBN duplicado
        friendly = 'El ISBN ya existe. Por favor ingrese un ISBN único o deje el campo vacío.'
      }
      error.value = friendly
      console.error('Error adding book:', err)
      throw new Error(friendly)
    } finally {
      loading.value = false
    }
  }

  async function updateBook(id: string, updates: Partial<AppBook>) {
    try {
      loading.value = true
      error.value = null
      
      const supabaseUpdates = mapToSupabaseBook(updates)
      const { data, error: supabaseError } = await supabase
        .from('books')
        .update(supabaseUpdates)
        .eq('id', id)
        .select()
        .single()
      
      if (supabaseError) throw supabaseError
      
      const updatedBook = mapToAppBook(data)
      const index = books.value.findIndex(book => book.id === id)
      if (index !== -1) {
        books.value[index] = updatedBook
      }
      return updatedBook
    } catch (err: unknown) {
      let friendly = 'Error al actualizar libro'
      const errorObj = err as { code?: string; message?: string }
      if (errorObj?.code === '23505') {
        friendly = 'El ISBN ya existe. Por favor ingrese un ISBN único o deje el campo vacío.'
      } else if (errorObj?.code === '42501' || /row-level security|permission denied/i.test(errorObj?.message || '')) {
        friendly = 'No tienes permisos para actualizar libros.'
      }
      error.value = friendly
      console.error('Error updating book:', err)
      throw new Error(friendly)
    } finally {
      loading.value = false
    }
  }

  async function deleteBook(id: string) {
    try {
      loading.value = true
      error.value = null
      
      const { error: supabaseError } = await supabase
        .from('books')
        .delete()
        .eq('id', id)
      
      if (supabaseError) throw supabaseError
      
      const index = books.value.findIndex(book => book.id === id)
      if (index !== -1) {
        books.value.splice(index, 1)
      }
    } catch (err: unknown) {
      let friendly = 'Error al eliminar libro'
      const errorObj = err as { code?: string; message?: string }
      if (errorObj?.code === '23503') {
        // foreign_key_violation: libro referenciado por ventas
        friendly = 'No se puede eliminar el libro porque tiene ventas asociadas.'
      } else if (errorObj?.code === '42501' || /row-level security|permission denied/i.test(errorObj?.message || '')) {
        friendly = 'No tienes permisos para eliminar libros.'
      }
      error.value = friendly
      console.error('Error deleting book:', err)
      throw new Error(friendly)
    } finally {
      loading.value = false
    }
  }

  function getBookById(id: string) {
    return books.value.find(book => book.id === id)
  }

  async function updateStock(id: string, quantity: number) {
    try {
      const book = books.value.find(book => book.id === id)
      if (!book) return
      
      const newStock = Math.max(0, book.stock + quantity)
      await updateBook(id, { stock: newStock })
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error al actualizar stock'
      console.error('Error updating stock:', err)
      throw err
    }
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setGenreFilter(genre: string) {
    selectedGenre.value = genre
  }

  function setConditionFilter(condition: string) {
    selectedCondition.value = condition
  }

  function clearFilters() {
    searchQuery.value = ''
    selectedGenre.value = ''
    selectedCondition.value = ''
  }

  return {
    books,
    loading,
    error,
    searchQuery,
    selectedGenre,
    selectedCondition,
    totalBooks,
    totalValue,
    lowStockBooks,
    outOfStockBooks,
    genres,
    filteredBooks,
    loadBooks,
    loadMoreBooks,
    searchBooks,
    addBook,
    updateBook,
    deleteBook,
    getBookById,
    updateStock,
    setSearchQuery,
    setGenreFilter,
    setConditionFilter,
    clearFilters
  }
})