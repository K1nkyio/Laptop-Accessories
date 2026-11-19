import { Link } from "react-router-dom";
import { ArrowRight, Heart, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { StoreFooter } from "@/components/StoreFooter";
import { StoreNav } from "@/components/StoreNav";
import { Button } from "@/components/ui/button";
import { moveWishlistToCart, removeFromWishlist, useStorefront } from "@/hooks/use-storefront";
import { formatPrice, getProductImage } from "@/lib/products";

export default function WishlistPage() {
  const { wishlist } = useStorefront();

  const handleMoveToCart = (productId: string, name: string) => {
    moveWishlistToCart(productId);
    toast(`${name} moved to your cart.`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <StoreNav />

      <section className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-[620px]">
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">Wishlist</p>
            <h1 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] leading-[0.98] tracking-[-0.05em]">
              The products worth coming back for.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
              Keep the maybes here, compare them calmly, and move the right ones into your cart when you are ready.
            </p>
          </div>

          {wishlist.length === 0 ? (
            <div className="mt-12 rounded-xl border border-border bg-card p-10 lg:p-12">
              <Heart className="h-7 w-7 text-foreground/75" />
              <h2 className="mt-6 text-[24px] tracking-[-0.03em] text-foreground">No saved products yet.</h2>
              <p className="mt-4 max-w-[520px] text-[14px] leading-7 text-muted-foreground">
                When something catches your eye but you are not ready to buy, save it here and keep the shortlist focused.
              </p>
              <Button asChild className="mt-8 rounded-none px-6">
                <Link to="/shop">
                  Browse the catalog
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="mt-12 grid gap-px border border-border bg-border md:grid-cols-2 xl:grid-cols-3">
              {wishlist.map((item) => (
                <article key={item.id} className="bg-background p-5">
                  <Link to={`/product/${item.slug}`} className="block overflow-hidden border border-border bg-secondary/20">
                    <img
                      src={getProductImage(item.slug, item.image_url)}
                      alt={item.name}
                      className="aspect-square h-full w-full object-cover transition-transform duration-500 hover:scale-[1.02]"
                    />
                  </Link>

                  <div className="mt-5">
                    {item.brand ? (
                      <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{item.brand}</p>
                    ) : null}
                    <Link to={`/product/${item.slug}`} className="mt-2 block text-[18px] leading-snug text-foreground">
                      {item.name}
                    </Link>
                    <p className="mt-3 text-[14px] text-foreground">{formatPrice(item.price, item.currency)}</p>
                  </div>

                  <div className="mt-6 grid gap-3">
                    <Button
                      onClick={() => handleMoveToCart(item.id, item.name)}
                      className="h-11 rounded-none text-[13px] uppercase tracking-[0.12em]"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      Move to cart
                    </Button>
                    <Button asChild variant="outline" className="h-11 rounded-none text-[13px] uppercase tracking-[0.12em]">
                      <Link to={`/product/${item.slug}`}>View product</Link>
                    </Button>
                    <button
                      type="button"
                      onClick={() => removeFromWishlist(item.id)}
                      className="inline-flex items-center justify-center gap-1.5 text-[12px] uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <StoreFooter />
    </div>
  );
}
