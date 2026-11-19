-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null check (category in ('Top Up HGI')),
  price integer not null check (price > 0),
  description text default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  customer_name text not null,
  phone text not null,
  destination text default '',
  total integer not null check (total > 0),
  status text not null default 'pending' check (status in ('pending','paid','failed','expired')),
  payment_provider text not null default 'gopay_qris',
  provider_reference text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;

-- Public can only read active products. All writes go through server-side service role.
create policy "public reads active products" on public.products
for select to anon, authenticated using (active = true);

-- Admin can manage catalog and read orders. Backend service role bypasses RLS.
create policy "admin manages products" on public.products
for all to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'))
with check (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "admin reads orders" on public.orders
for select to authenticated
using (exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin'));

create policy "user reads own profile" on public.profiles
for select to authenticated using (id=auth.uid());

-- IMPORTANT: Create the first admin user in Supabase Auth, then insert their UUID:
-- insert into public.profiles (id, role) values ('AUTH_USER_UUID', 'admin');
