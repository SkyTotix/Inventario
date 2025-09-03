-- Crear tabla de libros
CREATE TABLE books (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  isbn VARCHAR(20) UNIQUE,
  genre VARCHAR(100) NOT NULL,
  price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de clientes
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de ventas
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  total DECIMAL(10,2) NOT NULL CHECK (total >= 0),
  subtotal DECIMAL(10,2) NOT NULL CHECK (subtotal >= 0),
  tax DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (tax >= 0),
  discount DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (discount >= 0),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
  status VARCHAR(20) NOT NULL DEFAULT 'completed',
  items TEXT, -- JSON string of sale items
  customer_name VARCHAR(255), -- Customer name for quick reference
  date VARCHAR(10), -- Sale date in YYYY-MM-DD format
  notes TEXT, -- Additional notes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de items de venta
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
  book_id UUID REFERENCES books(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_books_genre ON books(genre);
CREATE INDEX idx_books_author ON books(author);
CREATE INDEX idx_books_stock ON books(stock);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_sales_customer_id ON sales(customer_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_book_id ON sale_items(book_id);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear triggers para actualizar updated_at
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON books
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insertar algunos datos de ejemplo
INSERT INTO books (title, author, isbn, genre, price, stock, description) VALUES
('El Quijote', 'Miguel de Cervantes', '978-84-376-0494-7', 'Clásico', 25.99, 15, 'La obra maestra de la literatura española'),
('Cien años de soledad', 'Gabriel García Márquez', '978-84-376-0495-4', 'Realismo mágico', 22.50, 8, 'Una saga familiar en Macondo'),
('1984', 'George Orwell', '978-84-376-0496-1', 'Distopía', 18.75, 12, 'Una visión del futuro totalitario'),
('El principito', 'Antoine de Saint-Exupéry', '978-84-376-0497-8', 'Infantil', 15.99, 20, 'Un cuento filosófico para todas las edades'),
('Rayuela', 'Julio Cortázar', '978-84-376-0498-5', 'Literatura contemporánea', 28.00, 6, 'Una novela experimental argentina');

INSERT INTO customers (name, email, phone, address) VALUES
('Juan Pérez', 'juan.perez@email.com', '+34 600 123 456', 'Calle Mayor 123, Madrid'),
('María García', 'maria.garcia@email.com', '+34 600 234 567', 'Avenida de la Paz 45, Barcelona'),
('Carlos López', 'carlos.lopez@email.com', '+34 600 345 678', 'Plaza del Sol 12, Valencia'),
('Ana Martínez', 'ana.martinez@email.com', '+34 600 456 789', 'Calle de la Luna 78, Sevilla'),
('Luis Rodríguez', 'luis.rodriguez@email.com', '+34 600 567 890', 'Paseo de Gracia 234, Barcelona');

-- Habilitar Row Level Security (RLS) - opcional
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- Crear políticas básicas (permitir todo para usuarios autenticados)
CREATE POLICY "Enable all operations for authenticated users" ON books
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON customers
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON sales
    FOR ALL USING (true);

CREATE POLICY "Enable all operations for authenticated users" ON sale_items
    FOR ALL USING (true);