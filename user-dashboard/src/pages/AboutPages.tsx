import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock3, Mail, MapPin, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { StoreFooter } from "@/components/StoreFooter";
import { StoreNav } from "@/components/StoreNav";
import { Button } from "@/components/ui/button";
import { fetchStoreContent, type StoreContent } from "@/lib/store-content";
import { apiRequest } from "@/lib/api";
import { API_URL } from "@/lib/api";

function resolveImageUrl(value: string) { return value.startsWith("/") ? `${API_URL.replace(/\/$/, "")}${value}` : value; }

const STORE_LOCATIONS = [
  { name: "Nairobi branch", address: "Shop 39?40, Electronics House, Luthuli Avenue, Nairobi", mapQuery: "Shop 39 40 Electronics House, Luthuli Avenue, Nairobi, Kenya" },
  { name: "Eldoret branch", address: "First floor, DK Plaza, Uganda Road, Eldoret", mapQuery: "DK Plaza, Uganda Road, Eldoret, Kenya" },
];

function useStoreContent() {
  const [content, setContent] = useState<StoreContent | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { let live = true; fetchStoreContent().then((data) => { if (live) setContent(data); }).catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load store information."); }); return () => { live = false; }; }, []);
  return { content, error };
}

function PageFrame({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return <div className="min-h-screen bg-background text-foreground"><StoreNav /><header className="border-b border-border bg-card/35 px-6 py-16 sm:py-20"><div className="mx-auto max-w-[1200px]"><p className="text-xs uppercase tracking-[.16em] text-primary">{eyebrow}</p><h1 className="mt-4 max-w-3xl text-[clamp(2.3rem,5vw,4.5rem)] leading-[.98] tracking-[-.055em]">{title}</h1><p className="mt-6 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">{intro}</p></div></header>{children}<StoreFooter /></div>;
}

function ContactForm() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
  const [sending, setSending] = useState(false);
  const update = (key: keyof typeof form, value: string) => setForm((old) => ({ ...old, [key]: value }));
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setSending(true);
    try {
      await apiRequest("/api/inquiries", { method: "POST", body: JSON.stringify({ productName: `Customer care: ${form.subject}`, customerName: form.name, customerEmail: form.email, customerPhone: form.phone, source: "customer-care", message: form.message, website: form.website }) });
      toast.success("Your message has been sent. Customer care will follow up."); setForm({ name: "", email: "", phone: "", subject: "", message: "", website: "" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not send your message."); }
    finally { setSending(false); }
  };
  const input = "h-12 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary";
  return <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-border bg-card p-6 sm:grid-cols-2 sm:p-8">
    <label className="grid gap-2 text-xs text-muted-foreground">Full name<input required maxLength={160} autoComplete="name" className={input} value={form.name} onChange={(e) => update("name",e.target.value)} /></label>
    <label className="grid gap-2 text-xs text-muted-foreground">Email address<input required type="email" maxLength={254} autoComplete="email" className={input} value={form.email} onChange={(e) => update("email",e.target.value)} /></label>
    <label className="grid gap-2 text-xs text-muted-foreground">Phone number <span className="text-[10px]">Optional</span><input type="tel" maxLength={32} autoComplete="tel" className={input} value={form.phone} onChange={(e) => update("phone",e.target.value)} /></label>
    <label className="grid gap-2 text-xs text-muted-foreground">Subject<input required maxLength={120} className={input} value={form.subject} onChange={(e) => update("subject",e.target.value)} /></label>
    <label className="grid gap-2 text-xs text-muted-foreground sm:col-span-2">Message<textarea required maxLength={4000} minLength={10} className="min-h-36 w-full resize-y rounded-lg border border-border bg-background px-3 py-3 text-sm text-foreground outline-none focus:border-primary" value={form.message} onChange={(e) => update("message",e.target.value)} /></label>
    <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true"><label>Leave this field empty<input tabIndex={-1} autoComplete="off" value={form.website} onChange={(e)=>update("website",e.target.value)} /></label></div>
    <div className="sm:col-span-2"><Button type="submit" disabled={sending}>{sending ? "Sending…" : "Send message"}<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
  </form>;
}

export function CustomerCarePage() {
  const { content, error } = useStoreContent();
  const categories = useMemo(() => [...new Set(content?.faqs.map((faq) => faq.category) ?? [])], [content?.faqs]);
  const phone = content?.identity.phone ?? "";
  const whatsapp = content?.identity.whatsappNumber ?? "";
  const address = STORE_LOCATIONS[0].address;
  const phoneHref = phone.replace(/[^+\d]/g, "");
  return <PageFrame eyebrow="Customer care" title="Help from people who know the store." intro="Get clear support with product questions, orders, delivery, returns, and warranty requests.">
    {error ? <p role="alert" className="mx-auto max-w-[1200px] px-6 py-8 text-sm text-destructive">{error}</p> : null}
    <section className="border-b border-border px-6 py-14"><div className="mx-auto max-w-[1200px]"><h2 className="text-2xl tracking-tight">Contact information</h2><div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {content?.identity.email && <a className="rounded-xl border border-border bg-card p-5 hover:border-primary/40" href={`mailto:${content.identity.email}`}><Mail className="h-5 w-5 text-primary"/><p className="mt-4 text-xs text-muted-foreground">Email</p><p className="mt-1 break-all text-sm font-medium">{content.identity.email}</p></a>}
      {phone && <a className="rounded-xl border border-border bg-card p-5 hover:border-primary/40" href={`tel:${phoneHref}`}><Phone className="h-5 w-5 text-primary"/><p className="mt-4 text-xs text-muted-foreground">Phone</p><p className="mt-1 text-sm font-medium">{phone}</p></a>}
      {whatsapp && <a className="rounded-xl border border-border bg-card p-5 hover:border-primary/40" href={`https://wa.me/${whatsapp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer"><Sparkles className="h-5 w-5 text-primary"/><p className="mt-4 text-xs text-muted-foreground">WhatsApp</p><p className="mt-1 text-sm font-medium">Message customer care</p></a>}
      {(address || content?.identity.businessHours) && <article className="rounded-xl border border-border bg-card p-5"><MapPin className="h-5 w-5 text-primary"/><p className="mt-4 text-xs text-muted-foreground">Visit or call</p><p className="mt-1 text-sm font-medium">{address || "See store locator"}</p>{content?.identity.businessHours && <p className="mt-2 inline-flex items-start gap-2 text-xs leading-5 text-muted-foreground"><Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0"/>{content.identity.businessHours}</p>}</article>}
    </div></div></section>
    <section className="border-b border-border bg-card/30 px-6 py-16"><div className="mx-auto grid max-w-[1200px] gap-10 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-xs uppercase tracking-[.16em] text-primary">Frequently asked questions</p><h2 className="mt-3 text-3xl tracking-tight">Useful answers, in one place.</h2></div><div className="space-y-8">{categories.length ? categories.map((category)=><div key={category}><h3 className="mb-3 text-sm font-semibold text-foreground">{category}</h3><div className="divide-y divide-border border-y border-border">{content?.faqs.filter((faq)=>faq.category===category).map((faq)=><details key={faq.id} className="group py-4"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium marker:content-none">{faq.question}<span className="text-primary transition-transform group-open:rotate-45">+</span></summary><p className="max-w-2xl pt-3 text-sm leading-7 text-muted-foreground">{faq.answer}</p></details>)}</div></div>):<p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">FAQs are being updated. Send us your question below.</p>}</div></div></section>
    <section id="contact-form" className="px-6 py-16"><div className="mx-auto grid max-w-[1200px] gap-8 lg:grid-cols-[.7fr_1.3fr]"><div><p className="text-xs uppercase tracking-[.16em] text-primary">Send a message</p><h2 className="mt-3 text-3xl tracking-tight">Tell us how we can help.</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">We save your message as a customer inquiry so the team can follow up. Never include passwords, payment PINs, or other sensitive login details.</p></div><ContactForm/></div></section>
  </PageFrame>;
}

function Initials({ name }: { name: string }) { return <span>{name.trim().split(/\s+/).slice(0,2).map((part)=>part[0]?.toUpperCase()).join("") || "?"}</span>; }

export function OurStoryPage() {
  const { content, error } = useStoreContent();
  const owner = content?.profiles.find((profile)=>profile.is_owner);
  const employees = content?.profiles.filter((profile)=>!profile.is_owner) ?? [];
  return <PageFrame eyebrow="Our story" title={content?.identity.storeName ? `The story of ${content.identity.storeName}.` : "Our story and the people behind it."} intro={content?.identity.description || "Learn about our mission, values, and the people building a more helpful technology store."}>
    {error && <p role="alert" className="mx-auto max-w-[1200px] px-6 py-8 text-sm text-destructive">{error}</p>}
    <section className="px-6 py-16"><div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-xs uppercase tracking-[.16em] text-primary">How we began {content?.story.established ? `· ${content.story.established}` : ""}</p><h2 className="mt-3 text-3xl tracking-tight">A store shaped around useful technology and clear advice.</h2></div><div className="space-y-5 text-sm leading-8 text-muted-foreground"><p>{content?.story.history || "Our story is being prepared. Please check back soon."}</p>{content?.story.commitment && <p>{content.story.commitment}</p>}</div></div></section>
    {owner && <section className="border-y border-border bg-card/40 px-6 py-14"><div className="mx-auto grid max-w-[1200px] gap-8 md:grid-cols-[260px_1fr] md:items-center"><div className="aspect-[4/5] overflow-hidden rounded-xl border border-border bg-secondary/50">{owner.photo_url ? <img src={resolveImageUrl(owner.photo_url)} alt={owner.name} className="h-full w-full object-cover"/> : <div className="flex h-full items-center justify-center text-5xl font-semibold text-primary/70"><Initials name={owner.name}/></div>}</div><article><p className="text-xs uppercase tracking-[.16em] text-primary">Owner profile</p><h2 className="mt-3 text-3xl font-semibold tracking-tight">{owner.name}</h2><p className="mt-2 text-sm font-medium text-foreground/75">{owner.designation}{owner.department ? ` · ${owner.department}` : ""}</p><p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground">{owner.biography}</p>{owner.skills.length>0&&<div className="mt-5 flex flex-wrap gap-2">{owner.skills.map((skill)=><span key={skill} className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground/75">{skill}</span>)}</div>}{owner.social_url&&<a href={owner.social_url} target="_blank" rel="noreferrer" className="mt-6 inline-flex text-sm font-medium text-primary">Professional profile <ArrowRight className="ml-2 h-4 w-4"/></a>}</article></div></section>}
    <section className="px-6 py-16"><div className="mx-auto max-w-[1200px]"><p className="text-xs uppercase tracking-[.16em] text-primary">Mission and vision</p><div className="mt-5 grid gap-4 md:grid-cols-2">{[{title:"Our mission",body:content?.story.mission},{title:"Our vision",body:content?.story.vision},{title:"Our commitment",body:content?.story.commitment},{title:"Looking ahead",body:content?.story.future}].filter((item)=>item.body).map((item)=><article key={item.title} className="rounded-xl border border-border bg-card p-7"><h3 className="font-medium">{item.title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{item.body}</p></article>)}</div></div></section>
    {(content?.story.values?.length ?? 0)>0&&<section className="border-y border-border bg-card/30 px-6 py-16"><div className="mx-auto max-w-[1200px]"><p className="text-xs uppercase tracking-[.16em] text-primary">What guides us</p><h2 className="mt-3 text-3xl tracking-tight">Our values</h2><div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{content?.story.values?.map((value,index)=><article key={`${value.title}-${index}`} className="rounded-xl border border-border bg-background p-6"><ShieldCheck className="h-5 w-5 text-primary"/><h3 className="mt-5 font-medium">{value.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{value.description}</p></article>)}</div></div></section>}
    {employees.length>0&&<section className="px-6 py-16"><div className="mx-auto max-w-[1200px]"><p className="text-xs uppercase tracking-[.16em] text-primary">People at {content?.identity.storeName || "the store"}</p><h2 className="mt-3 text-3xl tracking-tight">Meet our team</h2><div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{employees.map((profile)=><article key={profile.id} className="overflow-hidden rounded-xl border border-border bg-card"><div className="aspect-[4/3] bg-secondary/50">{profile.photo_url?<img src={resolveImageUrl(profile.photo_url)} alt={profile.name} loading="lazy" className="h-full w-full object-cover"/>:<div className="flex h-full items-center justify-center text-4xl font-semibold text-primary/65"><Initials name={profile.name}/></div>}</div><div className="p-5">{profile.is_featured&&<span className="mb-3 inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary">Featured team member</span>}<h3 className="font-semibold">{profile.name}</h3><p className="mt-1 text-xs text-primary">{profile.designation}{profile.department?` · ${profile.department}`:""}</p><p className="mt-3 text-sm leading-6 text-muted-foreground">{profile.biography}</p>{profile.skills.length>0&&<div className="mt-4 flex flex-wrap gap-1.5">{profile.skills.map((skill)=><span key={skill} className="rounded-full bg-secondary px-2.5 py-1 text-[10px] text-foreground/75">{skill}</span>)}</div>}{profile.social_url&&<a href={profile.social_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex text-xs font-medium text-primary">Professional profile <ArrowRight className="ml-1 h-3.5 w-3.5"/></a>}</div></article>)}</div></div></section>}
    <section className="border-t border-border px-6 py-12"><div className="mx-auto max-w-[1200px]"><Link to="/customer-care" className="inline-flex items-center text-sm font-medium text-primary">Questions? Visit customer care <ArrowRight className="ml-2 h-4 w-4"/></Link></div></section>
  </PageFrame>;
}

export function StoreLocatorPage() {
  const { content, error } = useStoreContent();
  const policy = content?.policies;
  return <PageFrame eyebrow="Store locator" title="Find us and plan your visit." intro="Explore our Nairobi and Eldoret branches on the map, or open directions before you travel.">
    {error&&<p role="alert" className="mx-auto max-w-[1200px] px-6 py-8 text-sm text-destructive">{error}</p>}
    <section className="px-6 py-14"><div className="mx-auto max-w-[1200px]">
      <div className="grid gap-6 lg:grid-cols-2">{STORE_LOCATIONS.map((location)=>{const encoded=encodeURIComponent(location.mapQuery);return <article key={location.name} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-4 p-6"><div><p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[.14em] text-primary"><MapPin className="h-4 w-4"/>Map preview</p><h2 className="mt-3 text-xl font-semibold">{location.name}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{location.address}</p></div><a className="inline-flex h-fit items-center rounded-lg bg-primary px-4 py-2.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90" href={`https://www.google.com/maps/dir/?api=1&destination=${encoded}`} target="_blank" rel="noreferrer">Get directions <ArrowRight className="ml-2 h-4 w-4"/></a></div><iframe title={`${location.name} map preview`} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://maps.google.com/maps?q=${encoded}&output=embed`} className="h-[320px] w-full border-0 bg-secondary/30" /></article>})}</div>
    </div></section>
    <section className="border-y border-border bg-card/30 px-6 py-14"><div className="mx-auto max-w-[1200px]"><h2 className="text-2xl font-semibold">Delivery and collection</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{[{title:"Options and coverage",body:[policy?.shipping,policy?.coverage].filter(Boolean).join(" ")},{title:"Timelines and charges",body:[policy?.timelines,policy?.charges].filter(Boolean).join(" ")},{title:"Order tracking",body:policy?.tracking},{title:"In-store pickup",body:policy?.pickup}].filter((item)=>item.body).map((item)=><article key={item.title} className="rounded-xl border border-border bg-background p-6"><h3 className="font-medium">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p></article>)}</div><h2 className="mt-12 text-2xl font-semibold">Returns and warranty</h2><div className="mt-6 grid gap-4 md:grid-cols-2">{[{title:"Returns and exchanges",body:policy?.returns},{title:"Refunds",body:policy?.refunds},{title:"Warranty",body:policy?.warranty},{title:"Damaged or defective item",body:policy?.damaged}].filter((item)=>item.body).map((item)=><article key={item.title} className="rounded-xl border border-border bg-background p-6"><h3 className="font-medium">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.body}</p></article>)}</div></div></section>
  </PageFrame>;
}

export function ManagedPolicyPage({ kind }: { kind: "shipping" | "returns" | "warranty" }) {
  const { content, error } = useStoreContent();
  const policy = content?.policies;
  const sections = kind === "shipping" ? [{title:"Delivery options",body:policy?.shipping},{title:"Coverage areas",body:policy?.coverage},{title:"Estimated timelines",body:policy?.timelines},{title:"Shipping charges",body:policy?.charges},{title:"Tracking",body:policy?.tracking},{title:"Store pickup",body:policy?.pickup}] : kind === "returns" ? [{title:"Returns and exchanges",body:policy?.returns},{title:"Refund eligibility",body:policy?.refunds},{title:"Damaged or defective products",body:policy?.damaged}] : [{title:"Warranty coverage",body:policy?.warranty},{title:"Starting a claim",body:policy?.damaged}];
  const title = kind === "shipping" ? "Shipping and delivery" : kind === "returns" ? "Returns and refunds" : "Product warranty";
  return <PageFrame eyebrow="Store policies" title={title} intro="Current customer guidance, maintained by the store team.">{error&&<p role="alert" className="mx-auto max-w-[1200px] px-6 py-6 text-sm text-destructive">{error}</p>}<section className="px-6 py-14"><div className="mx-auto grid max-w-[1000px] gap-4">{sections.filter((item)=>item.body).map((item)=><article key={item.title} className="rounded-xl border border-border bg-card p-6"><h2 className="font-semibold">{item.title}</h2><p className="mt-2 text-sm leading-7 text-muted-foreground">{item.body}</p></article>)}</div></section></PageFrame>;
}
