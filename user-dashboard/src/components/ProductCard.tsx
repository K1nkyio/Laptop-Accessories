import { Link } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { formatPrice, getProductImage } from "@/lib/products";
import { captureWhatsAppInquiry, getWhatsAppOrderUrl } from "@/lib/whatsapp";

export interface ProductCardData {
  id: string;
  slug: string;
  name: string;
  brand: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  stock: number;
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const img = getProductImage(product.slug, product.image_url);
  const inStock = product.stock > 0;
  const whatsappUrl = getWhatsAppOrderUrl(product);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-slate-900/5 dark:hover:shadow-black/20">
      <Link to={`/product/${product.slug}`} className="block">
        <div className="aspect-square overflow-hidden border-b border-border bg-secondary/50">
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            width={800}
            height={800}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
      </Link>
      <div className="flex flex-1 flex-col gap-1 p-4">
        {product.brand && (
          <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {product.brand}
          </p>
        )}
        <Link to={`/product/${product.slug}`} className="hover:text-foreground/75">
          <h3 className="text-[14px] font-medium leading-snug text-foreground">
            {product.name}
          </h3>
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[14px] font-medium text-foreground">
            {formatPrice(product.price, product.currency)}
          </span>
          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] ${
              inStock ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
            }`}
          >
            {inStock ? "In stock" : "Sold out"}
          </span>
        </div>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          onClick={() => {
            void captureWhatsAppInquiry(product).catch(() => undefined);
          }}
          className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Order on WhatsApp
        </a>
      </div>
    </article>
  );
}
