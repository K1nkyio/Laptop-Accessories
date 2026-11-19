import { Link } from "react-router-dom";
import { StackedLogo } from "./StackedLogo";

export function StoreFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-[1200px] px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2">
              <StackedLogo size={16} />
              <span className="text-[14px] font-bold text-foreground tracking-[0.08em] uppercase">
                Stacked
              </span>
            </Link>
            <p className="mt-4 text-[13px] text-muted-foreground leading-relaxed max-w-[220px]">
              Laptops & accessories for people who get things done.
            </p>
          </div>

          <div>
            <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground mb-3">
              Shop
            </p>
            <ul className="space-y-2 text-[13px]">
              <li><Link to="/shop/laptops" className="text-foreground/80 hover:text-foreground transition-colors">Laptops</Link></li>
              <li><Link to="/shop/mice" className="text-foreground/80 hover:text-foreground transition-colors">Mice</Link></li>
              <li><Link to="/shop/keyboards" className="text-foreground/80 hover:text-foreground transition-colors">Keyboards</Link></li>
              <li><Link to="/shop/docks" className="text-foreground/80 hover:text-foreground transition-colors">Docks & Hubs</Link></li>
              <li><Link to="/shop/bags" className="text-foreground/80 hover:text-foreground transition-colors">Bags</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground mb-3">
              Company
            </p>
            <ul className="space-y-2 text-[13px]">
              <li><Link to="/about" className="text-foreground/80 hover:text-foreground transition-colors">About</Link></li>
              <li><Link to="/stores" className="text-foreground/80 hover:text-foreground transition-colors">Stores</Link></li>
              <li><Link to="/contact" className="text-foreground/80 hover:text-foreground transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <p className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground mb-3">
              Support
            </p>
            <ul className="space-y-2 text-[13px]">
              <li><Link to="/shipping" className="text-foreground/80 hover:text-foreground transition-colors">Shipping</Link></li>
              <li><Link to="/returns" className="text-foreground/80 hover:text-foreground transition-colors">Returns</Link></li>
              <li><Link to="/warranty" className="text-foreground/80 hover:text-foreground transition-colors">Warranty</Link></li>
              <li><Link to="/wishlist" className="text-foreground/80 hover:text-foreground transition-colors">Wishlist</Link></li>
              <li><Link to="/cart" className="text-foreground/80 hover:text-foreground transition-colors">Cart</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border flex items-center justify-between">
          <p className="text-[12px] text-muted-foreground">
            © {new Date().getFullYear()} Stacked. All rights reserved.
          </p>
          <p className="text-[12px] text-muted-foreground">
            Made for people who type for a living.
          </p>
        </div>
      </div>
    </footer>
  );
}
