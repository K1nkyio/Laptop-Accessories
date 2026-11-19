import { useCallback, useEffect, useState } from "react";
import { startRegistration } from "@simplewebauthn/browser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { disableAdminTotp, fetchAdminPasskeys, fetchAdminTotpStatus, getAdminPasskeyRegistrationOptions, removeAdminPasskey, setupAdminTotp, verifyAdminPasskeyRegistration, verifyAdminTotp, type AdminPasskey } from "../../lib/admin-api";

export default function Security() {
  const [passkeys, setPasskeys] = useState<AdminPasskey[]>([]);
  const [totp, setTotp] = useState({ enabled: false, recoveryCodesRemaining: 0 });
  const [secret, setSecret] = useState("");
  const [otpauthUrl, setOtpauthUrl] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const [keys, status] = await Promise.all([fetchAdminPasskeys(), fetchAdminTotpStatus()]);
    setPasskeys(keys);
    setTotp(status);
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

  const disableTotp = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setBusy(true); setMessage("");
    try { await disableAdminTotp(password); setPassword(""); setRecoveryCodes([]); await refresh(); setMessage("Authenticator fallback disabled."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not disable authenticator"); }
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
          <p className="text-sm">Add this account manually in your authenticator app using this secret or URI. Keep the secret private.</p>
          <div className="break-all rounded bg-background p-3 font-mono text-xs">{secret}</div><div className="break-all text-xs text-muted-foreground">{otpauthUrl}</div>
          <form onSubmit={confirmTotp} className="flex flex-wrap gap-2"><Input className="max-w-xs" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code" required /><Button disabled={busy}>Verify and enable</Button></form>
        </div> : null}
        {totp.enabled ? <form onSubmit={disableTotp} className="mt-4 flex flex-wrap gap-2"><Input className="max-w-xs" type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" placeholder="Confirm current password" required /><Button variant="outline" disabled={busy}>Disable TOTP</Button></form> : null}
      </section>
      {recoveryCodes.length ? <section className="rounded-xl border border-amber-500/40 bg-amber-500/5 p-5"><h2 className="font-semibold">Save your one-time recovery codes</h2><p className="mt-1 text-sm text-muted-foreground">Each code can be used once. Store them in a secure password manager.</p><div className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm sm:grid-cols-5">{recoveryCodes.map((item) => <div key={item} className="rounded border border-border bg-background p-2 text-center">{item}</div>)}</div><Button className="mt-4" variant="outline" onClick={() => navigator.clipboard.writeText(recoveryCodes.join("\n"))}>Copy recovery codes</Button></section> : null}
    </div>
  );
}
