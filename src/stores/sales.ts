import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import { useBooksStore } from './books'
import { supabase, type Sale as DBSale, type SaleItem as DBSaleItem } from '../lib/supabase'

export interface AppSaleItem {
  bookId: string
  title: string
  author: string
  price: number
  quantity: number
  subtotal: number
}

export interface AppSale {
  id: string
  customerId?: string
  customerName?: string
  total: number
  subtotal: number
  tax: number
  discount: number
  paymentMethod: 'cash' | 'card' | 'digital'
  status: string
  items: AppSaleItem[]
  time: string
  date: string
  notes?: string
  created_at?: string
  updated_at?: string
}

export const useSalesStore = defineStore('sales', () => {
  const sales = ref<AppSale[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  const currentSale = ref<{
    items: AppSaleItem[]
    customerId?: string
    customerName?: string
    paymentMethod: 'cash' | 'card' | 'digital'
    discount: number
    notes?: string
  }>({
    items: [],
    paymentMethod: 'cash',
    discount: 0
  })

  // Helper: format local YYYY-MM-DD (no timezone issues)
  function formatYYYYMMDDLocal(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  // Helper: map DB sale + DB items to AppSale
  function mapDBToAppSale(sale: DBSale, dbItems: DBSaleItem[]): AppSale {
    const booksStore = useBooksStore()
    const items: AppSaleItem[] = dbItems.map((it) => {
      const book = booksStore.getBookById(it.book_id)
      return {
        bookId: it.book_id,
        title: book?.title || '',
        author: book?.author || '',
        price: it.unit_price,
        quantity: it.quantity,
        subtotal: it.total_price
      }
    })

    const created = sale.created_at ? new Date(sale.created_at) : new Date()

    return {
      id: sale.id,
      customerId: sale.customer_id || undefined,
      customerName: undefined,
      total: sale.total,
      subtotal: sale.subtotal,
      tax: sale.tax,
      discount: sale.discount,
      paymentMethod: (sale.payment_method as 'cash' | 'card' | 'digital') || 'cash',
      status: sale.status,
      items,
      time: created.toTimeString().split(' ')[0],
      // Use local date to avoid UTC offset issues
      date: formatYYYYMMDDLocal(created),
      notes: undefined,
      created_at: sale.created_at,
      updated_at: sale.updated_at
    }
  }

  // Cargar ventas desde Supabase (sales + sale_items)
  async function loadSales() {
    loading.value = true
    error.value = null
    try {
      const { data: salesData, error: salesErr } = await supabase
        .from('sales')
        .select('*')
        .order('created_at', { ascending: false })

      if (salesErr) throw salesErr

      const ids = (salesData || []).map(s => s.id)
      let itemsBySaleId = new Map<string, DBSaleItem[]>()
      if (ids.length > 0) {
        const { data: itemsData, error: itemsErr } = await supabase
          .from('sale_items')
          .select('*')
          .in('sale_id', ids)
        if (itemsErr) throw itemsErr
        itemsBySaleId = new Map<string, DBSaleItem[]>()
        for (const it of itemsData || []) {
          const list = itemsBySaleId.get(it.sale_id) || []
          list.push(it)
          itemsBySaleId.set(it.sale_id, list)
        }
      }

      sales.value = (salesData || []).map(s => mapDBToAppSale(s, itemsBySaleId.get(s.id) || []))
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error loading sales'
      console.error('Error loading sales:', err)
    } finally {
      loading.value = false
    }
  }

  // Propiedades computadas
  const totalSales = computed(() => sales.value.length)
  const totalRevenue = computed(() => sales.value.reduce((sum, sale) => sum + sale.total, 0))
  const todaysSales = computed(() => {
    // Use local midnight boundaries and created_at when available
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
    return sales.value.filter(sale => {
      const d = sale.created_at ? new Date(sale.created_at) : new Date(`${sale.date}T00:00:00`)
      return d >= start && d < end
    })
  })
  const todaySales = computed(() => todaysSales.value)
  const todaysRevenue = computed(() => todaysSales.value.reduce((sum, sale) => sum + sale.total, 0))

  const currentSaleSubtotal = computed(() => 
    currentSale.value.items.reduce((sum, item) => sum + item.subtotal, 0)
  )

  const currentSaleTotal = computed(() => {
    const subtotal = currentSaleSubtotal.value
    const discountAmount = (subtotal * currentSale.value.discount) / 100
    const tax = subtotal * 0.08
    return subtotal - discountAmount + tax
  })

  const salesByDate = computed(() => {
    const grouped: { [date: string]: AppSale[] } = {}
    sales.value.forEach(sale => {
      if (!grouped[sale.date]) {
        grouped[sale.date] = []
      }
      grouped[sale.date].push(sale)
    })
    return grouped
  })

  const topSellingBooks = computed(() => {
    const bookSales: { [bookId: string]: { title: string, author: string, quantity: number, revenue: number } } = {}

    sales.value.forEach(sale => {
      sale.items.forEach(item => {
        if (!bookSales[item.bookId]) {
          bookSales[item.bookId] = {
            title: item.title,
            author: item.author,
            quantity: 0,
            revenue: 0
          }
        }
        bookSales[item.bookId].quantity += item.quantity
        bookSales[item.bookId].revenue += item.subtotal
      })
    })

    return Object.entries(bookSales)
      .map(([bookId, data]) => ({ bookId, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10)
  })

  // Acciones
  function addItemToCurrentSale(bookId: string, quantity: number = 1) {
    const booksStore = useBooksStore()
    const book = booksStore.getBookById(bookId)

    if (!book || book.stock < quantity) {
      throw new Error('Libro no disponible o stock insuficiente')
    }

    const existingItem = currentSale.value.items.find(item => item.bookId === bookId)

    if (existingItem) {
      existingItem.quantity += quantity
      existingItem.subtotal = existingItem.price * existingItem.quantity
    } else {
      const newItem: AppSaleItem = {
        bookId,
        title: book.title,
        author: book.author,
        price: book.price,
        quantity,
        subtotal: book.price * quantity
      }
      currentSale.value.items.push(newItem)
    }
  }

  function removeItemFromCurrentSale(bookId: string) {
    const index = currentSale.value.items.findIndex(item => item.bookId === bookId)
    if (index !== -1) {
      currentSale.value.items.splice(index, 1)
    }
  }

  function updateItemQuantity(bookId: string, quantity: number) {
    const item = currentSale.value.items.find(item => item.bookId === bookId)
    if (item) {
      if (quantity <= 0) {
        removeItemFromCurrentSale(bookId)
      } else {
        item.quantity = quantity
        item.subtotal = item.price * quantity
      }
    }
  }

  function setCustomer(customerId?: string, customerName?: string) {
    currentSale.value.customerId = customerId
    currentSale.value.customerName = customerName
  }

  function setPaymentMethod(method: 'cash' | 'card' | 'digital') {
    currentSale.value.paymentMethod = method
  }

  function setDiscount(discount: number) {
    currentSale.value.discount = Math.max(0, Math.min(100, discount))
  }

  function setNotes(notes: string) {
    currentSale.value.notes = notes
  }

  async function completeSale() {
    if (currentSale.value.items.length === 0) {
      throw new Error('No se puede completar la venta sin artículos')
    }

    loading.value = true
    error.value = null

    try {
      const booksStore = useBooksStore()
      const now = new Date()

      const subtotal = currentSaleSubtotal.value
      const discountAmount = (subtotal * currentSale.value.discount) / 100
      const tax = subtotal * 0.08
      const total = subtotal - discountAmount + tax

      // Insertar venta en Supabase (tabla sales)
      const saleInsert = {
        customer_id: currentSale.value.customerId || null,
        total,
        subtotal,
        tax,
        discount: currentSale.value.discount,
        payment_method: currentSale.value.paymentMethod,
        status: 'completed'
      }

      const { data: saleRow, error: saleErr } = await supabase
        .from('sales')
        .insert([saleInsert])
        .select()
        .single()

      if (saleErr) throw saleErr

      // Insertar items en tabla sale_items
      const itemsRows = currentSale.value.items.map(it => ({
        sale_id: saleRow.id,
        book_id: it.bookId,
        quantity: it.quantity,
        unit_price: it.price,
        total_price: it.subtotal
      }))

      if (itemsRows.length > 0) {
        const { error: itemsErr } = await supabase
          .from('sale_items')
          .insert(itemsRows)
        if (itemsErr) throw itemsErr
      }

      // Actualizar cantidades de libros
      for (const item of currentSale.value.items) {
        await booksStore.updateStock(item.bookId, -item.quantity)
      }

      // Construir venta para el estado local
      const newSale: AppSale = {
        id: saleRow.id,
        customerId: currentSale.value.customerId,
        customerName: currentSale.value.customerName,
        total,
        subtotal,
        tax,
        discount: currentSale.value.discount,
        paymentMethod: currentSale.value.paymentMethod,
        status: 'completed',
        items: [...currentSale.value.items],
        time: now.toTimeString().split(' ')[0],
        date: formatYYYYMMDDLocal(now),
        notes: currentSale.value.notes,
        created_at: saleRow.created_at,
        updated_at: saleRow.updated_at
      }

      sales.value.unshift(newSale)

      clearCurrentSale()

      return newSale
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Error completing sale'
      console.error('Error completing sale:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  function clearCurrentSale() {
    currentSale.value = {
      items: [],
      paymentMethod: 'cash',
      discount: 0
    }
  }

  function getSaleById(id: string) {
    return sales.value.find(sale => sale.id === id)
  }

  function getSalesByDateRange(startDate: string, endDate: string) {
    return sales.value.filter(sale => sale.date >= startDate && sale.date <= endDate)
  }

  function getRevenueByDateRange(startDate: string, endDate: string) {
    return getSalesByDateRange(startDate, endDate).reduce((sum, sale) => sum + sale.total, 0)
  }

  return {
    sales,
    loading,
    error,
    currentSale,
    totalSales,
    totalRevenue,
    todaysSales,
    todaySales,
    todaysRevenue,
    currentSaleSubtotal,
    currentSaleTotal,
    salesByDate,
    topSellingBooks,
    loadSales,
    addItemToCurrentSale,
    removeItemFromCurrentSale,
    updateItemQuantity,
    setCustomer,
    setPaymentMethod,
    setDiscount,
    setNotes,
    completeSale,
    clearCurrentSale,
    getSaleById,
    getSalesByDateRange,
    getRevenueByDateRange
  }
})