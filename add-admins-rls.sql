-- RLS: Acceso total solo para administradores (un único usuario por ahora)
--
-- Qué hace este script:
-- 1) Crea la tabla public.admins para marcar usuarios administradores.
-- 2) Crea la función public.is_admin() para verificar si la sesión actual es admin.
-- 3) Habilita RLS en books, customers, sales y sale_items.
-- 4) Elimina las políticas permisivas existentes para evitar que otros usuarios accedan.
-- 5) Crea políticas que permiten TODO (SELECT/INSERT/UPDATE/DELETE) solo a administradores.
-- 6) Inserta como admin al usuario indicado por UUID (más abajo). También se deja un bloque por email comentado.
--
-- Uso:
-- - Ejecuta este script en el SQL Editor de tu proyecto Supabase.
-- - Verifica que el UUID de abajo coincide con tu usuario admin.
-- - Si prefieres asignar por email en vez de UUID, comenta el bloque por UUID y descomenta el bloque alternativo.

-- 1) Tabla de administradores
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamp with time zone default now()
);

-- 2) Función para saber si el usuario autenticado es admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.admins a
    where a.user_id = auth.uid()
  );
$$;

-- 3) Asegurar RLS habilitado en tablas principales
alter table if exists public.books enable row level security;
alter table if exists public.customers enable row level security;
alter table if exists public.sales enable row level security;
alter table if exists public.sale_items enable row level security;

-- 4) Eliminar políticas permisivas existentes para que solo admin tenga acceso
--    (estas políticas estaban definidas en supabase-schema.sql)
drop policy if exists "Enable all operations for authenticated users" on public.books;
drop policy if exists "Enable all operations for authenticated users" on public.customers;
drop policy if exists "Enable all operations for authenticated users" on public.sales;
drop policy if exists "Enable all operations for authenticated users" on public.sale_items;

-- (opcional) Eliminar políticas previas de admin si existieran, para recrearlas limpias
drop policy if exists admins_all_books on public.books;
drop policy if exists admins_all_customers on public.customers;
drop policy if exists admins_all_sales on public.sales;
drop policy if exists admins_all_sale_items on public.sale_items;

-- 5) Políticas: permitir TODO solo a administradores en cada tabla
create policy admins_all_books
on public.books
for all
using (public.is_admin())
with check (public.is_admin());

create policy admins_all_customers
on public.customers
for all
using (public.is_admin())
with check (public.is_admin());

create policy admins_all_sales
on public.sales
for all
using (public.is_admin())
with check (public.is_admin());

create policy admins_all_sale_items
on public.sale_items
for all
using (public.is_admin())
with check (public.is_admin());

-- 6) Designar un usuario como admin por UUID (reemplaza si fuera necesario)
--    UUID proporcionado por el usuario: 8ea6b876-8f23-4aaf-8cd8-c5b046ea4eec
insert into public.admins(user_id)
values ('8ea6b876-8f23-4aaf-8cd8-c5b046ea4eec')
on conflict (user_id) do nothing;

-- Alternativa: Designar admin por email (descomenta para usar)
-- do $$
-- declare
--   v_user_id uuid;
-- begin
--   select id into v_user_id
--   from auth.users
--   where email = 'ADMIN_EMAIL_AQUI';
--
--   if v_user_id is null then
--     raise exception 'No existe usuario con ese email en auth.users';
--   end if;
--
--   insert into public.admins(user_id)
--   values (v_user_id)
--   on conflict (user_id) do nothing;
-- end
-- $$;