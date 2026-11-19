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

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete restrict,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  fulfillment_method text not null check (fulfillment_method in ('delivery','pickup')),
  delivery_address text,
  delivery_city text,
  notes text,
  subtotal numeric(12,2) not null,
  shipping numeric(12,2) not null default 0,
  total numeric(12,2) not null,
  currency text not null default 'KES',
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed')),
  fulfillment_status text not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table inquiries add column if not exists customer_email text;
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text references products(id) on delete set null,
  product_name text not null,
  unit_price numeric(12,2) not null,
  quantity integer not null check (quantity > 0)
);
create table if not exists mpesa_payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  merchant_request_id text,
  checkout_request_id text unique,
  phone text not null,
  amount numeric(12,2) not null,
  status text not null default 'initiating' check (status in ('initiating','pending','paid','failed','unknown')),
  result_code text,
  result_description text,
  mpesa_receipt text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists orders_user_created_idx on orders(user_id, created_at desc);
create index if not exists mpesa_payments_order_idx on mpesa_payments(order_id, created_at desc);

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
  ('cat-workspace', 'Workspace', 'workspace', 'Desk gear and carry essentials that make a setup simpler, tidier, and easier to move.', 4),
  ('cat-cameras', 'Cameras', 'cameras', 'Cameras and imaging equipment.', 5),
  ('cat-computers', 'Desktop Computers', 'desktop-computers', 'Business desktops and desktop bundles.', 6),
  ('cat-audio', 'Audio', 'audio', 'Portable speakers and headphones.', 7),
  ('cat-bags', 'Bags', 'bags', 'Laptop bags and everyday carry.', 8),
  ('cat-power', 'Power & Chargers', 'power-chargers', 'Laptop adapters and charging accessories.', 9),
  ('cat-cables', 'Cables', 'cables', 'Display and connectivity cables.', 10),
  ('cat-entertainment', 'Entertainment', 'entertainment', 'Streaming and home entertainment devices.', 11)
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

