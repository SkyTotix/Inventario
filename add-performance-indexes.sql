-- Índices para optimizar el rendimiento de consultas frecuentes
-- Ejecutar en Supabase SQL Editor

-- Índices para la tabla books
-- Índice compuesto para búsquedas por título y autor
CREATE INDEX IF NOT EXISTS idx_books_title_author ON public.books (title, author);

-- Índice para búsquedas por ISBN
CREATE INDEX IF NOT EXISTS idx_books_isbn ON public.books (isbn) WHERE isbn IS NOT NULL;

-- Índice para filtros por género
CREATE INDEX IF NOT EXISTS idx_books_genre ON public.books (genre);

-- Índice para ordenar por fecha de creación
CREATE INDEX IF NOT EXISTS idx_books_created_at ON public.books (created_at DESC);

-- Índice para filtros por stock (libros con stock bajo)
CREATE INDEX IF NOT EXISTS idx_books_stock ON public.books (stock) WHERE stock <= 10;

-- Índice de texto completo para búsquedas
CREATE INDEX IF NOT EXISTS idx_books_search ON public.books 
USING gin(to_tsvector('spanish', title || ' ' || author || ' ' || COALESCE(description, '')));

-- Índices para la tabla sales
-- Índice para consultas por fecha de creación (más usado)
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON public.sales (created_at DESC);

-- Índice para consultas por cliente
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales (customer_id) WHERE customer_id IS NOT NULL;

-- Índice compuesto para reportes por fecha y método de pago
CREATE INDEX IF NOT EXISTS idx_sales_date_payment ON public.sales (created_at DESC, payment_method);

-- Índice para consultas por estado
CREATE INDEX IF NOT EXISTS idx_sales_status ON public.sales (status);

-- Índices para la tabla sale_items
-- Índice para consultas por venta
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON public.sale_items (sale_id);

-- Índice para consultas por libro
CREATE INDEX IF NOT EXISTS idx_sale_items_book_id ON public.sale_items (book_id);

-- Índice compuesto para análisis de ventas por libro
CREATE INDEX IF NOT EXISTS idx_sale_items_book_quantity ON public.sale_items (book_id, quantity);

-- Índices para la tabla customers
-- Índice para búsquedas por nombre
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers (name);

-- Índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_customers_email ON public.customers (email) WHERE email IS NOT NULL;

-- Índice para búsquedas por teléfono
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers (phone) WHERE phone IS NOT NULL;

-- Índice para ordenar por fecha de registro
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON public.customers (created_at DESC);

-- Índice de texto completo para búsquedas de clientes
CREATE INDEX IF NOT EXISTS idx_customers_search ON public.customers 
USING gin(to_tsvector('spanish', name || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '')));

-- Índices para la tabla admins
-- Índice para consultas por user_id (más frecuente)
CREATE INDEX IF NOT EXISTS idx_admins_user_id ON public.admins (user_id);

-- Estadísticas actualizadas para el optimizador de consultas
ANALYZE public.books;
ANALYZE public.sales;
ANALYZE public.sale_items;
ANALYZE public.customers;
ANALYZE public.admins;

-- Comentarios para documentación
COMMENT ON INDEX idx_books_title_author IS 'Optimiza búsquedas combinadas por título y autor';
COMMENT ON INDEX idx_books_search IS 'Búsqueda de texto completo en libros';
COMMENT ON INDEX idx_sales_created_at IS 'Optimiza consultas de ventas por fecha (dashboard, reportes)';
COMMENT ON INDEX idx_customers_search IS 'Búsqueda de texto completo en clientes';