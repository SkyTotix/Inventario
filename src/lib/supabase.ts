import { createClient } from '@supabase/supabase-js'

// Requerimos variables de entorno en todos los entornos (dev/preview/prod)
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('[Supabase] Variables de entorno no configuradas: VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types
export interface Book {
  id: string
  title: string
  author: string
  isbn: string
  genre: string
  price: number
  stock: number
  description?: string
  created_at?: string
  updated_at?: string
}

export interface Customer {
  id: string
  name: string
  email: string
  phone: string
  address: string
  created_at?: string
  updated_at?: string
}

export interface Sale {
  id: string
  customer_id: string
  total: number
  subtotal: number
  tax: number
  discount: number
  payment_method: string
  status: string
  items?: string // JSON string of sale items
  customer_name?: string // Customer name for quick reference
  date?: string // Sale date in YYYY-MM-DD format
  notes?: string // Additional notes
  created_at?: string
  updated_at?: string
}

export interface SaleItem {
  id: string
  sale_id: string
  book_id: string
  quantity: number
  unit_price: number
  total_price: number
  created_at?: string
}