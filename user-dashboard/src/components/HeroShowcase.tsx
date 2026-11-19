import { BadgeCheck, PackageCheck, Sparkles } from "lucide-react";
import { API_URL } from "@/lib/api";

const image = (name: string) => `${API_URL.replace(/\/$/, "")}/uploads/demo-products/${name}`;

const laptopImage = image("laptop-hp-omnibook.jpg");
const headphonesImage = image("headphones-jbl-live-770.jpg");
const hubImage = image("hub-usbc.jpg");
const speakerImage = image("speaker-jbl-flip-7.jpg");

export function HeroShowcase() {
  return (
    <div className="hero-product-stage relative mx-auto h-full min-h-[340px] w-full max-w-[620px] overflow-visible sm:min-h-[410px] md:min-h-[540px]" aria-label="Featured products">
      <div aria-hidden="true" className="hero-orbit absolute inset-[9%] rounded-[50%] border border-primary/15" />
      <div aria-hidden="true" className="hero-orbit hero-orbit-inner absolute inset-[19%] rounded-[50%] border border-dashed border-primary/10" />
      <div aria-hidden="true" className="absolute left-[22%] top-[12%] h-[70%] w-[62%] rounded-full bg-primary/10 blur-[70px]" />

      <div className="hero-float-slow absolute left-[17%] top-[14%] z-20 w-[75%] max-w-[450px]">
        <div
          className="overflow-hidden rounded-[20px] border border-white/80 bg-white p-1.5 shadow-[0_34px_90px_-32px_rgba(15,23,42,0.55)] sm:rounded-[26px] sm:p-2"
          style={{ transform: "perspective(1100px) rotateY(-12deg) rotateX(4deg) rotateZ(-2deg)", transformStyle: "preserve-3d" }}
        >
          <img
            src={laptopImage}
            alt="HP OmniBook 5 laptop"
            fetchPriority="high"
            draggable={false}
            className="aspect-[1.19] w-full rounded-[16px] object-contain sm:rounded-[20px]"
          />
        </div>
        <div className="absolute -bottom-3 left-[14%] hidden items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3 py-2 shadow-lg backdrop-blur sm:flex sm:left-[18%] sm:px-4">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-foreground sm:text-[11px]">Built for your next move</span>
        </div>
      </div>

      <div className="hero-float-delayed absolute left-[2%] top-[18%] z-30 w-[23%] max-w-[142px] min-w-[78px]">
        <div
          className="overflow-hidden rounded-2xl border border-white/80 bg-white p-1.5 shadow-[0_24px_54px_-24px_rgba(15,23,42,0.55)] sm:rounded-[20px] sm:p-2"
          style={{ transform: "perspective(700px) rotateY(13deg) rotateZ(-7deg)" }}
        >
          <img src={headphonesImage} alt="JBL Live wireless headphones" loading="eager" draggable={false} className="aspect-square w-full rounded-xl object-contain sm:rounded-2xl" />
        </div>
        <span className="mt-2 hidden rounded-full border border-border/80 bg-background/95 px-2.5 py-1.5 text-[9px] font-medium text-foreground shadow-md sm:inline-flex sm:text-[10px]">JBL Live 770</span>
      </div>

      <div className="hero-float-late absolute bottom-[18%] left-[6%] z-30 w-[23%] max-w-[136px] min-w-[78px]">
        <div
          className="overflow-hidden rounded-2xl border border-white/80 bg-white p-1.5 shadow-[0_24px_54px_-24px_rgba(15,23,42,0.55)] sm:rounded-[20px] sm:p-2"
          style={{ transform: "perspective(700px) rotateY(14deg) rotateX(-5deg) rotateZ(7deg)" }}
        >
          <img src={hubImage} alt="USB-C multiport hub" loading="eager" draggable={false} className="aspect-square w-full rounded-xl object-contain sm:rounded-2xl" />
        </div>
        <span className="mt-2 hidden rounded-full border border-border/80 bg-background/95 px-2.5 py-1.5 text-[9px] font-medium text-foreground shadow-md sm:inline-flex sm:text-[10px]">USB-C hub</span>
      </div>

      <div className="hero-float-delayed absolute bottom-[13%] right-[1%] z-30 w-[33%] max-w-[200px] min-w-[112px]">
        <div
          className="overflow-hidden rounded-2xl border border-white/80 bg-white p-1.5 shadow-[0_24px_54px_-24px_rgba(15,23,42,0.55)] sm:rounded-[20px] sm:p-2"
          style={{ transform: "perspective(700px) rotateY(-13deg) rotateX(4deg) rotateZ(-6deg)" }}
        >
          <img src={speakerImage} alt="JBL Flip 7 portable speaker" loading="eager" draggable={false} className="aspect-[1.55] w-full rounded-xl object-contain sm:rounded-2xl" />
        </div>
        <span className="mt-2 hidden rounded-full border border-border/80 bg-background/95 px-2.5 py-1.5 text-[9px] font-medium text-foreground shadow-md sm:inline-flex sm:text-[10px]">JBL Flip 7</span>
      </div>

      <div className="absolute right-[1%] top-[5%] z-40 flex items-center gap-2 rounded-full border border-border/80 bg-background/95 px-3 py-2 shadow-lg backdrop-blur sm:right-[5%] sm:px-4">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-foreground sm:text-[10px]">The everyday edit</span>
      </div>

      <div className="absolute right-[4%] top-[33%] z-40 hidden max-w-[174px] items-center gap-3 rounded-2xl border border-border/80 bg-background/95 p-3 shadow-xl backdrop-blur sm:flex md:right-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><PackageCheck className="h-4 w-4" /></div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Ready when you are</p>
          <p className="mt-0.5 text-xs font-semibold text-foreground">Local support & dispatch</p>
        </div>
      </div>

      <div className="absolute bottom-[2%] right-[22%] z-10 flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground sm:right-[29%]">
        <BadgeCheck className="h-3.5 w-3.5 text-primary" />
        <span>Thoughtful tech, picked for work</span>
      </div>
    </div>
  );
}