-- Add first-run demo listings only when their stable IDs are absent. Admin edits
-- therefore survive later schema checks and application restarts.
insert into products (
  id, slug, name, description, brand, price, currency, image_url, stock,
  condition, specifications, warranty, status, category_id, subcategory_id,
  product_type, is_featured
)
values
  ('demo-hp-omnibook-5', 'demo-hp-omnibook-5', 'HP OmniBook 5 16-AF1017wm', 'Demo listing. 16-inch HP OmniBook laptop for everyday productivity and study. Confirm exact configuration, availability, and demo price before sale.', 'HP', 149999, 'KSh', '/uploads/demo-products/laptop-hp-omnibook.jpg', 5, 'New', 'Model: 16-AF1017wm; 16-inch display. Confirm processor, memory, storage, and included accessories with the store.', 'Confirm with store', 'in_stock', 'cat-laptops', 'sub-ultrabooks', 'Laptop', true),
  ('demo-hp-probook-645-g3', 'demo-hp-probook-645-g3', 'HP ProBook 645 G3', 'Demo listing. Business-class 14-inch notebook for office and study use. Confirm condition and exact configuration before sale; demo price only.', 'HP', 34999, 'KSh', '/uploads/demo-products/laptop-hp-probook-645.jpg', 4, 'Refurbished', 'Model: ProBook 645 G3; AMD A10-8730B; 8 GB RAM; 256 GB SSD; 14-inch HD display; AMD Radeon R5 graphics.', 'Confirm with store', 'in_stock', 'cat-laptops', 'sub-performance', 'Laptop', false),
  ('demo-lenovo-thinkpad-x13-yoga', 'demo-lenovo-thinkpad-x13-yoga', 'Lenovo ThinkPad X13 Yoga Gen 1', 'Demo listing. Convertible business laptop with touchscreen for mobile productivity. Confirm refurbished condition, accessories, and demo price before sale.', 'Lenovo', 52999, 'KSh', '/uploads/demo-products/laptop-lenovo-thinkpad-x13.jpg', 3, 'Refurbished', 'Model: ThinkPad X13 Yoga Gen 1; Intel Core i5-10210U; 16 GB RAM; 512 GB SSD; 13.3-inch touchscreen; Intel UHD Graphics.', 'Confirm with store', 'in_stock', 'cat-laptops', 'sub-ultrabooks', 'Laptop', true),
  ('demo-canon-eos-r6-mark-iii', 'demo-canon-eos-r6-mark-iii', 'Canon EOS R6 Mark III Mirrorless Camera', 'Demo listing. Full-frame mirrorless camera kit shown with RF 24-105mm F4-7.1 IS STM lens. Confirm kit contents, availability, and demo price.', 'Canon', 499999, 'KSh', '/uploads/demo-products/camera-canon-eos-r6.jpg', 2, 'New', '32.5 MP full-frame CMOS; Dual Pixel CMOS autofocus; RF 24-105mm F4-7.1 IS STM lens shown.', 'Confirm with store', 'in_stock', 'cat-cameras', null, 'Camera', false),
  ('demo-hp-elitedesk-800-g6-mini', 'demo-hp-elitedesk-800-g6-mini', 'HP EliteDesk 800 G6 Mini PC', 'Demo listing. Compact business desktop for office and point-of-sale setups. Confirm included storage, operating system, and demo price.', 'HP', 54999, 'KSh', '/uploads/demo-products/pc-hp-elitedesk-mini.jpg', 3, 'Refurbished', 'Intel Core i5-10400; 8 GB DDR4 RAM; 1 TB HDD; desktop computer only.', 'Confirm with store', 'in_stock', 'cat-computers', null, 'Desktop computer', false),
  ('demo-hp-pro-tower-290-g9', 'demo-hp-pro-tower-290-g9', 'HP Pro Tower 290 G9 PC Bundle', 'Demo listing. Desktop bundle shown with monitor and basic peripherals. Confirm bundle contents, operating system, and demo price.', 'HP', 104999, 'KSh', '/uploads/demo-products/pc-hp-pro-tower.jpg', 2, 'New', 'Intel Core i5-14500; 8 GB DDR4 RAM; 512 GB SSD; Intel UHD Graphics 770; image shows keyboard, mouse, and 21.5-inch monitor.', 'Confirm with store', 'in_stock', 'cat-computers', null, 'Desktop computer', false),
  ('demo-wireless-mouse', 'demo-wireless-mouse', 'Wireless Optical Mouse', 'Demo listing. Compact wireless mouse for home, office, and travel use. Confirm connection type, battery inclusion, and demo price.', 'Generic', 1200, 'KSh', '/uploads/demo-products/mouse-wireless.webp', 10, 'New', 'Wireless mouse; exact model and specifications to be confirmed.', 'Confirm with store', 'in_stock', 'cat-mice', 'sub-productivity-mice', 'Mouse', false),
  ('demo-hp-k1600-keyboard', 'demo-hp-k1600-keyboard', 'HP K1600 Keyboard', 'Demo listing. Full-size wired keyboard for everyday desk use. Confirm layout, connection, and demo price.', 'HP', 2400, 'KSh', '/uploads/demo-products/keyboard-hp-k1600.webp', 8, 'New', 'Model: HP K1600; keyboard layout to be confirmed.', 'Confirm with store', 'in_stock', 'cat-keyboards', null, 'Keyboard', false),
  ('demo-usbc-3-in-1-hub', 'demo-usbc-3-in-1-hub', 'USB-C 3-in-1 HDMI Hub', 'Demo listing. USB-C adapter with HDMI and USB connectivity for compatible laptops. Confirm supported resolutions, ports, and demo price.', 'Generic', 3500, 'KSh', '/uploads/demo-products/hub-usbc.jpg', 7, 'New', 'USB-C hub; HDMI and USB 3.0 ports indicated by product listing. Confirm charging/data compatibility.', 'Confirm with store', 'in_stock', 'cat-workspace', 'sub-docks', 'USB-C hub', true),
  ('demo-hp-prelude-backpack', 'demo-hp-prelude-backpack', 'HP Prelude 15.6-inch Laptop Backpack', 'Demo listing. Everyday laptop backpack designed to carry a laptop and work essentials. Confirm compartments and demo price.', 'HP', 4800, 'KSh', '/uploads/demo-products/bag-hp-prelude.jpg', 6, 'New', 'Fits laptops up to 15.6 inches, subject to device dimensions.', 'Confirm with store', 'in_stock', 'cat-bags', null, 'Laptop bag', false),
  ('demo-jbl-flip-7', 'demo-jbl-flip-7', 'JBL Flip 7 Portable Bluetooth Speaker', 'Demo listing. Portable Bluetooth speaker with rugged, water-resistant design. Confirm color, included cable, availability, and demo price.', 'JBL', 14500, 'KSh', '/uploads/demo-products/speaker-jbl-flip-7.jpg', 4, 'New', 'Portable Bluetooth speaker; water- and drop-resistant design as listed by product source.', 'Confirm with store', 'in_stock', 'cat-audio', null, 'Bluetooth speaker', true),
  ('demo-jbl-live-770', 'demo-jbl-live-770', 'JBL Live 770NC Wireless Headphones', 'Demo listing. Over-ear wireless headphones with noise cancelling. Confirm exact model features, color, and demo price.', 'JBL', 18999, 'KSh', '/uploads/demo-products/headphones-jbl-live-770.jpg', 4, 'New', 'Over-ear wireless headphones; noise cancellation as listed by product source.', 'Confirm with store', 'in_stock', 'cat-audio', null, 'Headphones', false),
  ('demo-360-laptop-stand', 'demo-360-laptop-stand', '360-Degree Adjustable Laptop Stand', 'Demo listing. Adjustable rotating stand for laptop or tablet desk setups. Confirm supported device sizes and demo price.', 'Generic', 2600, 'KSh', '/uploads/demo-products/stand-laptop-360.jpg', 8, 'New', 'Rotating adjustable stand; exact supported load and dimensions to be confirmed.', 'Confirm with store', 'in_stock', 'cat-workspace', 'sub-docks', 'Laptop stand', false),
  ('demo-ugreen-ergonomic-mouse-pad', 'demo-ugreen-ergonomic-mouse-pad', 'UGREEN Ergonomic Mouse Pad with Wrist Support', 'Demo listing. Mouse pad with wrist support for a more comfortable desk setup. Confirm color and demo price.', 'UGREEN', 1300, 'KSh', '/uploads/demo-products/mousepad-wrist-support.jpg', 8, 'New', 'Model listing: LP668; dimensions and material to be confirmed.', 'Confirm with store', 'in_stock', 'cat-workspace', null, 'Mouse pad', false),
  ('demo-dell-usbc-65w-adapter', 'demo-dell-usbc-65w-adapter', 'Dell 65W USB-C AC Adapter', 'Demo listing. 65W USB-C laptop adapter. Confirm laptop compatibility, genuine status, and demo price.', 'Dell', 3500, 'KSh', '/uploads/demo-products/adapter-dell-usbc-65w.jpg', 5, 'New', '65 W; USB-C; 20 V / 3.25 A as listed by product source.', 'Confirm with store', 'in_stock', 'cat-power', null, 'Laptop adapter', false),
  ('demo-hp-blue-pin-65w-adapter', 'demo-hp-blue-pin-65w-adapter', 'HP 65W Blue-Pin Adapter', 'Demo listing. 65W HP blue-pin laptop adapter. Confirm connector and laptop compatibility before purchase.', 'HP', 1800, 'KSh', '/uploads/demo-products/adapter-hp-blue-pin-65w.jpg', 5, 'New', '65 W; 19.5 V / 3.33 A; blue-pin connector as listed by product source.', 'Confirm with store', 'in_stock', 'cat-power', null, 'Laptop adapter', false),
  ('demo-displayport-hdmi-cable', 'demo-displayport-hdmi-cable', 'DisplayPort to HDMI Cable, 1.8m', 'Demo listing. Cable for connecting compatible DisplayPort and HDMI devices. Confirm direction and display support before purchase.', 'Generic', 1200, 'KSh', '/uploads/demo-products/cable-displayport-hdmi.jpg', 10, 'New', 'Length: 1.8 m. Confirm signal direction and supported resolution.', 'Confirm with store', 'in_stock', 'cat-cables', null, 'Display cable', false),
  ('demo-dcolor-4k-tv-stick', 'demo-dcolor-4k-tv-stick', 'DCOLOR Google Certified 4K Android TV Stick', 'Demo listing. Compact streaming device for compatible displays. Confirm included remote, power supply, and demo price.', 'DCOLOR', 7500, 'KSh', '/uploads/demo-products/android-tv-stick.jpg', 5, 'New', 'Google-certified Android TV stick; 4K support as listed by product source.', 'Confirm with store', 'in_stock', 'cat-entertainment', null, 'Streaming device', false)
on conflict do nothing;
