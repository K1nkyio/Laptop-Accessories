import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { Package, AlertTriangle, MessageSquare, Star, TrendingUp, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fetchAdminInquiries, fetchAdminProducts, fetchAdminReviews, type AdminInquiry, type AdminProduct } from "../../lib/admin-api";

const toneClass = (tone: string) =>
  ({
    primary: "bg-primary/10 text-primary",
    destructive: "bg-destructive/10 text-destructive",
    warning: "bg-warning/10 text-warning",
    success: "bg-success/10 text-success",
  }[tone] ?? "bg-muted text-foreground");

export default function Overview() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [inquiries, setInquiries] = useState<AdminInquiry[]>([]);
  const [reviews, setReviews] = useState<{ status: string; is_featured: boolean }[]>([]);

  useEffect(() => {
    void Promise.all([fetchAdminProducts(), fetchAdminInquiries(), fetchAdminReviews()])
      .then(([productRows, inquiryRows, reviewRows]) => {
        setProducts(productRows);
        setInquiries(inquiryRows);
        setReviews(reviewRows);
      })
      .catch(() => undefined);
  }, []);

  const lowStock = useMemo(() => products.filter((product) => product.stock <= 3).slice(0, 4), [products]);
  const recentMessages = useMemo(() => inquiries.slice(0, 4), [inquiries]);
  const latestAdded = useMemo(() => products.slice(0, 4), [products]);
  const featuredProducts = useMemo(
    () => products.filter((product) => product.is_featured).slice(0, 4),
    [products],
  );
  const stats = [
    { label: "Total Products", value: String(products.length), change: "Live catalog", trend: "up", icon: Package, tone: "primary" },
    { label: "Out of Stock", value: String(products.filter((product) => product.stock <= 0).length), change: "Need restock", trend: "down", icon: AlertTriangle, tone: "destructive" },
    { label: "Open Inquiries", value: String(inquiries.filter((inquiry) => inquiry.status !== "completed").length), change: "Awaiting follow-up", trend: "up", icon: MessageSquare, tone: "warning" },
    { label: "Featured", value: String(products.filter((product) => product.is_featured).length + reviews.filter((review) => review.is_featured).length), change: "Storefront highlights", trend: "neutral", icon: Star, tone: "success" },
  ];

  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-1">Welcome back. Here's what's moving in your store today.</p>
        </div>
        <Button asChild className="rounded-full gap-2">
          <Link to="/admin/products"><Plus className="h-4 w-4" /> Add product</Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const TrendIcon = s.trend === "down" ? ArrowDownRight : ArrowUpRight;
          return (
            <div key={s.label} className="rounded-2xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${toneClass(s.tone)}`}>
                  <s.icon className="h-4 w-4" />
                </div>
                {s.trend !== "neutral" && (
                  <span className={`text-[11px] font-medium inline-flex items-center gap-0.5 ${s.trend === "up" ? "text-success" : "text-destructive"}`}>
                    <TrendIcon className="h-3 w-3" />
                  </span>
                )}
              </div>
              <div className="mt-4 text-[28px] font-semibold tracking-tight leading-none">{s.value}</div>
              <div className="text-[12px] text-muted-foreground mt-1">{s.label}</div>
              <div className="text-[11px] text-muted-foreground/80 mt-2">{s.change}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Low stock */}
        <Card title="Low stock alerts" subtitle="Restock soon to avoid losing sales" link={{ to: "/admin/inventory", label: "View inventory" }}>
          <div className="divide-y divide-border">
            {lowStock.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3">
                <div className="min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{p.brand ?? "No brand"}</div>
                </div>
                <span className={`text-[11px] font-semibold px-2 h-6 rounded-full inline-flex items-center ${p.stock <= 2 ? "bg-destructive/10 text-destructive" : "bg-warning/10 text-warning"}`}>
                  {p.stock} left
                </span>
              </div>
            ))}
            {!lowStock.length && <div className="py-6 text-[12px] text-muted-foreground">No low stock products.</div>}
          </div>
        </Card>

        {/* Recent messages */}
        <Card title="Recent customer messages" subtitle="Reply fast — most leads go cold in 1 hour" link={{ to: "/admin/inquiries", label: "All inquiries" }}>
          <div className="divide-y divide-border">
            {recentMessages.map((m) => (
              <div key={m.id} className="py-3">
                <div className="flex items-center justify-between">
                  <div className="text-[13px] font-medium">{m.customer_name || "Unnamed lead"}</div>
                  <span className="text-[10px] text-muted-foreground">{new Date(m.created_at).toLocaleDateString()}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">{m.customer_phone || "No phone"}</div>
                <p className="text-[12px] text-foreground/80 mt-1 line-clamp-2">{m.message}</p>
              </div>
            ))}
            {!recentMessages.length && <div className="py-6 text-[12px] text-muted-foreground">No customer inquiries yet.</div>}
          </div>
        </Card>

        <Card title="Featured storefront products" subtitle="Products currently highlighted to users">
          <div className="divide-y divide-border">
            {featuredProducts.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3 py-3">
                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground flex items-center gap-3">
                    <span className="inline-flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Stock {p.stock}</span>
                    <span>KSh {Number(p.price).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
            {!featuredProducts.length && <div className="py-6 text-[12px] text-muted-foreground">No featured products yet.</div>}
          </div>
        </Card>
      </div>

      {/* Latest added — wide */}
      <Card title="Latest added products" subtitle="Newly listed in your catalogue" link={{ to: "/admin/products", label: "Manage products" }}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {latestAdded.map((p) => (
            <div key={p.id} className="rounded-xl border border-border p-4 hover:border-primary/40 transition-colors">
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{p.status.replaceAll("_", " ")}</div>
              <div className="text-[13px] font-medium mt-1 truncate">{p.name}</div>
              <div className="text-[14px] font-semibold text-primary mt-2">KSh {Number(p.price).toLocaleString()}</div>
            </div>
          ))}
          {!latestAdded.length && <div className="text-[12px] text-muted-foreground">No products loaded yet.</div>}
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  subtitle,
  link,
  children,
}: {
  title: string;
  subtitle?: string;
  link?: { to: string; label: string };
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-[14px] font-semibold">{title}</h3>
          {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {link && (
          <Link to={link.to} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-0.5">
            {link.label} <ArrowUpRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}
