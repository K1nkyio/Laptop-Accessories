import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { fetchAdminEnrollmentStatus, getAdminPasskeyRegistrationOptions, setupAdminTotp, verifyAdminPasskeyRegistration, verifyAdminTotp } from "../../lib/admin-api";

const QRCodeSVG = lazy(() => import("qrcode.react").then((module) => ({ default: module.QRCodeSVG })));

export default function PasskeyEnrollment() {
  const navigate = useNavigate();
  const [passkeyReady, setPasskeyReady] = useState(false);
  const [totpReady, setTotpReady] = useState(false);
  const [name, setName] = useState("This device");
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchAdminEnrollmentStatus()
      .then((status) => {
        setPasskeyReady(status.passkeyEnrolled);
        setTotpReady(status.totpEnabled);
        if (status.passkeyEnrolled && status.totpEnabled) navigate("/admin", { replace: true });
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not check your setup"))
      .finally(() => setLoading(false));
  }, [navigate]);

  const enrollPasskey = async () => {
    setBusy(true); setError("");
    try {
      const { challengeId, options } = await getAdminPasskeyRegistrationOptions();
      const response = await startRegistration({ optionsJSON: options });
      await verifyAdminPasskeyRegistration({ challengeId, response, name });
      setPasskeyReady(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Passkey enrollment failed"); }
    finally { setBusy(false); }
  };

  const beginTotp = async () => {
    setBusy(true); setError("");
    try { const setup = await setupAdminTotp(); setSecret(setup.secret); setOtpauthUrl(setup.otpauthUrl); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Could not start authenticator setup"); }
    finally { setBusy(false); }
  };

  const confirmTotp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const code = String(new FormData(event.currentTarget).get("code") ?? "");
      const result = await verifyAdminTotp(code);
      setCodes(result.recoveryCodes);
      setSecret("");
      setOtpauthUrl("");
      setTotpReady(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not verify authenticator"); }
    finally { setBusy(false); }
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Preparing your secure account setup…</div>;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-xl rounded-2xl border border-border bg-card p-7 shadow-xl sm:p-9">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div>
        <p className="mt-5 text-xs font-semibold uppercase tracking-widest text-primary">Administrator account setup</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Secure your sign-in</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Complete both steps before the dashboard opens. Your temporary setup session expires after 15 minutes.</p>

        <div className="mt-7 grid gap-3 sm:grid-cols-2">
          <div className={`rounded-xl border p-4 ${passkeyReady ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"}`}>
            <div className="flex items-center gap-2 font-medium"><KeyRound className="h-4 w-4 text-primary" />1. Passkey</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Use this device’s PIN, fingerprint, or face unlock.</p>
            {passkeyReady ? <p className="mt-3 text-sm font-medium text-emerald-700">Passkey registered</p> : <div className="mt-3 space-y-2">
              <Label htmlFor="passkey-name" className="text-xs">Device name</Label>
              <Input id="passkey-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} />
              <Button className="w-full" onClick={() => void enrollPasskey()} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Register passkey</Button>
            </div>}
          </div>

          <div className={`rounded-xl border p-4 ${totpReady ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"}`}>
            <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4 text-primary" />2. Authenticator app</div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">Add a TOTP account in your authenticator app and confirm its current code.</p>
            {totpReady ? <p className="mt-3 text-sm font-medium text-emerald-700">Authenticator verified</p> : !passkeyReady ? <p className="mt-3 text-xs text-muted-foreground">Register a passkey first to continue.</p> : !secret ? <Button className="mt-3 w-full" variant="outline" onClick={() => void beginTotp()} disabled={busy}>Set up authenticator</Button> : <form onSubmit={confirmTotp} className="mt-3 space-y-2">
              <p className="text-xs leading-5">Scan this code with your authenticator app. If you are setting it up on this same device, choose manual entry and use the setup key below.</p>
              <div className="mx-auto w-fit rounded-xl bg-white p-3 shadow-sm" role="img" aria-label="Authenticator setup QR code"><Suspense fallback={<div className="h-[208px] w-[208px] animate-pulse bg-muted" />}><QRCodeSVG value={otpauthUrl} size={208} level="M" title="Authenticator setup QR code" /></Suspense></div>
              <code className="block break-all rounded-md bg-muted p-3 text-xs">{secret}</code>
              <Input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" required />
              <Button className="w-full" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Verify authenticator</Button>
            </form>}
          </div>
        </div>

        {error ? <div role="alert" className="mt-5 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}

        {codes.length > 0 ? <section className="mt-5 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <h2 className="font-semibold">Save these recovery codes</h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">Each code works once if you lose access to your authenticator. This is the only time they will be shown.</p>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-5">{codes.map((code) => <div key={code} className="rounded border border-border bg-background p-2 text-center">{code}</div>)}</div>
          <Button variant="outline" className="mt-3" onClick={() => void navigator.clipboard.writeText(codes.join("\n"))}>Copy recovery codes</Button>
        </section> : null}

        {passkeyReady && totpReady ? <Button className="mt-6 w-full" onClick={() => navigate("/admin", { replace: true })}>Continue to dashboard</Button> : null}
        <p className="mt-5 text-center text-xs text-muted-foreground">Dashboard access stays restricted until passkey and authenticator setup are complete.</p>
      </div>
    </div>
  );
}
