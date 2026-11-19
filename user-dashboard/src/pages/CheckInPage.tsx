import { useLocation, useNavigate } from "react-router-dom";
import { StoreFooter } from "@/components/StoreFooter";
import { StoreNav } from "@/components/StoreNav";
import { Button } from "@/components/ui/button";
import { addToCart, type StorefrontProduct } from "@/hooks/use-storefront";

export default function CheckInPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const product = (location.state as any)?.product as StorefrontProduct | undefined;
  const quantity = (location.state as any)?.quantity ?? 1;

  const handleChoose = (mode: "delivery" | "pickup") => {
    if (product) addToCart(product, Number(quantity));
    navigate(`/checkout?mode=${mode}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <StoreNav />

      <main className="flex-1 px-6 py-12">
        <div className="mx-auto max-w-[900px]"> 
          <h1 className="text-3xl font-medium">Check in</h1>
          <p className="mt-3 text-muted-foreground">Choose whether you'd like us to deliver this order, or pay and pick it up in-store.</p>

          {product ? (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-[13px] text-muted-foreground">Product</p>
                <p className="mt-2 text-[16px] text-foreground">{product.name}</p>
                <p className="mt-1 text-[14px] text-muted-foreground">{product.brand}</p>
                <p className="mt-4 text-[14px] text-foreground">{product.currency} {product.price}</p>
              </div>

              <div className="flex flex-col gap-3">
                <Button onClick={() => handleChoose("delivery")} className="h-12 w-full rounded-none">
                  Request delivery
                </Button>
                <Button variant="outline" onClick={() => handleChoose("pickup")} className="h-12 w-full rounded-none">
                  Pay & pick up in store
                </Button>
                <Button variant="ghost" onClick={() => navigate(-1)} className="h-10 w-full">
                  Back
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              <p className="text-[14px] text-muted-foreground">You can choose delivery or pay for pickup. If you already have items in your cart, these options will use your cart contents.</p>
              <div className="flex gap-3">
                <Button onClick={() => navigate('/checkout?mode=delivery')} className="h-12 w-full rounded-none">Request delivery</Button>
                <Button variant="outline" onClick={() => navigate('/checkout?mode=pickup')} className="h-12 w-full rounded-none">Pay & pick up</Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <StoreFooter />
    </div>
  );
}
