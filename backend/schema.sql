create extension if not exists pgcrypto;

create table if not exists categories (
  id text primary key,
  name text not null,
  slug text not null unique,
  description text not null default '',
  sort_order integer not null default 0
);

create table if not exists subcategories (
  id text primary key,
  name text not null,
  slug text not null,
  category_id text not null references categories(id) on delete cascade,
  sort_order integer not null default 0,
  unique (category_id, slug)
);

create table if not exists products (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text,
  brand text,
  price numeric(12, 2) not null,
  currency text not null default 'USD',
  image_url text,
  stock integer not null default 0,
  category_id text references categories(id),
  subcategory_id text references subcategories(id),
  product_type text,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products add column if not exists discount_price numeric(12, 2);
alter table products add column if not exists condition text not null default 'New';
alter table products add column if not exists specifications text;
alter table products add column if not exists warranty text;
alter table products add column if not exists status text not null default 'in_stock';

create table if not exists inquiries (
  id uuid primary key default gen_random_uuid(),
  product_id text references products(id) on delete set null,
  product_name text not null,
  customer_name text,
  customer_phone text,
  source text not null default 'whatsapp',
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text references products(id) on delete set null,
  customer_name text not null,
  rating integer not null default 5,
  comment text not null,
  status text not null default 'pending',
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  email text not null unique,
  phone text,
  password_hash text,
  google_sub text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table users alter column password_hash drop not null;
alter table users add column if not exists google_sub text;
alter table reviews add column if not exists user_id uuid references users(id) on delete set null;
create unique index if not exists users_google_sub_unique on users(google_sub) where google_sub is not null;

create table if not exists admins (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password_hash text not null,
  role text not null default 'admin',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  account_type text not null check (account_type in ('user', 'admin')),
  account_id uuid not null,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists store_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into store_settings (key, value)
values (
  'storefront',
  '{
    "storeName": "Stacked",
    "supportPhone": "+254 700 000 000",
    "whatsappNumber": "254700000000",
    "defaultWarranty": "Two years on laptops, one year on accessories.",
    "shippingNote": "Orders dispatch in 24 hours when stock is available.",
    "showFeaturedProducts": true,
    "showWarrantyStrip": true,
    "showLowStockUrgency": true,
    "heroEyebrow": "New arrivals - 2026 ready",
    "heroTitle": "Work-ready tech without the buying noise.",
    "heroDescription": "Shop vetted laptops, docks, keyboards, mice, and carry gear with honest stock status, fast local follow-up, and support that knows the product."
  }'::jsonb
)
on conflict (key) do nothing;

insert into categories (id, name, slug, description, sort_order)
values
  ('cat-laptops', 'Laptops', 'laptops', 'Portable systems chosen for real work, long sessions, and clean everyday performance.', 1),
  ('cat-mice', 'Mice', 'mice', 'Precise, comfortable pointing devices for focused desk setups and travel kits.', 2),
  ('cat-keyboards', 'Keyboards', 'keyboards', 'Typing tools that balance feel, durability, and a quieter workspace aesthetic.', 3),
  ('cat-workspace', 'Workspace', 'workspace', 'Desk gear and carry essentials that make a setup simpler, tidier, and easier to move.', 4)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  description = excluded.description,
  sort_order = excluded.sort_order;

insert into subcategories (id, name, slug, category_id, sort_order)
values
  ('sub-ultrabooks', 'Ultrabooks', 'ultrabooks', 'cat-laptops', 1),
  ('sub-performance', 'Performance', 'performance', 'cat-laptops', 2),
  ('sub-productivity-mice', 'Productivity', 'productivity', 'cat-mice', 1),
  ('sub-travel-mice', 'Travel', 'travel', 'cat-mice', 2),
  ('sub-mechanical', 'Mechanical', 'mechanical', 'cat-keyboards', 1),
  ('sub-wireless', 'Wireless', 'wireless', 'cat-keyboards', 2),
  ('sub-docks', 'Docks', 'docks', 'cat-workspace', 1),
  ('sub-bags', 'Bags', 'bags', 'cat-workspace', 2)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug,
  category_id = excluded.category_id,
  sort_order = excluded.sort_order;
