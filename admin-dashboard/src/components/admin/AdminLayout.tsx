import { Link, Navigate, Outlet } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, Bell, Menu, MessageCircle, Search, Star, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import { clearAdminAuth, fetchAdminNotifications, fetchAdminSession, type AdminNotification } from "../../lib/admin-api";

export default function AdminLayout() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [sessionState, setSessionState] = useState<"checking" | "valid" | "invalid">("checking");

  useEffect(() => {
    let cancelled = false;

    fetchAdminSession()
      .then(() => {
        if (!cancelled) setSessionState("valid");
      })
      .catch(() => {
        clearAdminAuth();
        if (!cancelled) setSessionState("invalid");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (sessionState !== "valid") return;

    let cancelled = false;

    const load = () => {
      fetchAdminNotifications()
        .then((rows) => {
          if (!cancelled) setNotifications(rows);
        })
        .catch(() => {
          if (!cancelled) setNotifications([]);
        });
    };

    load();
    const timer = window.setInterval(load, 30000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [sessionState]);

  if (sessionState === "invalid") {
    return <Navigate to="/admin/login" replace />;
  }

  if (sessionState === "checking") {
    return <div className="flex h-screen items-center justify-center bg-muted/30 text-[13px] text-muted-foreground">Checking admin session...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-muted/30">
      <div className="hidden h-screen shrink-0 md:block">
        <AdminSidebar />
      </div>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="z-30 h-14 shrink-0 bg-background/85 backdrop-blur border-b border-border flex items-center px-4 gap-3">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-60">
              <AdminSidebar onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <div className="hidden sm:flex items-center gap-2 flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              placeholder="Search products, orders, customers..."
              className="w-full h-9 pl-9 pr-3 rounded-md bg-muted text-[13px] outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 relative">
                  <Bell className="h-4 w-4" />
                  {notifications.length > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 p-0">
                <div className="border-b border-border p-3">
                  <div className="text-[13px] font-semibold">Notifications</div>
                  <div className="text-[11px] text-muted-foreground">Live store activity that needs attention.</div>
                </div>
                <div className="max-h-[420px] overflow-y-auto p-2">
                  {notifications.map((notification) => {
                    const Icon = notification.type === "delivery" ? Truck : notification.type === "review" ? Star : notification.type === "stock" ? AlertTriangle : MessageCircle;
                    return (
                      <Link
                        key={notification.id}
                        to={notification.href}
                        className="flex gap-3 rounded-md p-3 transition-colors hover:bg-muted"
                      >
                        <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${
                          notification.severity === "critical"
                            ? "bg-destructive/10 text-destructive"
                            : notification.severity === "warning"
                              ? "bg-warning/10 text-warning"
                              : "bg-primary/10 text-primary"
                        }`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium">{notification.title}</div>
                          <div className="mt-0.5 line-clamp-2 text-[12px] leading-5 text-muted-foreground">{notification.body}</div>
                          <div className="mt-1 text-[10px] text-muted-foreground">{new Date(notification.created_at).toLocaleString()}</div>
                        </div>
                      </Link>
                    );
                  })}
                  {!notifications.length && (
                    <div className="p-6 text-center text-[12px] text-muted-foreground">No active notifications.</div>
                  )}
                </div>
              </PopoverContent>
            </Popover>
            <div className="h-8 w-8 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[11px] font-semibold">
              AD
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 md:p-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
