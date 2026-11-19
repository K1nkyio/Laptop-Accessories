import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown, Check, Pin, Search, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fetchAdminReviews, updateAdminReview, type AdminReview } from "../../lib/admin-api";

type Status = "all" | "pending" | "approved" | "hidden";

const tabs: { id: Status; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "hidden", label: "Hidden" },
];

export default function Reviews() {
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [tab, setTab] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [error, setError] = useState("");

  const load = async () => {
    setError("");
    try {
      setReviews(await fetchAdminReviews());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load reviews");
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const value = search.toLowerCase();
    return reviews
      .filter((review) => {
        const matchesTab = tab === "all" || review.status === tab;
        const matchesSearch =
          review.customer_name.toLowerCase().includes(value) ||
          review.comment.toLowerCase().includes(value) ||
          (review.product_name ?? "").toLowerCase().includes(value);
        return matchesTab && matchesSearch;
      })
      .sort((a, b) => {
        if (sort === "rating-high") return b.rating - a.rating;
        if (sort === "rating-low") return a.rating - b.rating;
        if (sort === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [reviews, search, sort, tab]);

  const approved = reviews.filter((review) => review.status === "approved");
  const avg = approved.reduce((sum, review) => sum + review.rating, 0) / Math.max(approved.length, 1);

  const update = async (id: string, input: { status?: string; is_featured?: boolean }) => {
    await updateAdminReview(id, input);
    await load();
  };

  return (
    <div className="max-w-[1200px] space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[24px] font-semibold tracking-tight">Reviews</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">Moderate trust signals shown across the storefront.</p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
          <div className="text-[28px] font-semibold leading-none">{avg.toFixed(1)}</div>
          <div>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={cn("h-3.5 w-3.5", n <= Math.round(avg) ? "fill-warning text-warning" : "text-muted-foreground")} />
              ))}
            </div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">{reviews.length} reviews</div>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-[12px] text-warning">
          {error}. Start the API to moderate reviews.
        </div>
      )}

      <div className="flex items-center gap-1 overflow-x-auto border-b border-border">
        {tabs.map((item) => {
          const count = item.id === "all" ? reviews.length : reviews.filter((review) => review.status === item.id).length;
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
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search reviews..." className="h-9 pl-9" />
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
          <Select value={sort} onValueChange={setSort}>
            <SelectTrigger className="h-9 w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="oldest">Oldest first</SelectItem>
              <SelectItem value="rating-high">Rating high</SelectItem>
              <SelectItem value="rating-low">Rating low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {filtered.map((review) => (
          <div key={review.id} className="rounded-lg border border-border bg-card p-5 transition-shadow hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium">{review.customer_name}</span>
                  {review.is_featured && (
                    <span className="inline-flex h-4 items-center gap-0.5 rounded-full bg-primary/15 px-1.5 text-[10px] font-medium text-primary">
                      <Pin className="h-2.5 w-2.5" /> Featured
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString()}</div>
                {review.product_name ? <div className="mt-1 text-[11px] text-muted-foreground">Product: {review.product_name}</div> : null}
              </div>
              <div className="flex">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Star key={n} className={cn("h-3.5 w-3.5", n <= review.rating ? "fill-warning text-warning" : "text-muted-foreground/40")} />
                ))}
              </div>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-foreground/85">{review.comment}</p>
            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
              {review.status === "pending" && (
                <>
                  <Button size="sm" className="h-8 gap-1.5" onClick={() => void update(review.id, { status: "approved" })}>
                    <Check className="h-3.5 w-3.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => void update(review.id, { status: "hidden" })}>
                    <X className="h-3.5 w-3.5" /> Hide
                  </Button>
                </>
              )}
              {review.status === "approved" && (
                <>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void update(review.id, { is_featured: !review.is_featured })}>
                    <Pin className="h-3.5 w-3.5" /> {review.is_featured ? "Unfeature" : "Feature"}
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-muted-foreground" onClick={() => void update(review.id, { status: "hidden" })}>
                    Hide
                  </Button>
                </>
              )}
              {review.status === "hidden" && (
                <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => void update(review.id, { status: "approved" })}>
                  <Check className="h-3.5 w-3.5" /> Restore
                </Button>
              )}
            </div>
          </div>
        ))}
        {!filtered.length && <div className="rounded-lg border border-border bg-card p-8 text-center text-[13px] text-muted-foreground md:col-span-2">No reviews found.</div>}
      </div>
    </div>
  );
}
