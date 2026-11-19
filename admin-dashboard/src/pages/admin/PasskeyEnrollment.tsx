import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Laptop, Loader2, ShieldCheck } from "lucide-react";
import { getAdminPasskeyRegistrationOptions, verifyAdminPasskeyRegistration } from "../../lib/admin-api";

export default function PasskeyEnrollment() {
  const navigate = useNavigate();
  const [name, setName] = useState("This device");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const enroll = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { challengeId, options } = await getAdminPasskeyRegistrationOptions();
      const response = await startRegistration({ optionsJSON: options });
      await verifyAdminPasskeyRegistration({ challengeId, response, name });
      navigate("/admin", { replace: true });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Passkey enrollment failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-5">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><ShieldCheck className="h-5 w-5" /></div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Secure this administrator account</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Register a passkey to activate dashboard access. Your device will ask you to verify with its PIN, fingerprint, or face unlock. This enrollment session expires after 15 minutes.</p>
        <form onSubmit={enroll} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="passkey-name">Passkey name</Label>
            <Input id="passkey-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} required />
          </div>
          {error ? <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div> : null}
          <Button type="submit" className="w-full" disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Laptop className="mr-2 h-4 w-4" />}Register passkey</Button>
        </form>
        <p className="mt-5 text-center text-xs text-muted-foreground">Passkey setup is required before admin pages and data can be accessed.</p>
      </div>
    </div>
  );
}
