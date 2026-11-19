import type { ComponentProps, FormEvent } from "react";
import { useState, useEffect } from "react";
import { ArrowRight, CheckCircle2, KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { StoreFooter } from "@/components/StoreFooter";
import { StoreNav } from "@/components/StoreNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { confirmPasswordReset, loginAccount, loginWithGoogle, registerAccount, requestPasswordReset, storeAuth } from "@/lib/auth";

type AuthMode = "sign-in" | "sign-up";

interface AuthPageProps {
  mode: AuthMode;
}

interface AuthConfig {
  eyebrow: string;
  title: string;
  description: string;
  submitLabel: string;
  altLabel: string;
  altHref: string;
  altCta: string;
  notes: string[];
  benefits: string[];
}

const authConfig: Record<AuthMode, AuthConfig> = {
  "sign-in": {
    eyebrow: "Account access",
    title: "Sign in and pick up where you left off.",
    description:
      "Return to saved carts, order tracking, and quicker checkout with the same quiet, focused experience as the storefront.",
    submitLabel: "Sign in",
    altLabel: "New here?",
    altHref: "/sign-up",
    altCta: "Create an account",
    notes: ["Order history and delivery updates", "Saved products across sessions", "Faster repeat checkout"],
    benefits: [
      "Track orders without digging through email.",
      "Save shortlists while comparing laptops and accessories.",
      "Keep billing and shipping details ready for future orders.",
    ],
  },
  "sign-up": {
    eyebrow: "Create account",
    title: "Set up an account built for faster buying.",
    description:
      "A Stacked account keeps purchase history, saved carts, and support requests in one place so customers can move quickly next time.",
    submitLabel: "Create account",
    altLabel: "Already have an account?",
    altHref: "/sign-in",
    altCta: "Sign in instead",
    notes: ["Save carts and favorites", "Quicker support and warranty handling", "Store delivery details securely"],
    benefits: [
      "Move through checkout with fewer repeated details.",
      "Keep receipts and product history ready for support.",
      "Build a tidy record of devices and accessories bought over time.",
    ],
  },
};

export default function AuthPage({ mode }: AuthPageProps) {
  const config = authConfig[mode];
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [resetMessage, setResetMessage] = useState("");
  const [resetMode, setResetMode] = useState<"request" | "confirm" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const redirectTo =
    typeof location.state === "object" && location.state && "redirectTo" in location.state
      ? String(location.state.redirectTo)
      : "/shop";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    try {
      const auth =
        mode === "sign-up"
          ? await registerAccount({
              firstName: String(formData.get("firstName") ?? ""),
              lastName: String(formData.get("lastName") ?? ""),
              email,
              password,
              phone: String(formData.get("phone") ?? ""),
            })
          : await loginAccount({ email, password });

      storeAuth(auth);
      toast(mode === "sign-up" ? "Your account is ready." : "Welcome back.");
      navigate(redirectTo);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Something went wrong";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle credential responses from Google
  async function handleCredentialResponse(response: any) {
    try {
      const auth = await loginWithGoogle(response.credential);
      storeAuth(auth);
      toast("Signed in with Google.");
      navigate(redirectTo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google sign-in failed");
    }
  }

  // Initialize Google Identity Services once when available
  useEffect(() => {
    const google = (window as any).google;
    if (!google?.accounts?.id) return;
    if (!googleClientId) return;
    if ((window as any).__gsi_inited) return;

    google.accounts.id.initialize({
      client_id: googleClientId,
      callback: handleCredentialResponse,
    });
    (window as any).__gsi_inited = true;
  }, [googleClientId, navigate]);

  const handleGoogle = () => {
    setError("");

    if (!googleClientId) {
      setError("Google sign-in needs VITE_GOOGLE_CLIENT_ID and GOOGLE_CLIENT_ID configured.");
      return;
    }

    const google = window.google;
    if (!google?.accounts?.id) {
      setError("Google sign-in is still loading. Try again in a moment.");
      return;
    }
    // Prompt the One Tap / credential selector. Initialization is handled in useEffect.
    google.accounts.id.prompt();
  };

  const handleResetRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      const result = await requestPasswordReset(String(formData.get("resetEmail") ?? ""));
      setResetMessage(result.resetToken ? `Reset token: ${result.resetToken}` : result.message);
      setResetMode("confirm");
    } catch (caught) {
      setResetMessage(caught instanceof Error ? caught.message : "Could not request password reset");
    }
  };

  const handleResetConfirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      await confirmPasswordReset({
        token: String(formData.get("token") ?? ""),
        password: String(formData.get("newPassword") ?? ""),
      });
      setResetMode(null);
      setResetMessage("Password updated. You can sign in now.");
    } catch (caught) {
      setResetMessage(caught instanceof Error ? caught.message : "Could not reset password");
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <StoreNav />

      <section className="border-b border-border px-6 py-20 lg:py-24">
        <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[minmax(0,1fr)_480px]">
          <div className="max-w-[620px]">
            <p className="mb-5 text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
              {config.eyebrow}
            </p>
            <h1 className="text-[clamp(2.4rem,5vw,4rem)] leading-[0.98] tracking-[-0.06em] text-foreground">
              {config.title}
            </h1>
            <p className="mt-6 max-w-[540px] text-[15px] leading-7 text-muted-foreground">
              {config.description}
            </p>

            <div className="mt-10 grid gap-px border border-border bg-border sm:grid-cols-3">
              {config.notes.map((note) => (
              <div key={note} className="bg-card p-5">
                  <p className="text-[13px] leading-6 text-foreground/85">{note}</p>
                </div>
              ))}
            </div>

            <div className="mt-12 overflow-hidden rounded-2xl border border-border bg-card shadow-sm shadow-slate-900/[0.025]">
              <div className="flex items-center justify-between border-b border-border px-6 py-4">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                    Why create an account
                  </p>
                </div>
                <Sparkles className="h-4 w-4 text-foreground/70" />
              </div>
              <div className="grid gap-px bg-border">
                {config.benefits.map((benefit) => (
                  <div key={benefit} className="flex items-start gap-3 bg-card px-6 py-5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-success" />
                    <p className="text-[14px] leading-7 text-muted-foreground">{benefit}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-xl shadow-slate-900/[0.06] dark:shadow-black/20">
            <div className="border-b border-border bg-primary/[0.035] px-6 py-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[12px] uppercase tracking-[0.16em] text-muted-foreground">
                    {mode === "sign-in" ? "Welcome back" : "Join Stacked"}
                  </p>
                  <h2 className="mt-2 text-[24px] leading-tight tracking-[-0.04em] text-foreground">
                    {config.submitLabel}
                  </h2>
                </div>
                <div className="flex h-11 w-11 items-center justify-center border border-primary/15 bg-primary/10 text-primary">
                  <ShieldCheck className="h-5 w-5" />
                </div>
              </div>
            </div>

            <form className="space-y-6 px-6 py-8" onSubmit={handleSubmit}>
              {mode === "sign-up" ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field name="firstName" label="First name" placeholder="Amina" autoComplete="given-name" required />
                  <Field name="lastName" label="Last name" placeholder="Otieno" autoComplete="family-name" required />
                </div>
              ) : null}

              <Field name="email" label="Email address" type="email" placeholder="you@example.com" autoComplete="email" required />
              <Field
                name="password"
                label="Password"
                type="password"
                placeholder={mode === "sign-up" ? "Create a strong password" : "Enter your password"}
                autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                minLength={mode === "sign-up" ? 10 : undefined}
                pattern={mode === "sign-up" ? "(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{10,}" : undefined}
                title={mode === "sign-up" ? "Use at least 10 characters with uppercase, lowercase, and a number." : undefined}
                required
              />

              {mode === "sign-up" ? (
                <Field
                  name="phone"
                  label="Phone number"
                  type="tel"
                  placeholder="+254 700 000 000"
                  autoComplete="tel"
                />
              ) : null}

              {error ? (
                <p className="border border-destructive/30 bg-destructive/10 px-4 py-3 text-[13px] leading-6 text-destructive">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-11 w-full rounded-lg text-[13px] font-semibold uppercase tracking-[0.08em]"
              >
                {isSubmitting ? "Please wait..." : config.submitLabel}
              </Button>

              <button
                type="button"
                onClick={handleGoogle}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-[13px] font-medium uppercase tracking-[0.08em] text-foreground transition-colors hover:border-primary/35 hover:bg-primary/[0.035]"
              >
                <span className="text-[16px] font-semibold">G</span>
                Continue with Google
              </button>

              {mode === "sign-in" ? (
                <button
                  type="button"
                  onClick={() => setResetMode((value) => (value ? null : "request"))}
                  className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  Forgot password?
                </button>
              ) : null}
            </form>

            {resetMode ? (
              <div className="border-t border-border px-6 py-6">
                {resetMode === "request" ? (
                  <form onSubmit={handleResetRequest} className="space-y-4">
                    <Field name="resetEmail" label="Account email" type="email" placeholder="you@example.com" required />
                    <Button type="submit" variant="outline" className="h-10 w-full rounded-lg text-[12px] uppercase tracking-[0.08em]">
                      Request reset token
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleResetConfirm} className="space-y-4">
                    <Field name="token" label="Reset token" placeholder="Paste reset token" required />
                    <Field name="newPassword" label="New password" type="password" minLength={10} required />
                    <Button type="submit" variant="outline" className="h-10 w-full rounded-lg text-[12px] uppercase tracking-[0.08em]">
                      Update password
                    </Button>
                  </form>
                )}
              </div>
            ) : null}

            {resetMessage ? (
              <div className="border-t border-border px-6 py-4 text-[12px] leading-5 text-muted-foreground">
                {resetMessage}
              </div>
            ) : null}

            <div className="border-t border-border px-6 py-5">
              <p className="text-[13px] text-muted-foreground">
                {config.altLabel}{" "}
                <Link to={config.altHref} className="inline-flex items-center gap-1 text-foreground hover:text-foreground/75">
                  {config.altCta}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>

      <StoreFooter />
    </div>
  );
}

function Field({
  label,
  ...props
}: ComponentProps<typeof Input> & { label: string }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <Input
        {...props}
        className="h-11 rounded-lg border-input bg-secondary/65 px-4 text-[14px] focus-visible:bg-card focus-visible:ring-2"
      />
    </label>
  );
}
