export interface CatalogCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

export interface CatalogSubcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  sortOrder: number;
}

export interface CatalogProduct {
  id: string;
  slug: string;
  name: string;
  description: string;
  brand: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  stock: number;
  categoryId: string;
  subcategoryId: string | null;
  productType: string;
  isFeatured: boolean;
}

export interface NavCategory {
  id: string;
  name: string;
  slug: string;
  subcategories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

const categories: CatalogCategory[] = [
  {
    id: "cat-laptops",
    name: "Laptops",
    slug: "laptops",
    description: "Portable systems chosen for real work, long sessions, and clean everyday performance.",
    sortOrder: 1,
  },
  {
    id: "cat-mice",
    name: "Mice",
    slug: "mice",
    description: "Precise, comfortable pointing devices for focused desk setups and travel kits.",
    sortOrder: 2,
  },
  {
    id: "cat-keyboards",
    name: "Keyboards",
    slug: "keyboards",
    description: "Typing tools that balance feel, durability, and a quieter workspace aesthetic.",
    sortOrder: 3,
  },
  {
    id: "cat-workspace",
    name: "Workspace",
    slug: "workspace",
    description: "Desk gear and carry essentials that make a setup simpler, tidier, and easier to move.",
    sortOrder: 4,
  },
  { id: "cat-cameras", name: "Cameras", slug: "cameras", description: "Cameras and imaging equipment.", sortOrder: 5 },
  { id: "cat-computers", name: "Desktop Computers", slug: "desktop-computers", description: "Business desktops and desktop bundles.", sortOrder: 6 },
  { id: "cat-audio", name: "Audio", slug: "audio", description: "Portable speakers and headphones.", sortOrder: 7 },
  { id: "cat-bags", name: "Bags", slug: "bags", description: "Laptop bags and everyday carry.", sortOrder: 8 },
  { id: "cat-power", name: "Power & Chargers", slug: "power-chargers", description: "Laptop adapters and charging accessories.", sortOrder: 9 },
  { id: "cat-cables", name: "Cables", slug: "cables", description: "Display and connectivity cables.", sortOrder: 10 },
  { id: "cat-entertainment", name: "Entertainment", slug: "entertainment", description: "Streaming and home entertainment devices.", sortOrder: 11 },
];

const subcategories: CatalogSubcategory[] = [
  { id: "sub-ultrabooks", name: "Ultrabooks", slug: "ultrabooks", categoryId: "cat-laptops", sortOrder: 1 },
  { id: "sub-performance", name: "Performance", slug: "performance", categoryId: "cat-laptops", sortOrder: 2 },
  { id: "sub-productivity-mice", name: "Productivity", slug: "productivity", categoryId: "cat-mice", sortOrder: 1 },
  { id: "sub-travel-mice", name: "Travel", slug: "travel", categoryId: "cat-mice", sortOrder: 2 },
  { id: "sub-mechanical", name: "Mechanical", slug: "mechanical", categoryId: "cat-keyboards", sortOrder: 1 },
  { id: "sub-wireless", name: "Wireless", slug: "wireless", categoryId: "cat-keyboards", sortOrder: 2 },
  { id: "sub-docks", name: "Docks", slug: "docks", categoryId: "cat-workspace", sortOrder: 1 },
  { id: "sub-bags", name: "Bags", slug: "bags", categoryId: "cat-workspace", sortOrder: 2 },
];

const products: CatalogProduct[] = [
  {
    id: "prod-macbook-pro-14-m4",
    slug: "macbook-pro-14-m4",
    name: "MacBook Pro 14 M4",
    description:
      "A compact pro laptop with excellent battery life, a sharp display, and enough headroom for editing, development, and deep multitasking.",
    brand: "Apple",
    price: 2399,
    currency: "USD",
    image_url: null,
    stock: 6,
    categoryId: "cat-laptops",
    subcategoryId: "sub-ultrabooks",
    productType: "Laptop",
    isFeatured: true,
  },
  {
    id: "prod-dell-xps-15",
    slug: "dell-xps-15",
    name: "Dell XPS 15",
    description:
      "A polished Windows workstation with strong everyday speed, a large immersive display, and the kind of build quality that feels settled on a desk.",
    brand: "Dell",
    price: 2199,
    currency: "USD",
    image_url: null,
    stock: 4,
    categoryId: "cat-laptops",
    subcategoryId: "sub-ultrabooks",
    productType: "Laptop",
    isFeatured: true,
  },
  {
    id: "prod-thinkpad-x1-carbon-g12",
    slug: "thinkpad-x1-carbon-g12",
    name: "ThinkPad X1 Carbon Gen 12",
    description:
      "A reliable travel-first machine with a familiar keyboard, low weight, and the durability people still expect from a serious business laptop.",
    brand: "Lenovo",
    price: 1999,
    currency: "USD",
    image_url: null,
    stock: 7,
    categoryId: "cat-laptops",
    subcategoryId: "sub-ultrabooks",
    productType: "Laptop",
    isFeatured: false,
  },
  {
    id: "prod-rog-zephyrus-g16",
    slug: "rog-zephyrus-g16",
    name: "ROG Zephyrus G16",
    description:
      "A high-output laptop that still keeps its footprint under control, suited to creators and heavier workflows that need more graphical headroom.",
    brand: "ASUS",
    price: 2599,
    currency: "USD",
    image_url: null,
    stock: 3,
    categoryId: "cat-laptops",
    subcategoryId: "sub-performance",
    productType: "Laptop",
    isFeatured: true,
  },
  {
    id: "prod-alienware-m18-r2",
    slug: "alienware-m18-r2",
    name: "Alienware M18 R2",
    description:
      "A desktop-replacement class machine for customers who want maximum performance, a large screen, and room for demanding workloads.",
    brand: "Alienware",
    price: 2999,
    currency: "USD",
    image_url: null,
    stock: 2,
    categoryId: "cat-laptops",
    subcategoryId: "sub-performance",
    productType: "Laptop",
    isFeatured: false,
  },
  {
    id: "prod-mx-master-3s",
    slug: "mx-master-3s",
    name: "MX Master 3S",
    description:
      "A quiet, ergonomic productivity mouse with excellent tracking, a thumb wheel, and controls that feel right during long desk sessions.",
    brand: "Logitech",
    price: 109,
    currency: "USD",
    image_url: null,
    stock: 18,
    categoryId: "cat-mice",
    subcategoryId: "sub-productivity-mice",
    productType: "Mouse",
    isFeatured: true,
  },
  {
    id: "prod-apple-magic-mouse",
    slug: "apple-magic-mouse",
    name: "Apple Magic Mouse",
    description:
      "A low-profile wireless mouse with gesture support and a minimal footprint for cleaner Apple-centric workspaces.",
    brand: "Apple",
    price: 79,
    currency: "USD",
    image_url: null,
    stock: 9,
    categoryId: "cat-mice",
    subcategoryId: "sub-travel-mice",
    productType: "Mouse",
    isFeatured: false,
  },
  {
    id: "prod-keychron-k2-pro",
    slug: "keychron-k2-pro",
    name: "Keychron K2 Pro",
    description:
      "A compact mechanical keyboard that keeps desk space open while still delivering the kind of typing feel people settle into quickly.",
    brand: "Keychron",
    price: 129,
    currency: "USD",
    image_url: null,
    stock: 12,
    categoryId: "cat-keyboards",
    subcategoryId: "sub-mechanical",
    productType: "Keyboard",
    isFeatured: false,
  },
  {
    id: "prod-logitech-mx-keys-s",
    slug: "logitech-mx-keys-s",
    name: "Logitech MX Keys S",
    description:
      "A full-size wireless keyboard with quiet switches and backlighting, tuned for long-form writing and multi-device desk setups.",
    brand: "Logitech",
    price: 119,
    currency: "USD",
    image_url: null,
    stock: 14,
    categoryId: "cat-keyboards",
    subcategoryId: "sub-wireless",
    productType: "Keyboard",
    isFeatured: false,
  },
  {
    id: "prod-caldigit-ts4",
    slug: "caldigit-ts4",
    name: "CalDigit TS4",
    description:
      "A premium desk dock that turns a laptop into a full workstation with clean cable management and generous port selection.",
    brand: "CalDigit",
    price: 399,
    currency: "USD",
    image_url: null,
    stock: 5,
    categoryId: "cat-workspace",
    subcategoryId: "sub-docks",
    productType: "Dock",
    isFeatured: false,
  },
  {
    id: "prod-peak-design-everyday-20l",
    slug: "peak-design-everyday-20l",
    name: "Peak Design Everyday Backpack 20L",
    description:
      "A structured carry bag that protects a laptop, keeps accessories organized, and still looks at home between meetings and travel days.",
    brand: "Peak Design",
    price: 279,
    currency: "USD",
    image_url: null,
    stock: 8,
    categoryId: "cat-workspace",
    subcategoryId: "sub-bags",
    productType: "Bag",
    isFeatured: false,
  },
  {
    id: "prod-bellroy-classic-brief",
    slug: "bellroy-classic-brief",
    name: "Bellroy Classic Brief",
    description:
      "A slim brief that carries a laptop and daily essentials without bulk, ideal for quieter office routines and shorter commutes.",
    brand: "Bellroy",
    price: 169,
    currency: "USD",
    image_url: null,
    stock: 10,
    categoryId: "cat-workspace",
    subcategoryId: "sub-bags",
    productType: "Bag",
    isFeatured: false,
  },
];

export function getCategories(): CatalogCategory[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getSubcategories(): CatalogSubcategory[] {
  return [...subcategories].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getProducts(): CatalogProduct[] {
  return [...products];
}

export function getFeaturedProducts(limit = 4): CatalogProduct[] {
  return products
    .filter((product) => product.isFeatured)
    .sort((a, b) => b.price - a.price)
    .slice(0, limit);
}

export function getProductBySlug(slug: string): CatalogProduct | null {
  return products.find((product) => product.slug === slug) ?? null;
}

export function getProductsForCategory(categoryId?: string, subcategoryId?: string): CatalogProduct[] {
  return products.filter((product) => {
    if (subcategoryId) return product.subcategoryId === subcategoryId;
    if (categoryId) return product.categoryId === categoryId;
    return true;
  });
}

export function getRelatedProducts(productId: string, categoryId?: string | null, limit = 4): CatalogProduct[] {
  const primary = products
    .filter((product) => product.id !== productId && (!categoryId || product.categoryId === categoryId))
    .sort((a, b) => b.price - a.price);

  if (primary.length >= limit) {
    return primary.slice(0, limit);
  }

  const seen = new Set(primary.map((product) => product.id));
  const fallback = products
    .filter((product) => product.id !== productId && !seen.has(product.id))
    .sort((a, b) => b.price - a.price);

  return [...primary, ...fallback].slice(0, limit);
}

export function getNavCategories(): NavCategory[] {
  const orderedCategories = getCategories();
  const orderedSubcategories = getSubcategories();

  return orderedCategories.map((category) => ({
    id: category.id,
    name: category.name,
    slug: category.slug,
    subcategories: orderedSubcategories
      .filter((subcategory) => subcategory.categoryId === category.id)
      .map((subcategory) => ({
        id: subcategory.id,
        name: subcategory.name,
        slug: subcategory.slug,
      })),
  }));
}
