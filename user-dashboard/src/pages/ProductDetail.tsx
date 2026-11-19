import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Heart,
  ShoppingBag,
  ShieldCheck,
  Truck,
  RotateCcw,
  ImageIcon,
  MessageCircle,
  Star,
} from "lucide-react";
import { toast } from "sonner";

import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { StoreFooter } from "@/components/StoreFooter";
import { StoreNav } from "@/components/StoreNav";
import { Button } from "@/components/ui/button";
import { addToCart, addToWishlist, type StorefrontProduct } from "@/hooks/use-storefront";
import type { CatalogProduct } from "@/lib/catalog";
import { fetchProductBySlug, fetchProducts } from "@/lib/catalog-api";
import { getStoredAuth } from "@/lib/auth";
import { formatPrice, getProductImage } from "@/lib/products";
import { fetchProductReviews, submitProductReview, type ProductReview } from "@/lib/reviews";
import { fallbackSettings, fetchStoreSettings, type StoreSettings } from "@/lib/settings";
import { captureWhatsAppInquiry, getWhatsAppOrderUrl } from "@/lib/whatsapp";

interface ProductDetailRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  brand: string | null;
  price: number;
  currency: string;
  image_url: string | null;
  stock: number;
  category_id: string | null;
  product_type: string | null;
}

const ProductDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState("1");
  const [databaseProduct, setDatabaseProduct] = useState<CatalogProduct | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<ProductCardData[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewRating, setReviewRating] = useState("5");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [settings, setSettings] = useState<StoreSettings>(fallbackSettings);
  const [loading, setLoading] = useState(true);

  const product = useMemo(() => {
    if (!slug) return null;

    const catalogProduct = databaseProduct;
    if (!catalogProduct) return null;

    return {
      id: catalogProduct.id,
      slug: catalogProduct.slug,
      name: catalogProduct.name,
      description: catalogProduct.description,
      brand: catalogProduct.brand,
      price: catalogProduct.price,
      currency: catalogProduct.currency,
      image_url: catalogProduct.image_url,
      stock: catalogProduct.stock,
      category_id: catalogProduct.categoryId,
      product_type: catalogProduct.productType,
    } as ProductDetailRow;
  }, [databaseProduct, slug]);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    setLoading(true);

    fetchProductBySlug(slug)
      .then((item) => {
        if (!cancelled) setDatabaseProduct(item);
      })
      .catch(() => {
        if (!cancelled) setDatabaseProduct(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    fetchStoreSettings()
      .then((value) => {
        if (!cancelled) setSettings(value);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!product?.category_id) {
      setRelatedProducts([]);
      return;
    }

    let cancelled = false;

    fetchProducts({ categoryId: product.category_id })
      .then((items) => {
        if (!cancelled) {
          setRelatedProducts(
            items
              .filter((item) => item.id !== product.id)
              .slice(0, 4)
              .map((item) => ({
                id: item.id,
                slug: item.slug,
                name: item.name,
                brand: item.brand,
                price: item.price,
                currency: item.currency,
                image_url: item.image_url,
                stock: item.stock,
              })) as ProductCardData[],
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRelatedProducts([]);
      });

    return () => {
      cancelled = true;
    };
  }, [product?.category_id, product?.id]);

  useEffect(() => {
    if (!product?.id) {
      setReviews([]);
      return;
    }

    let cancelled = false;
    fetchProductReviews(product.id)
      .then((items) => {
        if (!cancelled) setReviews(items);
      })
      .catch(() => {
        if (!cancelled) setReviews([]);
      });

    return () => {
      cancelled = true;
    };
  }, [product?.id]);

  const overview = useMemo(() => {
    if (!product) return "";
    return getOverview(product);
  }, [product]);

  const galleryItems = useMemo(() => {
    if (!product) return [];
    const image = getProductImage(product.slug, product.image_url);
    return [
      { id: "primary", label: "Primary", src: image, position: "object-center" },
      { id: "detail", label: "Detail", src: image, position: "object-[50%_35%]" },
      { id: "finish", label: "Finish", src: image, position: "object-[50%_60%]" },
      { id: "setup", label: "Setup", src: image, position: "object-[50%_45%]" },
    ];
  }, [product]);

  const supportingCopy = useMemo(() => {
    if (!product) return [];
    return [getUseCaseCopy(product), getFulfillmentCopy(product, settings)];
  }, [product, settings]);

  const specs = useMemo(() => {
    if (!product) return [];
    return [
      { label: "Brand", value: product.brand ?? "Stacked select" },
      { label: "Type", value: getDisplayType(product) },
      { label: "Availability", value: getAvailabilityLabel(product.stock) },
      { label: "Shipping", value: settings.shippingNote || getShippingEstimate(product) },
      { label: "Warranty", value: settings.defaultWarranty || getWarrantyLabel(product) },
      { label: "Returns", value: "30-day returns" },
      { label: "SKU", value: product.slug.toUpperCase() },
      { label: "Stock status", value: product.stock > 0 ? "Ready to order" : "Awaiting restock" },
    ];
  }, [product, settings]);

  const highlightCards = useMemo(() => {
    if (!product) return [];
    return [
      { label: "Delivery", value: settings.shippingNote || getShippingEstimate(product), icon: Truck },
      { label: "Warranty", value: settings.defaultWarranty || getWarrantyLabel(product), icon: ShieldCheck },
      { label: "Returns", value: "30-day returns", icon: RotateCcw },
    ];
  }, [product, settings]);

  const handleAddToCart = () => {
    if (!product) return;
    if (!getStoredAuth()) {
      toast("Sign in before adding products to your cart.");
      navigate("/sign-in", { state: { redirectTo: `/product/${product.slug}` } });
      return;
    }

    if (product.stock === 0) {
      toast(`${product.name} is currently sold out.`);
      return;
    }

    addToCart(toStorefrontProduct(product), Number(quantity));
    toast(`${quantity} x ${product.name} added to your cart.`);
  };

  const handleWishlist = () => {
    if (!product) return;
    addToWishlist(toStorefrontProduct(product));
    toast(`${product.name} added to your wishlist.`);
  };

  const handleCheckout = () => {
    if (!product || product.stock === 0) return;
    if (!getStoredAuth()) {
      toast("Sign in before checking out.");
      navigate("/sign-in", { state: { redirectTo: `/product/${product.slug}` } });
      return;
    }

    addToCart(toStorefrontProduct(product), Number(quantity));
    navigate("/checkout");
  };

  const handleSubmitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!product) return;

    const auth = getStoredAuth();
    if (!auth) {
      toast("Sign in before leaving a review.");
      navigate("/sign-in", { state: { redirectTo: `/product/${product.slug}` } });
      return;
    }

    setReviewMessage("");
    try {
      await submitProductReview(
        product.id,
        { rating: Number(reviewRating), comment: reviewComment },
      );
      setReviewComment("");
      setReviewRating("5");
      setReviewMessage("Thanks. Your review is awaiting admin approval.");
    } catch (caught) {
      setReviewMessage(caught instanceof Error ? caught.message : "Could not submit review");
    }
  };

  const handleWhatsAppOrder = () => {
    if (!product) return;
    void captureWhatsAppInquiry(product).catch(() => undefined);
    window.open(getWhatsAppOrderUrl(product), "_blank", "noopener,noreferrer");
  };

  const handleCheckIn = () => {
    if (!product || product.stock === 0) return;
    navigate("/check-in", { state: { product, quantity: Number(quantity) } });
  };

  useEffect(() => {
    setQuantity("1");
  }, [product?.id]);

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <StoreNav />

      <section className="flex-1 px-6 py-10 lg:py-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-8 flex flex-wrap items-center gap-2 text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
            <Link to="/" className="transition-colors hover:text-foreground">
              Home
            </Link>
            <span>/</span>
            <Link to="/shop" className="transition-colors hover:text-foreground">
              Catalog
            </Link>
            <span>/</span>
            <span>{getDisplayType(product ?? null)}</span>
          </div>

          <Link
            to="/shop"
            className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to catalog
          </Link>

          {loading ? (
            <div className="border border-border p-16 text-center">
              <p className="text-[14px] text-muted-foreground">Loading product...</p>
            </div>
          ) : !product ? (
            <div className="border border-border p-16 text-center">
              <p className="text-[14px] text-muted-foreground">
                Product not found.{" "}
                <Link to="/shop" className="text-foreground underline">
                  Browse the catalog
                </Link>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-9 lg:grid-cols-[minmax(0,0.9fr)_minmax(360px,1fr)]">
                <div>
                  <div className="overflow-hidden rounded-2xl border border-border bg-secondary/30">
                    <div className="flex min-h-[360px] items-center justify-center p-8 lg:min-h-[520px] lg:p-12">
                      <img
                        src={getProductImage(product.slug, product.image_url)}
                        alt={product.name}
                        width={1200}
                        height={1200}
                        className="max-h-[300px] w-auto max-w-full object-contain lg:max-h-[470px]"
                      />
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-4 gap-3">
                    {galleryItems.map((item, index) => (
                      <div
                        key={item.id}
                        className="overflow-hidden rounded-xl border border-border bg-card p-2"
                      >
                        <div className="flex aspect-square items-center justify-center overflow-hidden bg-secondary/20">
                          <img
                            src={item.src}
                            alt={`${product.name} ${item.label}`}
                            width={200}
                            height={200}
                            className={`h-full w-full object-cover ${item.position}`}
                          />
                        </div>
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                          <ImageIcon className="h-3 w-3" />
                          <span>{index === 0 ? "Main" : item.label}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  {product.brand ? (
                    <p className="mb-3 text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
                      {product.brand}
                    </p>
                  ) : null}

                  <h1 className="max-w-[560px] text-[clamp(2rem,3vw,3rem)] font-[500] leading-[1.04] tracking-[-0.05em] text-foreground">
                    {product.name}
                  </h1>

                  <p className="mt-3 text-[13px] text-muted-foreground">
                    {product.stock > 0 ? "Available for immediate ordering and delivery." : "Currently unavailable. Enquire for restock timing."}
                  </p>

                  <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
                    <div className="p-6 lg:p-7">
                      <div className="flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">
                            Price
                          </p>
                          <p className="mt-2 text-[34px] font-[500] tracking-[-0.04em] text-foreground">
                            {formatPrice(product.price, product.currency)}
                          </p>
                        </div>
                        {product.stock > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[12px] uppercase tracking-[0.12em] text-success">
                            <Check className="h-3 w-3" />
                            In stock
                          </span>
                        ) : (
                          <span className="text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
                            Sold out
                          </span>
                        )}
                      </div>

                      <div className="mt-6">
                        <label className="block">
                          <span className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                            Quantity
                          </span>
                          <select
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            className="h-11 w-full rounded-lg border border-border bg-secondary/65 px-3 text-[14px] text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
                          >
                            {["1", "2", "3", "4", "5"].map((value) => (
                              <option key={value} value={value}>
                                {value}
                              </option>
                            ))}
                          </select>
                        </label>

                        <div className="mt-4 space-y-3">
                          <Button
                            onClick={handleAddToCart}
                            disabled={product.stock === 0}
                            className="h-12 w-full rounded-none text-[13px] uppercase tracking-[0.12em]"
                          >
                            <ShoppingBag className="h-4 w-4" />
                            {product.stock > 0 ? "Add to cart" : "Sold out"}
                          </Button>

                          <Button
                            variant="outline"
                            onClick={handleWishlist}
                            className="h-11 w-full rounded-none text-[13px] uppercase tracking-[0.12em]"
                          >
                            <Heart className="h-4 w-4" />
                            Add to wishlist
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCheckout}
                            disabled={product.stock === 0}
                            className="h-11 w-full rounded-none text-[13px] uppercase tracking-[0.12em]"
                          >
                            <ArrowRight className="h-4 w-4" />
                            Checkout
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCheckIn}
                            disabled={product.stock === 0}
                            className="h-11 w-full rounded-none text-[13px] uppercase tracking-[0.12em]"
                          >
                            <ShoppingBag className="h-4 w-4" />
                            Check in
                          </Button>

                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleWhatsAppOrder}
                            className="h-11 w-full rounded-none border-foreground/50 text-[13px] uppercase tracking-[0.12em]"
                          >
                            <MessageCircle className="h-4 w-4" />
                            Order on WhatsApp
                          </Button>
                        </div>
                      </div>

                      <p className="mt-4 text-[12px] leading-6 text-muted-foreground">
                        You can save this item, move to checkout, or open WhatsApp with the product name already filled in.
                      </p>
                    </div>

                    <div className="grid grid-cols-3 border-t border-border">
                      {highlightCards.map((item, index) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.label}
                            className={`bg-card p-4 ${index < highlightCards.length - 1 ? "border-r border-border" : ""}`}
                          >
                            <Icon className="h-4 w-4 text-foreground/70" />
                            <p className="mt-3 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                              {item.label}
                            </p>
                            <p className="mt-1.5 text-[13px] leading-6 text-foreground">{item.value}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-9 lg:grid-cols-2">
                <section className="min-h-[260px] rounded-xl border border-border bg-card p-6 lg:p-7">
                  <h2 className="text-[18px] font-medium tracking-[-0.03em] text-foreground">
                    Description
                  </h2>
                  <div className="mt-5 space-y-5">
                    <p className="text-[14px] leading-7 text-muted-foreground">{overview}</p>
                    {supportingCopy.map((paragraph) => (
                      <p key={paragraph} className="text-[14px] leading-7 text-muted-foreground">
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </section>

                <aside className="min-h-[260px] rounded-xl border border-border bg-card p-6 lg:p-7">
                  <h2 className="text-[18px] font-medium tracking-[-0.03em] text-foreground">
                    Specs
                  </h2>
                  <dl className="mt-5 divide-y divide-border">
                    {specs.map((spec) => (
                      <div
                        key={spec.label}
                        className="grid grid-cols-[108px_minmax(0,1fr)] gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        <dt className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          {spec.label}
                        </dt>
                        <dd className="text-[13px] leading-6 text-foreground">{spec.value}</dd>
                      </div>
                    ))}
                  </dl>
                </aside>
              </div>

              <section className="mt-10 rounded-xl border border-border bg-card p-6 lg:p-7">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                      Customer reviews
                    </p>
                    <h2 className="mt-2 text-[24px] font-medium tracking-[-0.04em] text-foreground">
                      What buyers are saying.
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star
                        key={n}
                        className={`h-4 w-4 ${n <= Math.round(averageRating(reviews)) ? "fill-warning text-warning" : "text-muted-foreground/40"}`}
                      />
                    ))}
                    <span className="text-[13px] text-muted-foreground">
                      {reviews.length ? averageRating(reviews).toFixed(1) : "No reviews yet"}
                    </span>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
                  <div className="grid gap-3">
                    {reviews.map((review) => (
                      <article key={review.id} className="rounded-xl border border-border bg-secondary/35 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[14px] font-medium text-foreground">{review.customer_name}</p>
                            <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                              {new Date(review.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <Star key={n} className={`h-3.5 w-3.5 ${n <= review.rating ? "fill-warning text-warning" : "text-muted-foreground/40"}`} />
                            ))}
                          </div>
                        </div>
                        <p className="mt-3 text-[13px] leading-6 text-muted-foreground">{review.comment}</p>
                      </article>
                    ))}
                    {!reviews.length ? (
                      <div className="border border-border p-5 text-[13px] text-muted-foreground">
                        No approved reviews yet. Be the first to leave one.
                      </div>
                    ) : null}
                  </div>

                  <form onSubmit={handleSubmitReview} className="h-fit rounded-xl border border-border bg-card p-5 shadow-sm shadow-slate-900/[0.025]">
                    <h3 className="text-[15px] font-medium text-foreground">Leave a review</h3>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Rating</span>
                      <select
                        value={reviewRating}
                        onChange={(event) => setReviewRating(event.target.value)}
                        className="h-10 w-full rounded-lg border border-border bg-secondary/65 px-3 text-[13px] outline-none transition-colors focus:border-primary focus:bg-card"
                      >
                        {[5, 4, 3, 2, 1].map((value) => (
                          <option key={value} value={value}>{value} stars</option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-4 block">
                      <span className="mb-2 block text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Review</span>
                      <textarea
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-lg border border-border bg-secondary/65 px-3 py-2 text-[13px] leading-6 outline-none transition-colors focus:border-primary focus:bg-card"
                        placeholder="Share what stood out after using it."
                        required
                      />
                    </label>
                    {reviewMessage ? <p className="mt-3 text-[12px] leading-5 text-muted-foreground">{reviewMessage}</p> : null}
                    <Button type="submit" className="mt-4 h-10 w-full rounded-none text-[12px] uppercase tracking-[0.12em]">
                      Submit review
                    </Button>
                  </form>
                </div>
              </section>

              {relatedProducts.length > 0 ? (
                <section className="mt-14">
                  <div className="mb-8 flex items-end justify-between gap-6">
                    <div>
                      <p className="mb-3 text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                        Related products
                      </p>
                      <h2 className="text-[clamp(1.6rem,2.8vw,2.3rem)] tracking-[-0.04em] text-foreground">
                        More from the same shortlist.
                      </h2>
                    </div>
                    <Link
                      to="/shop"
                      className="hidden items-center gap-1.5 text-[13px] text-foreground/70 transition-colors hover:text-foreground sm:inline-flex"
                    >
                      View full catalog
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-4">
                    {relatedProducts.map((item) => (
                      <div key={item.id} className="bg-background">
                        <ProductCard product={item} />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}
            </>
          )}
        </div>
      </section>

      <StoreFooter />
    </div>
  );
};

function getOverview(product: ProductDetailRow): string {
  if (product.description?.trim()) return product.description.trim();
  return `${product.name} is part of the Stacked shortlist for people who want dependable hardware without the usual noise. It is chosen for everyday performance, clean industrial design, and the kind of reliability that keeps a workspace moving.`;
}

function toStorefrontProduct(product: ProductDetailRow): StorefrontProduct {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.brand,
    price: product.price,
    currency: product.currency,
    image_url: product.image_url,
    stock: product.stock,
  };
}

function getUseCaseCopy(product: ProductDetailRow): string {
  const type = getDisplayType(product).toLowerCase();

  if (type.includes("laptop")) {
    return "This model is suited to focused workdays, travel between desks, and anyone who wants a machine that feels composed under real workloads rather than just benchmark-heavy marketing.";
  }

  if (type.includes("mouse")) {
    return "It is a strong fit for long desk sessions, precise navigation, and setups where comfort matters as much as responsiveness.";
  }

  if (type.includes("keyboard")) {
    return "Expect a typing experience tuned for long-form work, deliberate input, and a desk setup that feels intentional rather than crowded.";
  }

  if (type.includes("dock")) {
    return "This is built for tidier cable management, simpler desk transitions, and a more complete workstation with less friction every time you sit down.";
  }

  if (type.includes("bag")) {
    return "It works best for carrying daily essentials cleanly, protecting devices in transit, and keeping a mobile setup organized without bulk.";
  }

  return "It is designed to slot into a modern work setup with minimal friction, balancing utility, durability, and a cleaner everyday experience.";
}

function getFulfillmentCopy(product: ProductDetailRow, settings: StoreSettings): string {
  const shipping = settings.shippingNote || getShippingEstimate(product);
  const warranty = settings.defaultWarranty || getWarrantyLabel(product);
  return `${shipping} ${warranty} 30-day returns apply. If you want help confirming fit or compatibility before ordering, the contact page connects you directly to the store team.`;
}

function getDisplayType(product: ProductDetailRow | null): string {
  if (!product) return "Product";
  if (product.product_type?.trim()) return product.product_type.trim();

  const slug = product.slug.toLowerCase();
  if (slug.includes("mouse")) return "Mouse";
  if (slug.includes("keyboard")) return "Keyboard";
  if (slug.includes("dock") || slug.includes("hub")) return "Dock";
  if (slug.includes("bag") || slug.includes("brief")) return "Bag";
  return "Laptop";
}

function getShippingEstimate(product: ProductDetailRow): string {
  const type = getDisplayType(product).toLowerCase();
  return type.includes("laptop") ? "2-3 business days" : "1-2 business days";
}

function getWarrantyLabel(product: ProductDetailRow): string {
  const type = getDisplayType(product).toLowerCase();
  return type.includes("laptop") ? "2-year warranty" : "1-year warranty";
}

function getAvailabilityLabel(stock: number): string {
  if (stock <= 0) return "Currently sold out";
  if (stock <= 3) return `Only ${stock} left in stock`;
  return `${stock} units ready to ship`;
}

function averageRating(reviews: ProductReview[]) {
  if (!reviews.length) return 0;
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

export default ProductDetail;
