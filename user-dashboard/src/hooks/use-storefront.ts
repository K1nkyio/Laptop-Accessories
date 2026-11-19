import { useSyncExternalStore } from "react";

export interface StorefrontProduct {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  stock: number;
}

export interface CartItem extends StorefrontProduct {
  quantity: number;
}

interface StorefrontSnapshot {
  cart: CartItem[];
  wishlist: StorefrontProduct[];
}

const CART_STORAGE_KEY = "stacked-cart";
const WISHLIST_STORAGE_KEY = "stacked-wishlist";
const STOREFRONT_EVENT = "stacked-storefront-change";
const EMPTY_SNAPSHOT: StorefrontSnapshot = { cart: [], wishlist: [] };

let cachedCartRaw: string | null | undefined;
let cachedWishlistRaw: string | null | undefined;
let cachedSnapshot: StorefrontSnapshot = EMPTY_SNAPSHOT;

function canUseStorage() {
  return typeof window !== "undefined";
}

function readStorage<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function parseStorageValue<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(STOREFRONT_EVENT));
}

function getSnapshot(): StorefrontSnapshot {
  if (!canUseStorage()) return EMPTY_SNAPSHOT;

  const cartRaw = window.localStorage.getItem(CART_STORAGE_KEY);
  const wishlistRaw = window.localStorage.getItem(WISHLIST_STORAGE_KEY);

  if (cartRaw === cachedCartRaw && wishlistRaw === cachedWishlistRaw) {
    return cachedSnapshot;
  }

  cachedCartRaw = cartRaw;
  cachedWishlistRaw = wishlistRaw;
  cachedSnapshot = {
    cart: parseStorageValue<CartItem[]>(cartRaw, []),
    wishlist: parseStorageValue<StorefrontProduct[]>(wishlistRaw, []),
  };

  return cachedSnapshot;
}

function subscribe(onChange: () => void) {
  if (!canUseStorage()) return () => undefined;

  const handleChange = () => onChange();

  window.addEventListener("storage", handleChange);
  window.addEventListener(STOREFRONT_EVENT, handleChange);

  return () => {
    window.removeEventListener("storage", handleChange);
    window.removeEventListener(STOREFRONT_EVENT, handleChange);
  };
}

export function useStorefront() {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_SNAPSHOT);
}

export function addToCart(product: StorefrontProduct, quantity = 1) {
  const cart = readStorage<CartItem[]>(CART_STORAGE_KEY, []);
  const existing = cart.find((item) => item.id === product.id);

  if (existing) {
    const nextCart = cart.map((item) =>
      item.id === product.id
        ? { ...item, quantity: Math.min(item.quantity + quantity, Math.max(product.stock, 1)) }
        : item,
    );
    writeStorage(CART_STORAGE_KEY, nextCart);
    return;
  }

  writeStorage(CART_STORAGE_KEY, [
    ...cart,
    {
      ...product,
      quantity: Math.min(quantity, Math.max(product.stock, 1)),
    },
  ]);
}

export function updateCartQuantity(productId: string, quantity: number) {
  const cart = readStorage<CartItem[]>(CART_STORAGE_KEY, []);

  if (quantity <= 0) {
    writeStorage(
      CART_STORAGE_KEY,
      cart.filter((item) => item.id !== productId),
    );
    return;
  }

  writeStorage(
    CART_STORAGE_KEY,
    cart.map((item) => (item.id === productId ? { ...item, quantity: Math.min(quantity, Math.max(item.stock, 1)) } : item)),
  );
}

export function removeFromCart(productId: string) {
  const cart = readStorage<CartItem[]>(CART_STORAGE_KEY, []);
  writeStorage(
    CART_STORAGE_KEY,
    cart.filter((item) => item.id !== productId),
  );
}

export function clearCart() {
  writeStorage(CART_STORAGE_KEY, []);
}

export function addToWishlist(product: StorefrontProduct) {
  const wishlist = readStorage<StorefrontProduct[]>(WISHLIST_STORAGE_KEY, []);
  if (wishlist.some((item) => item.id === product.id)) return;
  writeStorage(WISHLIST_STORAGE_KEY, [...wishlist, product]);
}

export function removeFromWishlist(productId: string) {
  const wishlist = readStorage<StorefrontProduct[]>(WISHLIST_STORAGE_KEY, []);
  writeStorage(
    WISHLIST_STORAGE_KEY,
    wishlist.filter((item) => item.id !== productId),
  );
}

export function moveWishlistToCart(productId: string) {
  const wishlist = readStorage<StorefrontProduct[]>(WISHLIST_STORAGE_KEY, []);
  const item = wishlist.find((product) => product.id === productId);
  if (!item) return;

  addToCart(item, 1);
  removeFromWishlist(productId);
}
