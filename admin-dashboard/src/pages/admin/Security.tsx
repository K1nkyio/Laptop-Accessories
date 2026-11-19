import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { fetchAdminPasskeys, fetchAdminSession, fetchAdminTotpStatus, getAdminPasskeyRegistrationOptions, removeAdminPasskey, setupAdminTotp, updateAdminCredentials, verifyAdminPasskeyRegistration, verifyAdminTotp, type AdminPasskey } from "../../lib/admin-api";

const QRCodeSVG = lazy(() => import("qrcode.react").then((module) => ({ default: module.QRCodeSVG })));

export default function Security() {
  const [passkeys, setPasskeys] = useState<AdminPasskey[]>([]);
  const [totp, setTotp] = useState({ enabled: false, recoveryCodesRemaining: 0 });
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [credentialMessage, setCredentialMessage] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [keys, status, session] = await Promise.all([fetchAdminPasskeys(), fetchAdminTotpStatus(), fetchAdminSession()]);
    setPasskeys(keys);
    setTotp(status);
    setProfile({ name: session.admin.name, email: session.admin.email });
  }, []);
  useEffect(() => { void refresh().catch((error) => setMessage(error instanceof Error ? error.message : "Could not load security settings")); }, [refresh]);

  const addPasskey = async () => {
    setBusy(true); setMessage("");
    try {
      const { challengeId, options } = await getAdminPasskeyRegistrationOptions();
      const response = await startRegistration({ optionsJSON: options });
      await verifyAdminPasskeyRegistration({ challengeId, response, name: `Passkey ${new Date().toLocaleDateString()}` });
      await refresh(); setMessage("Passkey added.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not add passkey"); }
    finally { setBusy(false); }
  };

  const beginTotp = async () => {
    setBusy(true); setMessage("");
    try { const result = await setupAdminTotp(); setSecret(result.secret); setOtpauthUrl(result.otpauthUrl); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not start TOTP setup"); }
    finally { setBusy(false); }
  };

  const confirmTotp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try {
      const result = await verifyAdminTotp(code);
      setRecoveryCodes(result.recoveryCodes); setSecret(""); setOtpauthUrl(""); setCode("");
      await refresh(); setMessage("Authenticator enabled. Save the recovery codes now; they will only be shown once.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not verify authenticator"); }
    finally { setBusy(false); }
  };

  const saveCredentials = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setCredentialMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      await updateAdminCredentials({
        name: String(data.get("name") ?? ""),
        email: String(data.get("email") ?? ""),
        currentPassword: String(data.get("currentPassword") ?? ""),
        newPassword: String(data.get("newPassword") ?? "") || undefined,
      });
      form.reset();
      await refresh();
      setCredentialMessage("Account credentials updated. Other signed-in sessions have been revoked.");
    } catch (error) { setCredentialMessage(error instanceof Error ? error.message : "Could not update account credentials"); }
    finally { setBusy(false); }
  };

  const deletePasskey = async (id: string) => {
    setBusy(true); setMessage("");
    try { await removeAdminPasskey(id); await refresh(); setMessage("Passkey removed."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not remove passkey"); }
    finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div><h1 className="text-2xl font-semibold tracking-tight">Account security</h1><p className="mt-1 text-sm text-muted-foreground">Manage passkeys and your password plus authenticator fallback.</p></div>
      {message ? <div role="status" className="rounded-md border border-border bg-card px-3 py-2 text-sm">{message}</div> : null}
      <section className="rounded-xl border border-border bg-card p-5">
        <h2 className="font-semibold">Administrator credentials</h2>
        <p className="mt-1 text-sm text-muted-foreground">Change your name, sign-in email, or password. Confirm every change with your current password.</p>
        {credentialMessage ? <div role="status" className="mt-3 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{credentialMessage}</div> : null}
        <form onSubmit={saveCredentials} className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><label htmlFor="account-name" className="text-sm font-medium">Name</label><Input id="account-name" name="name" value={profile.name} onChange={(event) => setProfile((current) => ({ ...current, name: event.target.value }))} required maxLength={120} /></div>
          <div className="space-y-1.5"><label htmlFor="account-email" className="text-sm font-medium">Email</label><Input id="account-email" name="email" type="email" value={profile.email} onChange={(event) => setProfile((current) => ({ ...current, email: event.target.value }))} required /></div>
          <div className="space-y-1.5"><label htmlFor="new-password" className="text-sm font-medium">New password <span className="font-normal text-muted-foreground">(optional)</span></label><Input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={14} placeholder="At least 14 characters" /></div>
          <div className="space-y-1.5"><label htmlFor="current-password" className="text-sm font-medium">Current password</label><Input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required /></div>
          <div className="sm:col-span-2"><Button disabled={busy}>Save credentials</Button></div>
        </form>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-semibold">Passkeys</h2><p className="mt-1 text-sm text-muted-foreground">Passkeys are the primary sign-in method and require device verification.</p></div>
          <Button onClick={() => void addPasskey()} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Add passkey</Button>
        </div>
        <div className="mt-4 divide-y divide-border">
          {passkeys.map((passkey) => <div key={passkey.id} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div><div className="font-medium">{passkey.name}</div><div className="text-xs text-muted-foreground">Added {new Date(passkey.created_at).toLocaleDateString()} · {passkey.device_type}{passkey.backed_up ? " · synced" : ""}</div></div>
            <Button variant="outline" size="sm" disabled={busy || passkeys.length < 2} onClick={() => void deletePasskey(passkey.id)}>Remove</Button>
          </div>)}
          {!passkeys.length ? <p className="py-4 text-sm text-muted-foreground">No passkeys registered.</p> : null}
        </div>
      </section>
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Authenticator fallback</h2><p className="mt-1 text-sm text-muted-foreground">When enabled, you can sign in with your password and a time-based code if a passkey is unavailable. Recovery codes work once each.</p></div></div>
        <div className="mt-4 flex flex-wrap items-center gap-3"><span className="text-sm">Status: <strong>{totp.enabled ? "Enabled" : "Not enabled"}</strong></span><span className="text-sm text-muted-foreground">Recovery codes left: {totp.recoveryCodesRemaining}</span>
          {!totp.enabled && !secret ? <Button variant="outline" disabled={busy} onClick={() => void beginTotp()}>Set up authenticator</Button> : null}
        </div>
        {secret ? <div className="mt-4 space-y-3 rounded-lg border border-border bg-muted/40 p-4">
          <p className="text-sm">Scan this code with your authenticator app. Keep the code and setup key private.</p>
          <div className="mx-auto w-fit rounded-xl bg-white p-3 shadow-sm" role="img" aria-label="Authenticator setup QR code"><Suspense fallback={<div className="h-[208px] w-[208px] animate-pulse bg-muted" />}><QRCodeSVG value={otpauthUrl} size={208} level="M" title="Authenticator setup QR code" /></Suspense></div>
          <div className="break-all rounded bg-background p-3 font-mono text-xs">{secret}</div>
          <form onSubmit={confirmTotp} className="flex flex-wrap gap-2"><Input className="max-w-xs" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" required /><Button disabled={busy}>Verify and enable</Button></form>
        </div> : null}
      </section>
      {recoveryCodes.length ? <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5"><h2 className="font-semibold">Save your one-time recovery codes</h2><p className="mt-1 text-sm text-muted-foreground">Each code can be used once. Store them in a secure password manager.</p><div className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-5">{recoveryCodes.map((item) => <div key={item} className="rounded border border-border bg-background p-2 text-center">{item}</div>)}</div><Button className="mt-4" variant="outline" onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))}>Copy recovery codes</Button></section> : null}
    </div>
  );
}
