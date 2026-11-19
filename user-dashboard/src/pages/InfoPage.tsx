import type { LucideIcon } from "lucide-react";
import { ArrowRight, ArrowUpRight, Clock3, MapPin, Package, RotateCcw, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

import { StoreFooter } from "@/components/StoreFooter";
import { StoreNav } from "@/components/StoreNav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type InfoPageKey = "about" | "stores" | "contact" | "shipping" | "returns" | "warranty";

interface InfoHero {
  eyebrow: string;
  title: string;
  description: string;
  badge: string;
}

interface InfoPanel {
  title: string;
  body: string;
}

interface InfoHighlight {
  label: string;
  value: string;
}

interface InfoAction {
  label: string;
  to: string;
  variant?: "default" | "outline";
}

interface InfoFeature {
  title: string;
  description: string;
}

interface InfoSection {
  id: string;
  kicker: string;
  title: string;
  description: string;
  panels: InfoPanel[];
}

interface InfoPageConfig {
  hero: InfoHero;
  icon: LucideIcon;
  highlights: InfoHighlight[];
  primaryAction: InfoAction;
  secondaryAction?: InfoAction;
  features: InfoFeature[];
  sections: InfoSection[];
}

const infoPages: Record<InfoPageKey, InfoPageConfig> = {
  about: {
    hero: {
      eyebrow: "Company",
      title: "A quieter kind of tech store.",
      description:
        "Stacked curates laptops and desk gear with the same discipline people expect from the tools they buy: no clutter, no inflated bundles, and no hard sell.",
      badge: "Small catalog. Sharp standards.",
    },
    icon: Clock3,
    highlights: [
      { label: "Founded", value: "2026" },
      { label: "Focus", value: "Work-ready gear" },
      { label: "Promise", value: "No fluff merchandising" },
    ],
    primaryAction: { label: "Browse the shop", to: "/shop" },
    secondaryAction: { label: "Talk to us", to: "/contact", variant: "outline" },
    features: [
      {
        title: "Curated by use, not hype",
        description: "We choose products for durability, repairability, and how well they disappear into real work.",
      },
      {
        title: "Support that stays human",
        description: "When something goes wrong, you talk to people who understand the hardware and can help quickly.",
      },
      {
        title: "Designed for decisive shopping",
        description: "Every page is meant to help customers choose faster, with fewer tabs and less second-guessing.",
      },
    ],
    sections: [
      {
        id: "approach",
        kicker: "How we choose",
        title: "Every product earns its way in.",
        description:
          "The assortment is intentionally small so each item can be defended on performance, design, and value.",
        panels: [
          {
            title: "Performance first",
            body: "We bias toward laptops and accessories that keep up with editing, coding, analysis, and long office days without feeling overbuilt.",
          },
          {
            title: "Less noise, better decisions",
            body: "We cut duplicate options and avoid confusing tiers so customers can compare meaningfully instead of endlessly.",
          },
        ],
      },
      {
        id: "service",
        kicker: "How we operate",
        title: "The store experience is part of the product.",
        description:
          "Packaging, delivery updates, post-purchase support, and warranty handling are treated with the same care as the hardware itself.",
        panels: [
          {
            title: "Clear policies",
            body: "Shipping, returns, and warranty terms are written to be readable at a glance, not buried in legal fog.",
          },
          {
            title: "Long-term ownership",
            body: "We want customers to buy less often and buy better, with accessories that actually extend how useful a setup feels.",
          },
        ],
      },
    ],
  },
  stores: {
    hero: {
      eyebrow: "Stores",
      title: "Find your nearest store.",
      description:
        "Visit us in Nairobi or Eldoret to browse our products and get help from the team in person.",
      badge: "Nairobi and Eldoret branches",
    },
    icon: MapPin,
    highlights: [
      { label: "Locations", value: "Nairobi and Eldoret" },
      { label: "Walk-ins", value: "Welcome daily" },
      { label: "Pickup", value: "Available in store" },
    ],
    primaryAction: { label: "Contact a store", to: "/contact" },
    secondaryAction: { label: "Shipping details", to: "/shipping", variant: "outline" },
    features: [
      {
        title: "Hands-on product tables",
        description: "Try keyboards, compare screen finishes, and get a feel for the exact setup before you buy.",
      },
      {
        title: "Pickup made simple",
        description: "Reserve online, collect in store, and let our team walk you through the device before you leave.",
      },
      {
        title: "Advice without pressure",
        description: "Store staff are trained to guide decisions, not force upgrades that do not fit the workload.",
      },
    ],
    sections: [
      {
        id: "locations",
        kicker: "Locations",
        title: "Visit us in Nairobi or Eldoret.",
        description:
          "Find the branch that works for you. Open directions in Google Maps before you set out.",
        panels: [
          {
            title: "Nairobi branch",
            body: "Shop 39–40, Electronics House, Luthuli Avenue, Nairobi.",
          },
          {
            title: "Eldoret branch",
            body: "First floor, DK Plaza, Uganda Road, Eldoret.",
          },
        ],
      },
      {
        id: "services",
        kicker: "Store services",
        title: "Built for quick decisions and confident checkout.",
        description:
          "Customers can reserve devices, verify accessories against their laptop model, and get immediate support on shipping or returns.",
        panels: [
          {
            title: "Compatibility checks",
            body: "Bring a laptop or spec sheet and we will confirm dock, charger, sleeve, and mouse compatibility before payment.",
          },
          {
            title: "Business purchases",
            body: "We support equipment lists, staged pickups, and simple invoicing for teams buying in batches.",
          },
        ],
      },
    ],
  },
  contact: {
    hero: {
      eyebrow: "Contact",
      title: "Reach the team that knows the catalog.",
      description:
        "Whether a customer needs model advice, an order update, or help choosing the right accessories, this page keeps the next step straightforward.",
      badge: "Replies within one business day",
    },
    icon: ArrowRight,
    highlights: [
      { label: "Email", value: "help@stacked.store" },
      { label: "Phone", value: "+254 700 000 000" },
      { label: "Support hours", value: "8 AM - 6 PM" },
    ],
    primaryAction: { label: "Sign in", to: "/sign-in" },
    secondaryAction: { label: "Find a store", to: "/stores", variant: "outline" },
    features: [
      {
        title: "Pre-purchase guidance",
        description: "Ask for shortlist recommendations based on workload, budget, and preferred size.",
      },
      {
        title: "Order support",
        description: "Track dispatch, update a delivery detail, or confirm pickup status without bouncing between channels.",
      },
      {
        title: "After-sales help",
        description: "Get assistance with warranty claims, returns, or pairing the right accessory after purchase.",
      },
    ],
    sections: [
      {
        id: "channels",
        kicker: "Contact channels",
        title: "Choose the route that matches the question.",
        description:
          "Fast answers come from the right queue, so we separate product advice, order support, and business account conversations.",
        panels: [
          {
            title: "Customer care",
            body: "Use email or the support line for order questions, invoice requests, shipping changes, or post-purchase issues.",
          },
          {
            title: "Sales guidance",
            body: "Reach out for spec comparisons, bulk purchase pricing, curated setup suggestions, and store appointment requests.",
          },
        ],
      },
      {
        id: "availability",
        kicker: "Availability",
        title: "Support hours that match shopping hours.",
        description:
          "The team covers business days in full and keeps weekend store channels active for walk-ins, pickups, and urgent queries.",
        panels: [
          {
            title: "Remote support",
            body: "Monday to Friday, 8:00 AM to 6:00 PM. Best for policy questions, quotes, and order management.",
          },
          {
            title: "Store support",
            body: "Open during showroom hours for product demos, accessory matching, and same-day collection updates.",
          },
        ],
      },
    ],
  },
  shipping: {
    hero: {
      eyebrow: "Support",
      title: "Shipping that stays visible from checkout to delivery.",
      description:
        "We keep fulfillment tight, timelines realistic, and communication clear so customers know what is moving, when it ships, and what happens next.",
      badge: "Tracked on every order",
    },
    icon: Package,
    highlights: [
      { label: "Dispatch", value: "24 hours on stocked items" },
      { label: "Pickup", value: "Same day where available" },
      { label: "Coverage", value: "Nationwide delivery" },
    ],
    primaryAction: { label: "Start shopping", to: "/shop" },
    secondaryAction: { label: "Returns policy", to: "/returns", variant: "outline" },
    features: [
      {
        title: "Transparent lead times",
        description: "Estimated windows are shown before checkout and updated again as soon as payment is confirmed.",
      },
      {
        title: "Protected packaging",
        description: "Laptops and fragile accessories ship in double-boxed packaging with protective cushioning.",
      },
      {
        title: "Useful updates",
        description: "Customers receive order confirmation, dispatch notice, and delivery progress without marketing clutter.",
      },
    ],
    sections: [
      {
        id: "timelines",
        kicker: "Delivery windows",
        title: "Fast when possible, honest when not.",
        description:
          "We separate in-stock dispatch, regional delivery, and special-order timelines so there are no false expectations.",
        panels: [
          {
            title: "In-stock orders",
            body: "Orders confirmed before midday are usually dispatched the same day; anything later moves first thing the next morning.",
          },
          {
            title: "Regional delivery",
            body: "Major urban centers typically arrive within one to two business days, while longer-distance routes may take up to four.",
          },
        ],
      },
      {
        id: "handling",
        kicker: "What to expect",
        title: "Packaging, pickup, and delivery support are built in.",
        description:
          "Customers can collect in store, arrange courier delivery, or request help if an address needs to change after checkout.",
        panels: [
          {
            title: "Secure packaging",
            body: "Every laptop shipment includes impact protection and tamper-evident sealing to reduce transit risk.",
          },
          {
            title: "Address support",
            body: "If a delivery detail changes before dispatch, our team can usually update it quickly through customer care.",
          },
        ],
      },
    ],
  },
  returns: {
    hero: {
      eyebrow: "Support",
      title: "Returns with clear windows and practical next steps.",
      description:
        "When a purchase is wrong for the setup or arrives with a problem, customers should not have to decode a maze of conditions to fix it.",
      badge: "Straightforward return guidance",
    },
    icon: RotateCcw,
    highlights: [
      { label: "Window", value: "14 days on eligible items" },
      { label: "Review", value: "1 business day" },
      { label: "Refunds", value: "Processed after inspection" },
    ],
    primaryAction: { label: "Contact support", to: "/contact" },
    secondaryAction: { label: "Warranty terms", to: "/warranty", variant: "outline" },
    features: [
      {
        title: "Eligibility explained clearly",
        description: "Customers can quickly see which items can be returned and what condition they need to be in.",
      },
      {
        title: "Fast inspection turnarounds",
        description: "Returned products are checked promptly so replacements, exchanges, or refunds do not linger unnecessarily.",
      },
      {
        title: "Practical outcomes",
        description: "Depending on the case, we can refund, exchange, or redirect a customer toward the better-fit product.",
      },
    ],
    sections: [
      {
        id: "eligibility",
        kicker: "Return eligibility",
        title: "A short window, clearly defined.",
        description:
          "We keep the process predictable by outlining who qualifies, what condition matters, and when special handling applies.",
        panels: [
          {
            title: "Standard returns",
            body: "Unused accessories and unopened hardware can usually be returned within 14 days with original packaging and proof of purchase.",
          },
          {
            title: "Opened devices",
            body: "Opened laptops may be reviewed for exchange or repair support first, especially when the issue is technical rather than preference-based.",
          },
        ],
      },
      {
        id: "process",
        kicker: "How it works",
        title: "Report the issue, get instructions, send it back.",
        description:
          "The team confirms eligibility, issues return guidance, and keeps the customer updated once the product is received and inspected.",
        panels: [
          {
            title: "Before sending anything",
            body: "Contact support first so we can confirm the right return route and avoid delays caused by incomplete packages.",
          },
          {
            title: "After inspection",
            body: "Refunds and exchanges are processed once the item condition is verified against the original request.",
          },
        ],
      },
    ],
  },
  warranty: {
    hero: {
      eyebrow: "Support",
      title: "Warranty coverage that means something in practice.",
      description:
        "We frame warranty terms around the moment a customer needs them: what is covered, how to start, and what kind of resolution to expect.",
      badge: "Built for real ownership",
    },
    icon: ShieldCheck,
    highlights: [
      { label: "Laptops", value: "2-year coverage" },
      { label: "Accessories", value: "1-year coverage" },
      { label: "Claims", value: "Handled by support" },
    ],
    primaryAction: { label: "Start a claim", to: "/contact" },
    secondaryAction: { label: "View returns", to: "/returns", variant: "outline" },
    features: [
      {
        title: "Coverage by product type",
        description: "Laptops and accessories have different durations, but both come with clear handling and support.",
      },
      {
        title: "Service-oriented claims",
        description: "We guide diagnostics, documentation, and next steps so the process stays manageable.",
      },
      {
        title: "Repair or replace focus",
        description: "The goal is to restore a working setup quickly, not leave the customer stuck in administration.",
      },
    ],
    sections: [
      {
        id: "coverage",
        kicker: "Coverage",
        title: "What we stand behind after the sale.",
        description:
          "Standard warranty applies to manufacturing faults and hardware failures under normal use, with category-specific terms shown clearly.",
        panels: [
          {
            title: "Laptop protection",
            body: "Portable devices include two years of warranty support covering qualifying defects in components, display, and internal hardware.",
          },
          {
            title: "Accessory protection",
            body: "Keyboards, mice, docks, chargers, and bags include one year of coverage for eligible workmanship or material issues.",
          },
        ],
      },
      {
        id: "claims",
        kicker: "Claims process",
        title: "Start with support, then let us guide the rest.",
        description:
          "A warranty request moves faster when the team can identify the product, issue, and purchase record from the beginning.",
        panels: [
          {
            title: "What to prepare",
            body: "Keep the order reference, product name, and a short description of the fault ready, plus photos if the issue is visible.",
          },
          {
            title: "What happens next",
            body: "We review the case, confirm the correct repair or replacement path, and provide turnaround expectations before intake.",
          },
        ],
      },
    ],
  },
};

function DetailSection({ section, reverse = false }: { section: InfoSection; reverse?: boolean }) {
  return (
    <section id={section.id} className="border-t border-border px-6 py-20">
      <div
        className={cn(
          "mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start",
          reverse && "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]",
        )}
      >
        <div className={cn(reverse && "lg:order-2")}>
          <p className="mb-4 text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
            {section.kicker}
          </p>
          <h2 className="max-w-[520px] text-[clamp(1.8rem,3vw,2.6rem)] leading-[1.08] tracking-[-0.04em] text-foreground">
            {section.title}
          </h2>
          <p className="mt-5 max-w-[500px] text-[15px] leading-7 text-muted-foreground">
            {section.description}
          </p>
        </div>

        <div className={cn("grid gap-px border border-border bg-border", reverse && "lg:order-1")}>
          {section.panels.map((panel) => (
            <article key={panel.title} className="bg-card p-8">
              <h3 className="text-[15px] font-medium text-foreground">{panel.title}</h3>
              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">{panel.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const storeLocations = [
  {
    name: "Nairobi branch",
    address: "Shop 39–40, Electronics House, Luthuli Avenue, Nairobi",
    mapQuery: "Shop 39 40 Electronics House, Luthuli Avenue, Nairobi, Kenya",
  },
  {
    name: "Eldoret branch",
    address: "First floor, DK Plaza, Uganda Road, Eldoret",
    mapQuery: "DK Plaza, Uganda Road, Eldoret, Kenya",
  },
];

function StoreLocationMaps() {
  return (
    <section aria-labelledby="store-maps-heading" className="border-b border-border px-6 py-14">
      <div className="mx-auto max-w-[1200px]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-[12px] uppercase tracking-[0.16em] text-primary">Visit us</p>
            <h2 id="store-maps-heading" className="text-[clamp(1.6rem,3vw,2.2rem)] text-foreground">
              Find a store on Google Maps
            </h2>
          </div>
          <p className="max-w-md text-[14px] leading-6 text-muted-foreground">
            Choose a branch to view its map or open directions in Google Maps.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {storeLocations.map((location) => {
            const encodedQuery = encodeURIComponent(location.mapQuery);
            const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodedQuery}`;

            return (
              <article key={location.name} className="overflow-hidden border border-border bg-card">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">{location.name}</h3>
                    <p className="mt-1 text-[13px] text-muted-foreground">{location.address}</p>
                  </div>
                  <a
                    href={directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="nav-text-glow inline-flex shrink-0 items-center gap-1.5 text-[13px] font-medium text-primary"
                  >
                    Directions <ArrowUpRight className="h-4 w-4" />
                  </a>
                </div>
                <iframe
                  title={`${location.name} on Google Maps`}
                  src={`https://maps.google.com/maps?q=${encodedQuery}&output=embed`}
                  className="block h-[280px] w-full border-0 bg-secondary/35 sm:h-[340px]"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function InfoPage({ page }: { page: InfoPageKey }) {
  const config = infoPages[page];
  const Icon = config.icon;

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <StoreNav />

      <section className="relative overflow-hidden border-b border-border px-6 py-20 lg:py-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.08),transparent_34%),linear-gradient(135deg,hsl(var(--muted)/0.55),transparent_55%)]" />
        <div className="relative mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <div className="max-w-[680px]">
            <p className="mb-5 text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              {config.hero.eyebrow}
            </p>
            <h1 className="text-[clamp(2.4rem,5vw,4.4rem)] leading-[0.96] tracking-[-0.06em] text-foreground">
              {config.hero.title}
            </h1>
            <p className="mt-6 max-w-[560px] text-[15px] leading-7 text-muted-foreground">
              {config.hero.description}
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-3">
              <Button asChild className="rounded-none px-6">
                <Link to={config.primaryAction.to}>{config.primaryAction.label}</Link>
              </Button>
              {config.secondaryAction ? (
                <Button
                  asChild
                  variant={config.secondaryAction.variant ?? "outline"}
                  className="rounded-none px-6"
                >
                  <Link to={config.secondaryAction.to}>{config.secondaryAction.label}</Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-slate-900/[0.035] dark:shadow-black/20">
            <div className="flex items-center justify-between border-b border-border px-6 py-5">
              <div>
                <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                  Snapshot
                </p>
                <p className="mt-2 text-[15px] text-foreground">{config.hero.badge}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-primary/15 bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <div className="grid gap-px bg-border">
              {config.highlights.map((item) => (
                <div key={item.label} className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 bg-card px-6 py-5">
                  <span className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-[14px] text-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {page === "stores" ? <StoreLocationMaps /> : null}

      <section className="border-b border-border px-6 py-14">
        <div className="mx-auto grid max-w-[1200px] gap-px border border-border bg-border md:grid-cols-3">
          {config.features.map((feature) => (
            <article key={feature.title} className="bg-card p-8">
              <h2 className="text-[15px] font-medium text-foreground">{feature.title}</h2>
              <p className="mt-3 text-[14px] leading-7 text-muted-foreground">{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      {config.sections.map((section, index) => (
        <DetailSection key={section.id} section={section} reverse={index % 2 === 1} />
      ))}

      <StoreFooter />
    </div>
  );
}
