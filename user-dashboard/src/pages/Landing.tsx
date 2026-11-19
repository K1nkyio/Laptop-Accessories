import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, MessageCircle, Truck, Laptop, Headphones, Monitor, CreditCard } from "lucide-react";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";

import { StoreNav } from "@/components/StoreNav";
import { StoreFooter } from "@/components/StoreFooter";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { HeroShowcase } from "@/components/HeroShowcase";
import { fetchProducts } from "@/lib/catalog-api";
import { fallbackSettings, fetchStoreSettings, type StoreSettings } from "@/lib/settings";

const Landing = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const diagonalLineColor = isDark ? "hsl(217 33% 25% / 0.45)" : "hsl(214 32% 86% / 0.55)";
  const [featured, setFeatured] = useState<ProductCardData[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(fallbackSettings);

  useEffect(() => {
    let cancelled = false;

    fetchProducts({ featured: true })
      .then((products) => {
        if (!cancelled) {
          setFeatured(products.slice(0, 4) as ProductCardData[]);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

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

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <StoreNav />

      <section className="relative z-10 overflow-hidden px-6 pb-0 pt-2">
        <div className="relative mx-auto max-w-[1200px]">
          <div className="relative grid gap-10 pb-14 pt-[46px] md:min-h-[680px] md:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] md:items-center">
            <div className="relative z-[3] max-w-[540px] min-w-0 flex-1">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-2 text-[12px] font-medium uppercase tracking-[0.12em] text-primary">
                <BadgeCheck className="h-3.5 w-3.5" />
                {settings.heroEyebrow}
              </div>
              <h1 className="max-w-[590px] text-[clamp(2.6rem,5.8vw,5.4rem)] font-[600] leading-[0.95] text-foreground">
                {settings.heroTitle}
              </h1>
              <p className="mt-6 max-w-[490px] text-[16px] leading-8 text-muted-foreground">
                {settings.heroDescription}
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link to="/shop">
                  <button className="group relative inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-6 text-[14px] font-semibold text-primary-foreground shadow-sm transition-all duration-200 hover:bg-primary/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                    Shop the catalog
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </button>
                </Link>
                <Link
                  to="/shop/laptops"
                  className="inline-flex h-12 items-center rounded-lg border border-border bg-card px-5 text-[14px] font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  Explore laptops
                </Link>
              </div>
              <div className="mt-9 grid max-w-[520px] gap-px border border-border bg-border sm:grid-cols-3">
                {[
                  { icon: Truck, label: "24h dispatch" },
                  { icon: MessageCircle, label: settings.whatsappNumber ? "WhatsApp help" : "Support ready" },
                  { icon: BadgeCheck, label: "Warranty ready" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2 bg-background px-4 py-3">
                    <item.icon className="h-4 w-4 text-foreground/70" />
                    <span className="text-[12px] font-medium text-foreground/80">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pointer-events-none relative z-[1] min-w-0">
              <HeroShowcase />
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 px-6">
        <div className="mx-auto max-w-[1400px]">
          <div className="relative h-24 w-full">
            <div className="absolute left-0 right-0 top-0 h-px bg-border">
              <div className="h-full w-[38%] bg-foreground/20" />
            </div>
            <div className="absolute right-[24%] top-0 h-full w-px bg-border/80" />
          </div>
        </div>
      </div>

      {settings.showFeaturedProducts ? (
      <section className="relative z-10 px-6 pb-24 pt-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-10 flex items-end justify-between">
            <div>
              <p className="mb-4 text-[13px] uppercase tracking-[0.15em] text-muted-foreground">
                Featured
              </p>
              <h2 className="text-[clamp(1.8rem,3vw,2.5rem)] font-[500] leading-[1.15] tracking-[-0.03em] text-foreground">
                The shortlist.
              </h2>
            </div>
            <Link
              to="/shop"
              className="hidden text-[13px] text-foreground/70 transition-colors hover:text-foreground sm:inline-flex"
            >
              View all
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-px border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((product) => (
              <div key={product.id} className="bg-background">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>
      ) : null}

      <section className="relative z-10 border-y border-border bg-card/45 px-6 py-20">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="mb-4 text-xs uppercase tracking-[.16em] text-primary">Choose by setup</p>
            <h2 className="text-3xl leading-tight tracking-[-.04em] text-foreground sm:text-4xl">Build a setup that fits the way you work.</h2>
            <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">Start with the device you use most, then add only the pieces that make your day easier. Browse by category or ask the team to help compare options.</p>
            <Link to="/shop" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary">Explore all products <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <div className="grid gap-px border border-border bg-border sm:grid-cols-2">
            {[
              { title: "Laptops", text: "Portable computers for study, office work, creative tasks, and everyday use.", icon: Laptop, to: "/shop/laptops" },
              { title: "Audio", text: "Headphones and speakers for calls, focus, travel, and listening at home.", icon: Headphones, to: "/shop/audio" },
              { title: "Workspace", text: "Displays and desk essentials that make a home or office setup more comfortable.", icon: Monitor, to: "/shop/monitors" },
              { title: "Accessories", text: "Adapters, hubs, chargers, and useful add-ons for your devices.", icon: BadgeCheck, to: "/shop/accessories" },
            ].map(({ title, text, icon: Icon, to }) => <Link key={title} to={to} className="group bg-background p-6 transition-colors hover:bg-primary/[.04]"><Icon className="h-5 w-5 text-primary" /><h3 className="mt-5 font-medium text-foreground">{title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p><span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-foreground">Browse category <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" /></span></Link>)}
          </div>
        </div>
      </section>

      <section className="relative z-10 px-6 py-20">
        <div className="mx-auto max-w-[1200px]">
          <p className="mb-4 text-xs uppercase tracking-[.16em] text-primary">A simple way to shop</p>
          <h2 className="max-w-xl text-3xl tracking-[-.04em] text-foreground sm:text-4xl">From shortlist to your door.</h2>
          <div className="mt-10 grid gap-8 border-t border-border pt-7 md:grid-cols-3">
            {[{n:"01",title:"Find your fit",body:"Compare product details and choose the device or accessory that suits your needs."},{n:"02",title:"Review your order",body:"Add your delivery or pickup details and check the order summary before payment."},{n:"03",title:"Pay securely",body:"For M-Pesa, request an STK prompt and approve it on your phone. We confirm the order when Safaricom reports success.",icon:CreditCard}].map((step)=><article key={step.n}><span className="text-xs font-semibold tracking-[.14em] text-primary">{step.n}</span><h3 className="mt-4 text-lg font-medium text-foreground">{step.title}</h3><p className="mt-3 max-w-sm text-sm leading-7 text-muted-foreground">{step.body}</p></article>)}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card p-6"><div><h3 className="font-medium text-foreground">Need a second opinion?</h3><p className="mt-1 text-sm text-muted-foreground">Contact us with the kind of work you do and the products you are considering.</p></div><Link to="/contact" className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-medium text-primary-foreground">Talk to the team <ArrowRight className="h-4 w-4" /></Link></div>
        </div>
      </section>

      <div className="relative z-10 w-full border-t border-border" />

      {settings.showWarrantyStrip ? (
      <section className="relative z-10 overflow-hidden px-6 py-24">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(-45deg, ${diagonalLineColor} 0px, ${diagonalLineColor} 1px, transparent 1px, transparent 8px)`,
          }}
        />
        <div className="relative mx-auto max-w-[1200px]">
          <div className="border border-border bg-background">
            <div className="grid grid-cols-1 md:grid-cols-3">
                {[
                { title: "Honest pricing", desc: "What you see is what you pay. No bundle gymnastics." },
                { title: "Vetted gear", desc: "Every product is something we'd put on our own desk." },
                { title: "Real warranty", desc: settings.defaultWarranty },
              ].map((pillar, index) => (
                <div
                  key={pillar.title}
                  className={`${index < 2 ? "border-border md:border-r" : ""} ${
                    index > 0 ? "border-border border-t md:border-t-0" : ""
                  } p-10`}
                >
                  <h3 className="mb-2 text-[15px] font-medium text-foreground">{pillar.title}</h3>
                  <p className="text-[13px] leading-[1.6] text-muted-foreground">{pillar.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      ) : null}

      <StoreFooter />
    </div>
  );
};

export default Landing;
