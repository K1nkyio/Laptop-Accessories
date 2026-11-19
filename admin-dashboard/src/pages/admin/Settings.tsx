import { Globe2, MessageCircle, ShieldCheck, Truck } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAdminAccount,
  fetchAdminAccounts,
  fetchStoreSettings,
  getStoredAdminAuth,
  registerAdmin,
  saveStoreSettings,
  type AdminAccount,
  type StoreSettings,
} from "../../lib/admin-api";

const cards = [
  { icon: Globe2, title: "Storefront identity", desc: "Name, hero copy, and customer-facing notices." },
  { icon: MessageCircle, title: "WhatsApp sales", desc: "Lead routing and support contact details." },
  { icon: Truck, title: "Fulfilment", desc: "Shipping, warranty, and low-stock defaults." },
  { icon: ShieldCheck, title: "Access control", desc: "Admin-created accounts and reset flows." },
];

const fallbackSettings: StoreSettings = {
  storeName: "Stacked",
  supportPhone: "+254 700 000 000",
  whatsappNumber: "254700000000",
  defaultWarranty: "Two years on laptops, one year on accessories.",
  shippingNote: "Orders dispatch in 24 hours when stock is available.",
  showFeaturedProducts: true,
  showWarrantyStrip: true,
  showLowStockUrgency: true,
  heroEyebrow: "New arrivals - 2026 ready",
  heroTitle: "Work-ready tech without the buying noise.",
  heroDescription: "Shop vetted laptops, docks, keyboards, mice, and carry gear with honest stock status and fast local follow-up.",
};

export default function Settings() {
  const [settings, setSettings] = useState<StoreSettings>(fallbackSettings);
  const [admins, setAdmins] = useState<AdminAccount[]>([]);
  const [newAdminRole, setNewAdminRole] = useState<"admin" | "super_admin">("admin");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const currentAdmin = getStoredAdminAuth()?.admin;
  const isSuperAdmin = currentAdmin?.role === "super_admin";

  useEffect(() => {
    fetchStoreSettings()
      .then(setSettings)
      .catch((error) => setMessage(error instanceof Error ? error.message : "Could not load settings"));
  }, []);

  const loadAdmins = async () => {
    if (!isSuperAdmin) return;
    try {
      setAdmins(await fetchAdminAccounts());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load admin accounts");
    }
  };

  useEffect(() => {
    void loadAdmins();
  }, [isSuperAdmin]);

  const update = <K extends keyof StoreSettings>(key: K, value: StoreSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    if (!isSuperAdmin) {
      setMessage("Only a super admin can save storefront settings.");
      return;
    }

    setMessage("");
    setSaving(true);
    try {
      setSettings(await saveStoreSettings(settings));
      setMessage("Settings saved. Storefront and admin views will use the updated values.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAdmin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);

    try {
      const result = await registerAdmin({
        name: String(formData.get("adminName") ?? ""),
        email: String(formData.get("adminEmail") ?? ""),
        password: String(formData.get("adminPassword") ?? ""),
        role: newAdminRole,
      });
      event.currentTarget.reset();
      setNewAdminRole("admin");
      await loadAdmins();
      setMessage(result.message ?? "Admin account created. Passkey enrollment is required at first sign in.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create admin account");
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    setMessage("");
    try {
      await deleteAdminAccount(id);
      await loadAdmins();
      setMessage("Admin account removed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove admin account");
    }
  };

  return (
    <div className="max-w-[1200px] space-y-5">
      <div>
        <h1 className="text-[24px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">Control the content and defaults reflected across the storefront.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => (
          <div key={item.title} className="rounded-lg border border-border bg-card p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="h-5 w-5" />
            </div>
            <h2 className="mt-4 text-[14px] font-semibold">{item.title}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>

      {message ? <div className="rounded-md border border-border bg-card px-3 py-2 text-[12px] text-muted-foreground">{message}</div> : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
          <h2 className="text-[15px] font-semibold">Storefront defaults</h2>
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Store name">
              <Input value={settings.storeName} onChange={(event) => update("storeName", event.target.value)} />
            </Field>
            <Field label="Support phone">
              <Input value={settings.supportPhone} onChange={(event) => update("supportPhone", event.target.value)} />
            </Field>
            <Field label="WhatsApp number">
              <Input value={settings.whatsappNumber} onChange={(event) => update("whatsappNumber", event.target.value)} />
            </Field>
            <Field label="Default warranty">
              <Input value={settings.defaultWarranty} onChange={(event) => update("defaultWarranty", event.target.value)} />
            </Field>
            <Field label="Hero eyebrow">
              <Input value={settings.heroEyebrow} onChange={(event) => update("heroEyebrow", event.target.value)} />
            </Field>
            <Field label="Hero headline">
              <Input value={settings.heroTitle} onChange={(event) => update("heroTitle", event.target.value)} />
            </Field>
            <Field label="Hero description" wide>
              <Textarea rows={3} value={settings.heroDescription} onChange={(event) => update("heroDescription", event.target.value)} />
            </Field>
            <Field label="Shipping note" wide>
              <Textarea rows={3} value={settings.shippingNote} onChange={(event) => update("shippingNote", event.target.value)} />
            </Field>
          </div>
          <div className="mt-5 flex justify-end">
            <Button onClick={handleSave} disabled={saving || !isSuperAdmin}>{saving ? "Saving..." : "Save settings"}</Button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-[15px] font-semibold">Homepage controls</h2>
            <div className="mt-4 space-y-3">
              <Toggle label="Show featured products" checked={settings.showFeaturedProducts} onCheckedChange={(value) => update("showFeaturedProducts", value)} />
              <Toggle label="Show warranty strip" checked={settings.showWarrantyStrip} onCheckedChange={(value) => update("showWarrantyStrip", value)} />
              <Toggle label="Show low-stock urgency" checked={settings.showLowStockUrgency} onCheckedChange={(value) => update("showLowStockUrgency", value)} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="text-[15px] font-semibold">Access level</h2>
            <p className="mt-2 text-[12px] leading-5 text-muted-foreground">
              Signed in as {currentAdmin?.role === "super_admin" ? "Super Admin" : "Admin"}.
            </p>
          </div>
        </div>
      </div>

      {isSuperAdmin ? (
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold">Admin accounts</h2>
              <p className="mt-1 text-[12px] text-muted-foreground">Super admins can create other admins or promote another super admin.</p>
            </div>
          </div>

          <form onSubmit={handleCreateAdmin} className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_1fr_1fr_160px_auto]">
            <Input name="adminName" placeholder="Name" required />
            <Input name="adminEmail" type="email" placeholder="Email" required />
            <Input name="adminPassword" type="password" placeholder="Strong password" required minLength={10} />
            <Select value={newAdminRole} onValueChange={(value: "admin" | "super_admin") => setNewAdminRole(value)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super admin</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">Create</Button>
          </form>

          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 font-medium">Name</th>
                  <th className="py-2 font-medium">Email</th>
                  <th className="py-2 font-medium">Role</th>
                  <th className="py-2 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {admins.map((admin) => (
                  <tr key={admin.id}>
                    <td className="py-3">{admin.name}</td>
                    <td className="py-3 text-muted-foreground">{admin.email}</td>
                    <td className="py-3">{admin.role === "super_admin" ? "Super admin" : "Admin"}</td>
                    <td className="py-3 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={admin.id === currentAdmin?.id}
                        onClick={() => void handleDeleteAdmin(admin.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Field({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <Label className="text-[12px]">{label}</Label>
      {children}
    </div>
  );
}

function Toggle({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange(value: boolean): void }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted/50 p-3">
      <span className="text-[13px] font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}
