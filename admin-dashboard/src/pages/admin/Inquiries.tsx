import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowUpDown, Filter, MessageCircle, Phone, Search, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fetchAdminInquiries, updateAdminInquiry, type AdminInquiry } from "../../lib/admin-api";

type Status = "all" | "new" | "contacted" | "completed";

const tabs: { id: Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "contacted", label: "Contacted" },
  { id: "completed", label: "Completed" },
];

const statusStyles: Record<string, string> = {
  new: "bg-warning/10 text-warning",
  contacted: "bg-info/10 text-info",
  completed: "bg-success/10 text-success",
};

function phoneHref(phone: string | null | undefined) {
  const cleaned = String(phone ?? "").replace(/[^\d+]/g, "");
  return cleaned ? `tel:${cleaned}` : "";
}

function whatsAppHref(phone: string | null | undefined, inquiry: AdminInquiry) {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (!digits) return "";

  const text = encodeURIComponent(
    `Hello ${inquiry.customer_name || "there"}, this is TechHub.ke following up about ${inquiry.product_name}.`,
  );

  return `https://wa.me/${digits}?text=${text}`;
}

export default function Inquiries() {
  const [searchParams] = useSearchParams();
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);
  const [tab, setTab] = useState<Status>("all");
  const [sourceFilter, setSourceFilter] = useState(searchParams.get("source") ?? "all");
  const [sort, setSort] = useState("newest");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setInquiries(await fetchAdminInquiries());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load inquiries");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    setSourceFilter(searchParams.get("source") ?? "all");
  }, [searchParams]);

  const filtered = useMemo(() => {
    const value = search.toLowerCase();
    return inquiries
      .filter((inquiry) => {
        const matchesTab = tab === "all" || inquiry.status === tab;
        const matchesSource = sourceFilter === "all" || inquiry.source === sourceFilter;
        const matchesSearch =
          inquiry.product_name.toLowerCase().includes(value) ||
          inquiry.message.toLowerCase().includes(value) ||
          (inquiry.customer_name ?? "").toLowerCase().includes(value) ||
          (inquiry.customer_phone ?? "").toLowerCase().includes(value);
        return matchesTab && matchesSource && matchesSearch;
      })
      .sort((a, b) => {
        if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        if (sort === "delivery-first") return Number(b.source === "delivery") - Number(a.source === "delivery");
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [inquiries, search, sort, sourceFilter, tab]);

  const mark = async (id: string, status: string) => {
    await updateAdminInquiry(id, status);
    await load();
  };

  const markContacted = (inquiry: AdminInquiry) => {
    if (inquiry.status === "new") void mark(inquiry.id, "contacted");
  };

  return (
    <div className="max-w-[1300px] space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Inquiries</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Customer leads from product pages and WhatsApp handoffs.</p>
      </div>

      {error && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
          {error}. Start the API to manage inquiries.
        </div>
      )}

      <div className="flex items-center gap-1 border-b border-border overflow-x-auto">
        {tabs.map((item) => {
          const count = item.id === "all" ? inquiries.length : inquiries.filter((inquiry) => inquiry.status === item.id).length;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={cn(
                "-mb-px h-10 border-b-2 px-4 text-[13px] font-medium transition-colors",
                active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              <span className={cn("ml-2 inline-flex h-4 items-center rounded-full px-1.5 text-[10px]", active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, phone, product..." className="h-9 pl-9" />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              <SelectItem value="delivery">Delivery</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="contact">Contact</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="delivery-first">Delivery first</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-3">
        {filtered.map((inquiry) => {
          const callUrl = phoneHref(inquiry.customer_phone);
          const whatsAppUrl = whatsAppHref(inquiry.customer_phone, inquiry);

          return (
          <div key={inquiry.id} className="rounded-lg border border-border bg-card p-4 transition-shadow hover:shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[12px] font-semibold text-primary">
                {(inquiry.customer_name ?? "Lead").split(" ").map((part) => part[0]).join("").slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[14px] font-medium">{inquiry.customer_name || "Unnamed lead"}</span>
                  <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-medium capitalize ${statusStyles[inquiry.status] ?? statusStyles.new}`}>
                    {inquiry.status}
                  </span>
                  {inquiry.source === "delivery" && (
                    <span className="inline-flex h-5 items-center gap-1 rounded-full bg-destructive/10 px-2 text-[10px] font-medium text-destructive">
                      <Truck className="h-3 w-3" /> Delivery
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground">{new Date(inquiry.created_at).toLocaleString()}</span>
                </div>
                <div className="mt-0.5 text-[12px] text-muted-foreground">
                  {inquiry.customer_phone || "No phone"} · interested in <span className="font-medium text-foreground">{inquiry.product_name}</span>
                </div>
                <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">{inquiry.message}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" asChild>
                    <a
                      href={callUrl || undefined}
                      aria-disabled={!callUrl}
                      className={!callUrl ? "pointer-events-none opacity-50" : undefined}
                      onClick={() => markContacted(inquiry)}
                    >
                      <Phone className="h-3.5 w-3.5" /> Call
                    </a>
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-success/30 text-success hover:bg-success/10 hover:text-success" asChild>
                    <a
                      href={whatsAppUrl || undefined}
                      target="_blank"
                      rel="noreferrer"
                      aria-disabled={!whatsAppUrl}
                      className={!whatsAppUrl ? "pointer-events-none opacity-50" : undefined}
                      onClick={() => markContacted(inquiry)}
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                    </a>
                  </Button>
                  {inquiry.status !== "completed" && (
                    <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => void mark(inquiry.id, inquiry.status === "new" ? "contacted" : "completed")}>
                      Mark as {inquiry.status === "new" ? "contacted" : "completed"}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          );
        })}
        {!filtered.length && <div className="rounded-lg border border-border bg-card p-8 text-center text-[13px] text-muted-foreground">No inquiries found.</div>}
      </div>
    </div>
  );
}
