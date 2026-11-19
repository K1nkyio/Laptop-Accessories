import { Link } from "react-router-dom";
import { StackedLogo } from "./StackedLogo";
import { useEffect, useState } from "react";
import { fetchStoreSettings } from "@/lib/settings";

export function StoreFooter() {
  const [storeName, setStoreName] = useState("Stacked");
  useEffect(() => { fetchStoreSettings().then((settings) => setStoreName(settings.storeName || "Stacked")).catch(() => undefined); }, []);
  return (
    <footer className="border-t border-sky-400/30 bg-slate-950 text-slate-100 dark:bg-blue-900 dark:text-white">
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <StackedLogo size={16} />
              <span className="text-[14px] font-bold text-slate-100 tracking-[0.08em] uppercase">
                {storeName}
              </span>
            </Link>
            <p className="mt-4 max-w-[220px] text-[13px] leading-relaxed text-slate-400">
              Laptops & accessories for people who get things done.
            </p>
          </div>

          <div>
            <p className="mb-3 text-[12px] uppercase tracking-[0.12em] text-sky-300">
              Shop
            </p>
            <ul className="space-y-2 text-[13px]">
              <li><Link to="/shop/laptops" className="text-slate-300 transition-colors hover:text-sky-300">Laptops</Link></li>
              <li><Link to="/shop/mice" className="text-slate-300 transition-colors hover:text-sky-300">Mice</Link></li>
              <li><Link to="/shop/keyboards" className="text-slate-300 transition-colors hover:text-sky-300">Keyboards</Link></li>
              <li><Link to="/shop/docks" className="text-slate-300 transition-colors hover:text-sky-300">Docks & Hubs</Link></li>
              <li><Link to="/shop/bags" className="text-slate-300 transition-colors hover:text-sky-300">Bags</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[12px] uppercase tracking-[0.12em] text-sky-300">
              Company
            </p>
            <ul className="space-y-2 text-[13px]">
              <li><Link to="/our-story" className="text-slate-300 transition-colors hover:text-sky-300">Our Story</Link></li>
              <li><Link to="/store-locator" className="text-slate-300 transition-colors hover:text-sky-300">Store Locator</Link></li>
              <li><Link to="/customer-care" className="text-slate-300 transition-colors hover:text-sky-300">Customer Care</Link></li>
            </ul>
          </div>

          <div>
            <p className="mb-3 text-[12px] uppercase tracking-[0.12em] text-sky-300">
              Support
            </p>
            <ul className="space-y-2 text-[13px]">
              <li><Link to="/shipping" className="text-slate-300 transition-colors hover:text-sky-300">Shipping</Link></li>
              <li><Link to="/returns" className="text-slate-300 transition-colors hover:text-sky-300">Returns</Link></li>
              <li><Link to="/warranty" className="text-slate-300 transition-colors hover:text-sky-300">Warranty</Link></li>
              <li><Link to="/wishlist" className="text-slate-300 transition-colors hover:text-sky-300">Wishlist</Link></li>
              <li><Link to="/cart" className="text-slate-300 transition-colors hover:text-sky-300">Cart</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
          <p className="text-[12px] text-slate-400">
            © {new Date().getFullYear()} Stacked. All rights reserved.
          </p>
          <p className="text-[12px] text-slate-400">
            Made for people who type for a living.
          </p>
        </div>
      </div>
    </footer>
  );
}
