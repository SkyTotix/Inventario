-- Script para agregar columnas faltantes a la tabla sales en Supabase
-- Ejecutar este script en el SQL Editor de Supabase

-- Agregar columnas faltantes a la tabla sales
ALTER TABLE sales ADD COLUMN IF NOT EXISTS items TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS date VARCHAR(10);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS notes TEXT;

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sales'
ORDER BY ordinal_position;