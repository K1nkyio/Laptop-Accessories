import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  MessageSquare,
  Boxes,
  Star,
  Settings,
  LogOut,
  Laptop,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { clearAdminAuth, getStoredAdminAuth } from "../../lib/admin-api";

const items = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/inquiries", label: "Inquiries", icon: MessageSquare },
  { to: "/admin/inventory", label: "Inventory", icon: Boxes },
  { to: "/admin/reviews", label: "Reviews", icon: Star },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const admin = getStoredAdminAuth()?.admin;

  return (
    <aside
      className={cn(
        "h-full flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="h-8 w-8 shrink-0 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Laptop className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="leading-none">
              <div className="text-[14px] font-semibold text-sidebar-accent-foreground">TechHub.ke</div>
              <div className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-0.5">Admin</div>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform", collapsed && "rotate-180")} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && (
          <div className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
            Manage
          </div>
        )}
        {items.map((item) => {
          const active = item.end
            ? location.pathname === item.to
            : location.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-md text-[13px] transition-colors relative",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              {active && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-primary" />
              )}
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.badge != null && (
                <span className="text-[10px] font-semibold px-1.5 h-4 min-w-[16px] rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-0.5">
        <NavLink
          to="/admin/security"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 h-9 rounded-md text-[13px] transition-colors",
            location.pathname.startsWith("/admin/security")
              ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
              : "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground text-muted-foreground"
          )}
          title={collapsed ? "Security" : undefined}
        >
          <ShieldCheck className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Security</span>}
        </NavLink>
        <NavLink
          to="/admin/settings"
          onClick={onNavigate}
          className={cn(
            "flex items-center gap-3 px-3 h-9 rounded-md text-[13px] transition-colors",
            "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground text-muted-foreground"
          )}
          title={collapsed ? "Settings" : undefined}
        >
          <Settings className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
        <NavLink
          to="/admin/login"
          onClick={() => {
            clearAdminAuth();
            onNavigate?.();
          }}
          className={cn(
            "flex items-center gap-3 px-3 h-9 rounded-md text-[13px] transition-colors",
            "hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground text-muted-foreground"
          )}
          title={collapsed ? "Sign out" : undefined}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sign out</span>}
        </NavLink>

        {!collapsed && (
          <div className="mt-2 px-3 py-2.5 rounded-md bg-sidebar-accent/40 flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[11px] font-semibold">
              AD
            </div>
            <div className="leading-tight min-w-0">
              <div className="text-[12px] text-sidebar-accent-foreground font-medium truncate">{admin?.name ?? "Admin User"}</div>
              <div className="text-[10px] text-muted-foreground truncate">{admin?.email ?? "admin account"}</div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
