import { FormEvent, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, ShieldCheck, Smartphone, Truck } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { toast } from "sonner";

import { StoreFooter } from "@/components/StoreFooter";
import { StoreNav } from "@/components/StoreNav";
import { Button } from "@/components/ui/button";
import { useStorefront } from "@/hooks/use-storefront";
import { apiRequest } from "@/lib/api";
import { getStoredAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/products";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { cart } = useStorefront();
  const auth = getStoredAuth();

  const [searchParams] = useSearchParams();
  const mode = searchParams.get("mode") === "pickup" ? "pickup" : "delivery";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    city: "",
    address: "",
    notes: "",
  });
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = cart.length > 0 && mode === "delivery" ? 25 : 0;
  const total = subtotal + shipping;
  const currency = cart[0]?.currency ?? "USD";

  const [submitting, setSubmitting] = useState(false);
  const [paymentPhone, setPaymentPhone] = useState("");

  if (!auth) {
    return <Navigate to="/sign-in" replace state={{ redirectTo: "/checkout" }} />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const result = await apiRequest<{ orderId: string; message: string }>("/api/payments/mpesa/stk-push", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map(({ id, quantity }) => ({ id, quantity })),
          fulfillmentMethod: mode,
          customer: { name: form.fullName, email: form.email, phone: form.phone, mpesaPhone: paymentPhone || form.phone, city: form.city, address: form.address, notes: form.notes },
        }),
      });
      toast.success(result.message);
      navigate(`/payment-status/${result.orderId}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send delivery request.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <StoreNav />

      <section className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="max-w-[680px]">
            <p className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">Checkout</p>
            <h1 className="mt-4 text-[clamp(2rem,4vw,3.5rem)] leading-[0.98] tracking-[-0.05em]">
              A clearer final step before payment.
            </h1>
            <p className="mt-5 text-[15px] leading-7 text-muted-foreground">
              {mode === "pickup"
                ? "Reserve this item for in-store pickup or pay now to secure it before you arrive."
                : "Confirm delivery details, review the order, and keep the last step calm instead of cluttered."}
            </p>
          </div>

          {cart.length === 0 ? (
            <div className="mt-12 rounded-xl border border-border bg-card p-10 lg:p-12">
              <CheckCircle2 className="h-7 w-7 text-foreground/75" />
              <h2 className="mt-6 text-[24px] tracking-[-0.03em] text-foreground">Your cart needs a few products first.</h2>
              <p className="mt-4 max-w-[520px] text-[14px] leading-7 text-muted-foreground">
                Add something to your cart and this page will turn into your final review and delivery step.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild className="rounded-none px-6">
                  <Link to="/shop">
                    Browse the catalog
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="rounded-none px-6">
                  <Link to="/wishlist">View wishlist</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_380px]">
              <form id="checkout-form" onSubmit={handleSubmit} className="grid gap-8">
                <section className="rounded-xl border border-border bg-card p-6 lg:p-7">
                  <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Contact</p>
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Full name"
                      value={form.fullName}
                      onChange={(value) => setForm((current) => ({ ...current, fullName: value }))}
                    />
                    <Field
                      label="Email"
                      type="email"
                      value={form.email}
                      onChange={(value) => setForm((current) => ({ ...current, email: value }))}
                    />
                    <Field
                      label="Phone"
                      value={form.phone}
                      onChange={(value) => setForm((current) => ({ ...current, phone: value }))}
                    />
                    <Field
                      label="City"
                      value={form.city}
                      onChange={(value) => setForm((current) => ({ ...current, city: value }))}
                    />
                  </div>
                </section>

                {mode === "delivery" ? (
                  <section className="rounded-xl border border-border bg-card p-6 lg:p-7">
                    <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Delivery</p>
                    <div className="mt-6 grid gap-4">
                      <Field
                        label="Address"
                        value={form.address}
                        onChange={(value) => setForm((current) => ({ ...current, address: value }))}
                      />
                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                          Notes
                        </span>
                        <textarea
                          value={form.notes}
                          onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                          rows={5}
                          className="w-full rounded-lg border border-border bg-secondary/65 px-3 py-3 text-[14px] text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
                          placeholder="Apartment, landmark, preferred delivery window, or anything else we should know."
                        />
                      </label>
                    </div>
                  </section>
                ) : (
                  <section className="rounded-xl border border-border bg-card p-6 lg:p-7">
                    <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Pickup</p>
                    <div className="mt-6 grid gap-4">
                      <p className="text-[13px] text-muted-foreground">Choose where the order should be held for pickup.</p>
                      <label className="block">
                        <span className="mb-2 block text-[11px] uppercase tracking-[0.12em] text-muted-foreground">Pickup location</span>
                        <select
                          className="h-11 w-full rounded-lg border border-border bg-secondary/65 px-3 text-[14px] text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
                          onChange={() => {}}
                        >
                          <option>CBD Studio</option>
                          <option>Westlands Showroom</option>
                          <option>Online pickup (warehouse)</option>
                        </select>
                      </label>
                    </div>
                  </section>
                )}

                <section className="rounded-xl border border-border bg-card p-6 lg:p-7">
                  <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Payment</p>
                  <fieldset className="mt-6">
                    <legend className="sr-only">Payment method</legend>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="sm:col-span-2"><PaymentOption label="M-Pesa STK Push" description="Safaricom will send a secure payment prompt to your phone. Your M-Pesa PIN is entered on your phone, never on this site." /></div>
                    </div>
                  </fieldset>

                    <div className="mt-5 grid gap-4 sm:grid-cols-2">
                      <Field
                        label="M-Pesa phone"
                        type="tel"
                        value={paymentPhone}
                        onChange={setPaymentPhone}
                      />
                    </div>
                </section>
              </form>

              <aside className="h-fit rounded-xl border border-border bg-card p-6 lg:sticky lg:top-24">
                <p className="text-[12px] uppercase tracking-[0.15em] text-muted-foreground">Order summary</p>
                <div className="mt-6 space-y-4">
                  {cart.map((item) => (
                    <div key={item.id} className="flex items-start justify-between gap-4 border-b border-border pb-4 last:border-b-0">
                      <div>
                        <p className="text-[14px] text-foreground">{item.name}</p>
                        <p className="mt-1 text-[12px] uppercase tracking-[0.12em] text-muted-foreground">
                          Qty {item.quantity}
                        </p>
                      </div>
                      <p className="text-[14px] text-foreground">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 space-y-4 border-y border-border py-5 text-[14px]">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatPrice(subtotal, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Shipping</span>
                    <span>{formatPrice(shipping, currency)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 text-[18px] text-foreground">
                    <span>Total</span>
                    <span>{formatPrice(total, currency)}</span>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 text-[13px] leading-6 text-muted-foreground">
                  <div className="flex items-start gap-3">
                    <Truck className="mt-1 h-4 w-4 text-foreground/75" />
                    <p>Estimated dispatch within 24 hours for stocked items.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-1 h-4 w-4 text-foreground/75" />
                    <p>Warranty and returns remain visible after purchase, not buried after payment.</p>
                  </div>
                </div>

                <Button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting}
                  className="mt-6 h-12 w-full rounded-none text-[13px] uppercase tracking-[0.12em]"
                >
                  {submitting ? "Requesting payment..." : "Pay with M-Pesa"}
                </Button>

                <p className="mt-4 text-[12px] leading-6 text-muted-foreground">
                  We verify the order price on the server. Your order is confirmed after Safaricom reports the payment.
                </p>
              </aside>
            </div>
          )}
        </div>
      </section>

      <StoreFooter />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>["inputMode"];
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <input
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 w-full rounded-lg border border-border bg-secondary/65 px-3 text-[14px] text-foreground outline-none transition-colors focus:border-primary focus:bg-card"
        required
      />
    </label>
  );
}

function PaymentOption({
  label,
  description,
}: {
  label: string;
  description: string;
}) {
  return (
    <div className="flex min-h-[90px] gap-3 rounded-xl border border-primary bg-primary/5 p-4 text-foreground ring-1 ring-primary/30">
      <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <span>
        <span className="block text-[14px] font-medium">{label}</span>
        <span className="mt-2 block text-[12px] leading-5 text-muted-foreground">
          {description}
        </span>
      </span>
    </div>
  );
}
