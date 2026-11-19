import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";

import { StoreFooter } from "@/components/StoreFooter";
import { StoreNav } from "@/components/StoreNav";
import { Button } from "@/components/ui/button";
import { useStorefront, removeFromCart, updateCartQuantity } from "@/hooks/use-storefront";
import { getStoredAuth } from "@/lib/auth";
import { formatPrice, getProductImage } from "@/lib/products";

export default function CartPage() {
  const { cart } = useStorefront();
  const auth = getStoredAuth();

  if (!auth) {
    return <Navigate to="/sign-in" replace state={{ redirectTo: "/cart" }} />;
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = cart.length > 0 ? 25 : 0;
  const total = subtotal + shipping;
  const currency = cart[0]?.currency ?? "USD";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <StoreNav />

      <section className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-[620px]">
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">Cart</p>
            <h1 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] leading-[0.98] tracking-[-0.05em]">
              Everything you are lining up to buy.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
              Review quantities, trim the list, or move straight into checkout when the shortlist feels right.
            </p>
          </div>

          {cart.length === 0 ? (
            <div className="mt-12 rounded-xl border border-border bg-card p-10 lg:p-12">
              <ShoppingBag className="h-7 w-7 text-foreground/75" />
              <h2 className="mt-6 text-[24px] tracking-[-0.03em] text-foreground">Your cart is still empty.</h2>
              <p className="mt-4 max-w-[520px] text-[14px] leading-7 text-muted-foreground">
                Start in the catalog, add the pieces you actually want, and come back here when you are ready to compare the total.
              </p>
              <Button asChild className="mt-8 rounded-none px-6">
                <Link to="/shop">
                  Browse the catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_360px]">
              <div className="grid gap-px border border-border bg-border">
                {cart.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-6 bg-background p-5 sm:grid-cols-[120px_minmax(0,1fr)_110px]"
                  >
                    <Link to={`/product/${item.slug}`} className="overflow-hidden border border-border bg-secondary/20">
                      <img
                        src={getProductImage(item.slug, item.image_url)}
                        alt={item.name}
                        className="aspect-square h-full w-full object-cover"
                      />
                    </Link>

                    <div>
                      {item.brand ? (
                        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{item.brand}</p>
                      ) : null}
                      <Link to={`/product/${item.slug}`} className="mt-2 block text-[18px] leading-snug text-foreground">
                        {item.name}
                      </Link>
                      <p className="mt-3 text-[13px] text-muted-foreground">
                        {formatPrice(item.price, item.currency)} each
                      </p>

                      <div className="mt-5 flex flex-wrap items-center gap-3">
                        <div className="inline-flex items-center border border-border">
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.quantity - 1)}
                            className="inline-flex h-10 w-10 items-center justify-center text-foreground/75 transition-colors hover:bg-secondary"
                            aria-label={`Decrease quantity for ${item.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="inline-flex h-10 min-w-12 items-center justify-center border-x border-border px-3 text-[14px]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQuantity(item.id, item.quantity + 1)}
                            className="inline-flex h-10 w-10 items-center justify-center text-foreground/75 transition-colors hover:bg-secondary"
                            aria-label={`Increase quantity for ${item.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="inline-flex items-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="sm:text-right">
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Line total</p>
                      <p className="mt-2 text-[18px] text-foreground">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </p>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="h-fit rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24">
                <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Summary</p>
                <div className="mt-6 space-y-4 border-y border-border py-5 text-[14px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatPrice(shipping, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-[18px] text-foreground">
                    <span>Total</span>
                    <span>{formatPrice(total, currency)}</span>
                  </div>
                </div>

                <p className="mt-5 text-[13px] leading-6 text-muted-foreground">
                  Shipping is estimated here for clarity. Final delivery timing is confirmed at checkout.
                </p>

                <div className="mt-6 grid gap-3">
                  <Button asChild className="h-12 rounded-none text-[13px] uppercase tracking-[0.12em]">
                    <Link to="/checkout">
                      Proceed to checkout
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="h-11 rounded-none text-[13px] uppercase tracking-[0.12em]">
                    <Link to="/shop">Continue shopping</Link>
                  </Button>
                </div>
              </aside>
            </div>
          )}
        </div>
      </section>

      <StoreFooter />
    </div>
  );
}
