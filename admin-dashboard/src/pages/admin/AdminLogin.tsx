import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Laptop, Loader2, ShieldCheck } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import { completeAdminTotpFallback, confirmAdminPasswordReset, getAdminPasskeyLoginOptions, loginAdmin, requestAdminPasswordReset, storeAdminAuth, verifyAdminPasskeyLogin } from "../../lib/admin-api";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [mfaChallenge, setMfaChallenge] = useState("");
  const [resetMode, setResetMode] = useState<"request" | "confirm" | null>(null);
  const [resetMessage, setResetMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const form = event.currentTarget;
      const emailInput = form.elements.namedItem("email") as HTMLInputElement | null;
      const passwordInput = form.elements.namedItem("password") as HTMLInputElement | null;
      const input = {
        email: emailInput?.value.trim() ?? "",
        password: passwordInput?.value ?? "",
      };
      if (passwordInput) passwordInput.value = "";
      const loginRequest = loginAdmin(input);
      input.password = "";
      const auth = await loginRequest;
      if (auth.mfaRequired && auth.challenge) {
        setMfaChallenge(auth.challenge);
        return;
      }
      storeAdminAuth(auth);
      if (auth.needsSecurityEnrollment || auth.needsPasskeyEnrollment) {
        navigate("/admin/enroll", { replace: true });
        return;
      }
      navigate("/admin", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const { challengeId, options } = await getAdminPasskeyLoginOptions(email);
      const response = await startAuthentication({ optionsJSON: options });
      const auth = await verifyAdminPasskeyLogin({ email, challengeId, response });
      storeAdminAuth(auth);
      if (auth.needsSecurityEnrollment) {
        navigate("/admin/enroll", { replace: true });
        return;
      }
      navigate("/admin", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Passkey sign in failed");
    } finally {
      setLoading(false);
    }
  };

  const handleTotpFallback = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    const code = String(new FormData(event.currentTarget).get("code") ?? "");
    try {
      const auth = await completeAdminTotpFallback({ challenge: mfaChallenge, code });
      storeAdminAuth(auth);
      navigate("/admin", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "MFA verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      const result = await requestAdminPasswordReset(String(formData.get("resetEmail") ?? ""));
      setResetMessage(result.resetToken ? `Reset token: ${result.resetToken}` : result.message);
      setResetMode("confirm");
    } catch (caught) {
      setResetMessage(caught instanceof Error ? caught.message : "Could not request password reset");
    }
  };

  const handleResetConfirm = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResetMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      await confirmAdminPasswordReset({
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
    <div className="grid min-h-screen bg-background lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-slate p-10 text-white lg:flex">
        <div className="absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-brand-blue/20 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[300px] w-[300px] rounded-full bg-brand-cyan/10 blur-3xl" />

        <Link to="/" className="relative z-10 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
            <Laptop className="h-4 w-4" />
          </div>
          <span className="text-[15px] font-semibold">TechHub.ke</span>
        </Link>

        <div className="relative z-10 max-w-sm">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium">
            <ShieldCheck className="h-3 w-3" /> Restricted access
          </div>
          <h1 className="text-[34px] font-semibold leading-[1.1] tracking-[-0.02em]">
            Manage your store with confidence.
          </h1>
          <p className="mt-4 text-[14px] leading-relaxed opacity-85">
            Inventory, inquiries, reviews, and pricing are protected behind a real admin session.
          </p>
        </div>

        <div className="relative z-10 text-[12px] opacity-75">
          {new Date().getFullYear()} TechHub.ke Admin
        </div>
      </div>

      <div className="flex items-center justify-center bg-secondary/35 p-6 lg:p-10">
        <div className="w-full max-w-md">
          <Link to="/" className="mb-8 flex items-center gap-2 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/60">
              <Laptop className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">TechHub.ke</span>
          </Link>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-xl shadow-slate-900/[0.06] sm:p-8 dark:shadow-black/20">
          <div className="mb-6 flex h-11 w-11 items-center justify-center rounded-xl border border-primary/15 bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h2 className="text-[24px] font-semibold tracking-tight">Administrator sign in</h2>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Sign in with your authorized administrator account to access the dashboard.
          </p>

          {mfaChallenge ? (
            <form onSubmit={handleTotpFallback} className="mt-8 space-y-4">
              <p className="text-[13px] text-muted-foreground">Enter your authenticator code or an unused recovery code.</p>
              <div className="space-y-1.5">
                <Label htmlFor="mfa-code" className="text-[12px]">Verification code</Label>
                <Input id="mfa-code" name="code" autoComplete="one-time-code" required autoFocus />
              </div>
              {error ? <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">{error}</div> : null}
              <Button type="submit" className="h-10 w-full" disabled={loading}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Verify and sign in</Button>
              <button type="button" onClick={() => { setMfaChallenge(""); setError(""); }} className="w-full text-[12px] text-muted-foreground hover:text-foreground">Back to sign in</button>
            </form>
          ) : <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-[12px]">Email</Label>
              <Input id="email" name="email" type="email" required placeholder="admin@techhub.ke" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-[12px]">Password</Label>
              <Input id="password" name="password" type="password" required placeholder="Enter admin password" autoComplete="current-password" />
            </div>

            {error ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
                {error}
              </div>
            ) : null}

            <Button type="submit" className="h-10 w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Password and TOTP fallback
            </Button>
            <Button type="button" variant="outline" className="h-10 w-full" disabled={loading || !email} onClick={() => void handlePasskeyLogin()}>
              Sign in with passkey
            </Button>

            <div className="flex items-center justify-end pt-1 text-[12px] text-muted-foreground">
              <button type="button" onClick={() => setResetMode((value) => (value ? null : "request"))} className="inline-flex items-center gap-1 hover:text-foreground">
                <KeyRound className="h-3.5 w-3.5" />
                Forgot password?
              </button>
            </div>

            <div className="pt-2 text-center text-[11px] text-muted-foreground">
              Protected area. Admin sessions expire automatically.
            </div>
          </form>}

          {resetMode ? (
            <div className="mt-5 border-t border-border pt-5">
              {resetMode === "request" ? (
                <form onSubmit={handleResetRequest} className="space-y-3">
                  <Input name="resetEmail" type="email" required placeholder="Admin email" />
                  <Button type="submit" variant="outline" className="h-9 w-full">Request reset token</Button>
                </form>
              ) : (
                <form onSubmit={handleResetConfirm} className="space-y-3">
                  <Input name="token" required placeholder="Reset token" />
                  <Input name="newPassword" type="password" required placeholder="New password" />
                  <Button type="submit" variant="outline" className="h-9 w-full">Update password</Button>
                </form>
              )}
            </div>
          ) : null}

          {resetMessage ? <div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 px-3 py-2 text-[12px] text-foreground">{resetMessage}</div> : null}
          </div>

          <div className="mt-8 border-t border-border pt-5 text-center text-[12px] text-muted-foreground">
            Looking for the store?{" "}
            <Link to="/" className="text-foreground hover:underline">Go to TechHub.ke</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
