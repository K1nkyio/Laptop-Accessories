import { MessageCircle, PackageCheck, ShieldCheck, Truck } from "lucide-react";

import dockImage from "@/assets/product-dock-1.jpg";
import keyboardImage from "@/assets/product-keyboard.jpg";
import laptopImage from "@/assets/product-laptop-1.jpg";
import mouseImage from "@/assets/product-mouse-1.jpg";

export function HeroShowcase() {
  return (
    <div className="relative h-full min-h-[540px] w-full overflow-visible">
      <div className="absolute right-0 top-6 w-[520px] max-w-full overflow-hidden rounded-2xl border border-border bg-card shadow-2xl shadow-slate-900/10 dark:shadow-black/30">
        <div className="grid grid-cols-[minmax(0,1fr)_150px] border-b border-border">
          <div className="p-5">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Featured drop</p>
            <h2 className="mt-2 text-[24px] leading-tight tracking-[-0.05em] text-foreground">Work-ready laptop kits</h2>
          </div>
          <div className="border-l border-border bg-primary/5 p-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">From</p>
            <p className="mt-3 text-[28px] leading-none tracking-[-0.06em] text-foreground">KES 85k</p>
          </div>
        </div>

        <div className="relative aspect-[1.35] overflow-hidden bg-secondary/20">
          <img
            src={laptopImage}
            alt="Featured laptop"
            className="h-full w-full object-cover"
            draggable={false}
          />
          <div className="absolute inset-x-0 bottom-0 grid grid-cols-3 border-t border-border bg-background/95 backdrop-blur">
            {[
              { image: mouseImage, label: "Mouse" },
              { image: dockImage, label: "Dock" },
              { image: keyboardImage, label: "Keyboard" },
            ].map((item, index) => (
              <div key={item.label} className={`${index > 0 ? "border-l border-border" : ""} flex items-center gap-3 p-3`}>
                <img src={item.image} alt={item.label} className="h-12 w-12 object-cover" draggable={false} />
                <span className="text-[12px] font-medium text-foreground/80">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute left-8 top-24 w-[250px] rounded-xl border border-border bg-card p-5 shadow-lg shadow-slate-900/10 dark:shadow-black/30">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">Availability</p>
            <p className="mt-3 text-[34px] font-medium leading-none tracking-[-0.07em] text-foreground">24h</p>
          </div>
          <PackageCheck className="h-5 w-5 shrink-0 text-foreground/70" />
        </div>
        <p className="mt-4 text-[13px] leading-6 text-muted-foreground">Nairobi dispatch on stocked laptops and desk essentials.</p>
      </div>

      <div className="absolute bottom-8 left-20 grid w-[340px] gap-px overflow-hidden rounded-xl border border-border bg-border shadow-lg shadow-slate-900/10 dark:shadow-black/30">
        {[
          { icon: MessageCircle, label: "WhatsApp support before checkout" },
          { icon: ShieldCheck, label: "Warranty captured per order" },
          { icon: Truck, label: "Pickup or delivery scheduling" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.label} className="flex items-center gap-3 bg-background px-4 py-3">
              <Icon className="h-4 w-4 text-foreground/70" />
              <span className="text-[13px] text-foreground/80">{item.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
