import { Link, useLocation } from "react-router-dom";
import { Moon, Sun, ChevronDown, Menu, X, Heart, ShoppingBag, User } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { StackedLogo } from "./StackedLogo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useStorefront } from "@/hooks/use-storefront";
import { getNavCategories, type NavCategory } from "@/lib/catalog";
import { clearAuth, fetchCurrentUser, getStoredAuth, type AuthUser } from "@/lib/auth";

export function StoreNav() {
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const categories = getNavCategories();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileCategorySlug, setMobileCategorySlug] = useState<string | undefined>();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getStoredAuth()?.user ?? null);
  const { cart, wishlist } = useStorefront();
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    if (!mobileCategorySlug && categories[0]) {
      setMobileCategorySlug(categories[0].slug);
    }
  }, [mobileCategorySlug, categories]);

  useEffect(() => {
    const syncAuth = () => setCurrentUser(getStoredAuth()?.user ?? null);

    window.addEventListener("storage", syncAuth);
    window.addEventListener("stacked-auth-change", syncAuth);

    return () => {
      window.removeEventListener("storage", syncAuth);
      window.removeEventListener("stacked-auth-change", syncAuth);
    };
  }, []);

  useEffect(() => {
    const auth = getStoredAuth();

    let cancelled = false;

    fetchCurrentUser(auth?.token)
      .then(({ user }) => {
        if (!cancelled) setCurrentUser(user);
      })
      .catch(() => {
        clearAuth();
        if (!cancelled) setCurrentUser(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 px-6 shadow-sm shadow-slate-900/[0.025] backdrop-blur-xl">
      <div className="mx-auto flex h-[56px] max-w-[1200px] items-center justify-between">
        <Link to="/" className="flex items-center gap-2 -ml-0.5">
          <StackedLogo size={16} />
          <span className="text-[14px] font-bold text-foreground tracking-[0.08em] uppercase">
            Stacked
          </span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          <ShopDropdown categories={categories} />
          <NavTextLink to="/about" label="About" active={location.pathname === "/about"} />
          <SupportDropdown />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="relative flex h-9 w-9 items-center justify-center text-muted-foreground transition-colors hover:text-primary"
            title="Toggle theme"
            aria-label="Toggle theme"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          </button>

          <div className="hidden lg:flex items-center gap-1">
            <IconLink to="/wishlist" label="Wishlist" count={wishlist.length} icon={Heart} />
            <IconLink to="/cart" label="Cart" count={cartCount} icon={ShoppingBag} />
            <AccountDropdown user={currentUser} />
          </div>

          {/* Mobile drawer trigger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="lg:hidden h-8 w-8 flex items-center justify-center text-foreground/70 hover:text-foreground"
                aria-label="Open menu"
              >
                <Menu className="h-4 w-4" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[380px] p-0 overflow-y-auto">
              <div className="sr-only">
                <SheetTitle>Store navigation</SheetTitle>
                <SheetDescription>
                  Browse categories, wishlist, cart, and account links from the mobile menu.
                </SheetDescription>
              </div>
              <div className="flex items-center justify-between h-[56px] px-6 border-b border-border">
                <span className="text-[14px] font-bold tracking-[0.08em] uppercase">
                  Categories
                </span>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="h-8 w-8 flex items-center justify-center text-foreground/70 hover:text-foreground"
                  aria-label="Close menu"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-2 py-2">
                <div className="border-b border-border px-3 py-3">
                  <Link
                    to="/shop"
                    onClick={() => setMobileOpen(false)}
                    className="text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground"
                  >
                    Shop all products
                  </Link>
                </div>
                <div className="border-b border-border px-3 py-3 grid gap-2">
                  <Link
                    to="/wishlist"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between text-[13px] text-foreground/80 hover:text-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Wishlist
                    </span>
                    <span className="text-muted-foreground">{wishlist.length}</span>
                  </Link>
                  <Link
                    to="/cart"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center justify-between text-[13px] text-foreground/80 hover:text-foreground"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Cart
                    </span>
                    <span className="text-muted-foreground">{cartCount}</span>
                  </Link>
                </div>
                <div className="px-3 py-3">
                  <Accordion
                    type="single"
                    collapsible
                    value={mobileCategorySlug}
                    onValueChange={(value) => setMobileCategorySlug(value || undefined)}
                    className="border border-border"
                  >
                    {categories.map((category) => (
                      <AccordionItem key={category.id} value={category.slug} className="border-border bg-background px-0">
                        <AccordionTrigger className="px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground hover:no-underline">
                          {category.name}
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4 pt-0">
                          <div className="border border-border bg-secondary/15 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                                Browse {category.name}
                              </p>
                              <Link
                                to={`/shop/${category.slug}`}
                                onClick={() => setMobileOpen(false)}
                                className="text-[12px] uppercase tracking-[0.12em] text-foreground/65 transition-colors hover:text-foreground"
                              >
                                View all
                              </Link>
                            </div>

                            {category.subcategories.length > 0 ? (
                              <div className="mt-4 grid gap-2">
                                {category.subcategories.map((subcategory) => (
                                  <Link
                                    key={subcategory.id}
                                    to={`/shop/${category.slug}/${subcategory.slug}`}
                                    onClick={() => setMobileOpen(false)}
                    className="border border-border bg-background px-3 py-3 text-[13px] text-foreground/80 transition-colors hover:text-primary"
                                  >
                                    {subcategory.name}
                                  </Link>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
                                Open this category to view the full product range.
                              </p>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              </div>
              <div className="border-t border-border px-5 py-5">
                {currentUser ? (
                  <div className="grid gap-3">
                    <p className="text-[13px] text-foreground">
                      {currentUser.firstName} {currentUser.lastName}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        clearAuth();
                        setMobileOpen(false);
                      }}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-[13px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      Sign out
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <Link
                      to="/sign-in"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-[13px] text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/sign-up"
                      onClick={() => setMobileOpen(false)}
                      className="inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-[13px] font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Sign up
                    </Link>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}

function IconLink({
  to,
  label,
  count,
  icon: Icon,
}: {
  to: string;
  label: string;
  count: number;
  icon: typeof Heart;
}) {
  return (
    <Link
      to={to}
            className="nav-text-glow relative inline-flex h-8 w-8 items-center justify-center text-foreground/60"
      aria-label={label}
      title={label}
    >
      <Icon className="h-4 w-4" />
      {count > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-[10px] leading-4 text-background">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}

function NavTextLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex h-8 items-center px-3 text-[13px] transition-colors",
        `nav-text-glow ${active ? "font-medium text-primary" : "text-foreground/65"}`,
      )}
    >
      {label}
    </Link>
  );
}

function ShopDropdown({ categories }: { categories: NavCategory[] }) {
  const location = useLocation();
  const isActive = location.pathname.startsWith("/shop");
  const routeCategorySlug = location.pathname.split("/")[2] ?? null;
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(routeCategorySlug);

  useEffect(() => {
    if (routeCategorySlug) {
      setActiveCategorySlug(routeCategorySlug);
      return;
    }

    if (!activeCategorySlug && categories[0]) {
      setActiveCategorySlug(categories[0].slug);
    }
  }, [routeCategorySlug, activeCategorySlug, categories]);

  const activeCategory =
    categories.find((category) => category.slug === activeCategorySlug) ?? categories[0] ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "text-[13px] h-8 px-3 inline-flex items-center gap-1 transition-colors outline-none",
            isActive
              ? "nav-text-glow font-medium text-primary"
              : "nav-text-glow text-foreground/65"
          )}
        >
          Shop
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="w-[480px] rounded-none border border-border bg-popover p-0"
      >
        <div className="border-b border-border bg-secondary/20 px-5 py-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Browse the store
          </p>
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="max-w-[300px] text-[13px] leading-6 text-foreground/80">
              Jump into a category fast, then narrow down inside the catalog.
            </p>
            <Link
              to="/shop"
              className="nav-text-glow shrink-0 text-[12px] uppercase tracking-[0.12em] text-foreground/70"
            >
              Shop all
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-[150px_minmax(0,1fr)] gap-0">
          <div className="border-r border-border bg-background px-3 py-3">
            <div className="grid gap-1">
              {categories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategorySlug(category.slug)}
                  onMouseEnter={() => setActiveCategorySlug(category.slug)}
                  onFocus={() => setActiveCategorySlug(category.slug)}
                  className={cn(
                    "nav-text-glow flex min-h-10 items-center justify-between px-3 text-left text-[13px] transition-colors",
                    activeCategory?.id === category.id
                      ? "font-medium text-primary"
                      : "text-foreground/65",
                  )}
                >
                  <span>{category.name}</span>
                  <ChevronDown
                    className={cn(
                      "h-3 w-3 transition-transform",
                      activeCategory?.id === category.id ? "-rotate-90 text-primary" : "rotate-0",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="bg-background p-4">
            {activeCategory ? (
              <div className="border border-border bg-secondary/15 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
                      Category
                    </p>
                    <p className="mt-2 text-[18px] tracking-[-0.03em] text-foreground">
                      {activeCategory.name}
                    </p>
                  </div>
                  <Link
                    to={`/shop/${activeCategory.slug}`}
                    className="nav-text-glow shrink-0 text-[12px] uppercase tracking-[0.12em] text-foreground/65"
                  >
                    View all
                  </Link>
                </div>

                {activeCategory.subcategories.length > 0 ? (
                  <div className="mt-4 grid gap-2">
                    {activeCategory.subcategories.map((subcategory) => (
                      <Link
                        key={subcategory.id}
                        to={`/shop/${activeCategory.slug}/${subcategory.slug}`}
                        className="border border-border bg-background px-3 py-3 text-[13px] text-foreground/80 transition-colors hover:text-primary"
                      >
                        {subcategory.name}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
                    Open this category to see the full product range.
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SupportDropdown() {
  const location = useLocation();
  const isActive =
    location.pathname === "/contact" ||
    location.pathname === "/shipping" ||
    location.pathname === "/returns" ||
    location.pathname === "/warranty";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex h-8 items-center gap-1 px-3 text-[13px] transition-colors outline-none",
            isActive ? "nav-text-glow font-medium text-primary" : "nav-text-glow text-foreground/65",
          )}
        >
          Support
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="min-w-[180px] rounded-none border border-border bg-popover p-1"
      >
        {[
          { to: "/contact", label: "Contact" },
          { to: "/shipping", label: "Shipping" },
          { to: "/returns", label: "Returns" },
          { to: "/warranty", label: "Warranty" },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="nav-text-glow block px-3 py-2 text-[13px] text-foreground/80 transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function AccountDropdown({ user }: { user: AuthUser | null }) {
  const location = useLocation();
  const isActive = location.pathname === "/sign-in" || location.pathname === "/sign-up";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "inline-flex h-8 items-center gap-1 rounded-none border border-border px-3 text-[13px] transition-colors outline-none",
            isActive
              ? "nav-text-glow font-medium text-primary"
              : "nav-text-glow text-foreground/70",
          )}
        >
          <User className="h-3.5 w-3.5" />
          <span>{user ? user.firstName : "Account"}</span>
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="min-w-[180px] rounded-none border border-border bg-popover p-1"
      >
        {user ? (
          <>
            <div className="px-3 py-2">
              <p className="text-[13px] text-foreground">
                {user.firstName} {user.lastName}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">{user.email}</p>
            </div>
            <button
              type="button"
              onClick={clearAuth}
              className="nav-text-glow block w-full px-3 py-2 text-left text-[13px] text-foreground/80 transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <Link
              to="/sign-in"
              className="nav-text-glow block px-3 py-2 text-[13px] text-foreground/80 transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/sign-up"
              className="nav-text-glow block px-3 py-2 text-[13px] text-foreground/80 transition-colors"
            >
              Create account
            </Link>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
