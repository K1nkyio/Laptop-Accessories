import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { CheckCircle2, CircleAlert, Smartphone } from "lucide-react";
import { StoreFooter } from "@/components/StoreFooter";
import { StoreNav } from "@/components/StoreNav";
import { Button } from "@/components/ui/button";
import { clearCart } from "@/hooks/use-storefront";
import { apiRequest } from "@/lib/api";
import { getStoredAuth } from "@/lib/auth";

type PaymentStatus = { orderId: string; status: "pending" | "paid" | "failed"; receipt?: string | null; message: string };

export default function PaymentStatusPage() {
  const { orderId = "" } = useParams();
  const auth = getStoredAuth();
  const isAuthenticated = Boolean(auth);
  const [payment, setPayment] = useState<PaymentStatus | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!isAuthenticated || !orderId) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const result = await apiRequest<PaymentStatus>(`/api/payments/mpesa/orders/${encodeURIComponent(orderId)}`);
        if (!active) return;
        setPayment(result);
        if (result.status === "paid") clearCart();
        if (result.status === "pending") timer = setTimeout(poll, 3000);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Could not check payment status.");
      }
    };
    void poll();
    return () => { active = false; clearTimeout(timer); };
  }, [isAuthenticated, orderId]);
  if (!auth) return <Navigate to="/sign-in" replace state={{ redirectTo: `/payment-status/${orderId}` }} />;
  const paid = payment?.status === "paid";
  const failed = payment?.status === "failed";
  return <div className="flex min-h-screen flex-col bg-background text-foreground"><StoreNav /><main className="flex flex-1 items-center justify-center px-6 py-16"><section className="w-full max-w-xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">{paid ? <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" /> : failed || error ? <CircleAlert className="mx-auto h-12 w-12 text-destructive" /> : <Smartphone className="mx-auto h-12 w-12 animate-pulse text-primary" />}<p className="mt-6 text-xs uppercase tracking-[.16em] text-muted-foreground">M-Pesa checkout</p><h1 className="mt-3 text-3xl font-semibold">{paid ? "Payment confirmed" : failed || error ? "Payment not completed" : "Approve the prompt on your phone"}</h1><p className="mx-auto mt-4 max-w-md text-sm leading-7 text-muted-foreground">{error || payment?.message || "We sent an STK prompt. Enter your M-Pesa PIN on your phone, then leave this page open while Safaricom confirms."}</p>{payment?.receipt && <p className="mt-4 text-sm text-foreground">Receipt: <span className="font-semibold">{payment.receipt}</span></p>}<div className="mt-8 flex justify-center gap-3"><Button asChild><Link to={paid ? "/shop" : "/checkout"}>{paid ? "Continue shopping" : failed || error ? "Return to checkout" : "Back to checkout"}</Link></Button></div><p className="mt-6 text-xs text-muted-foreground">Order reference: {orderId.slice(0, 8).toUpperCase()}</p></section></main><StoreFooter /></div>;
}
