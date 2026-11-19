import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";

import Landing from "./pages/Landing";
import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import NotFound from "./pages/NotFound";
import { CustomerCarePage, ManagedPolicyPage, OurStoryPage, StoreLocatorPage } from "./pages/AboutPages";
import AuthPage from "./pages/AuthPage";
import CartPage from "./pages/CartPage";
import WishlistPage from "./pages/WishlistPage";
import CheckoutPage from "./pages/CheckoutPage";
import PaymentStatusPage from "./pages/PaymentStatusPage";
import CheckInPage from "./pages/CheckInPage";
import AdminLayout from "@admin-dashboard/components/admin/AdminLayout";
import AdminLogin from "@admin-dashboard/pages/admin/AdminLogin";
import Overview from "@admin-dashboard/pages/admin/Overview";
import Products from "@admin-dashboard/pages/admin/Products";
import Categories from "@admin-dashboard/pages/admin/Categories";
import Inquiries from "@admin-dashboard/pages/admin/Inquiries";
import Inventory from "@admin-dashboard/pages/admin/Inventory";
import Reviews from "@admin-dashboard/pages/admin/Reviews";
import Settings from "@admin-dashboard/pages/admin/Settings";
import StoreContent from "@admin-dashboard/pages/admin/StoreContent";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/about" element={<Navigate to="/our-story" replace />} />
            <Route path="/customer-care" element={<CustomerCarePage />} />
            <Route path="/our-story" element={<OurStoryPage />} />
            <Route path="/store-locator" element={<StoreLocatorPage />} />
            <Route path="/stores" element={<Navigate to="/store-locator" replace />} />
            <Route path="/contact" element={<Navigate to="/customer-care" replace />} />
            <Route path="/shipping" element={<ManagedPolicyPage kind="shipping" />} />
            <Route path="/returns" element={<ManagedPolicyPage kind="returns" />} />
            <Route path="/warranty" element={<ManagedPolicyPage kind="warranty" />} />
            <Route path="/sign-in" element={<AuthPage mode="sign-in" />} />
            <Route path="/sign-up" element={<AuthPage mode="sign-up" />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/shop/:categorySlug" element={<Shop />} />
            <Route path="/shop/:categorySlug/:subcategorySlug" element={<Shop />} />
            <Route path="/product/:slug" element={<ProductDetail />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/check-in" element={<CheckInPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/payment-status/:orderId" element={<PaymentStatusPage />} />
            <Route path="/admin/sign-in" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Overview />} />
              <Route path="dashboard" element={<Overview />} />
              <Route path="products" element={<Products />} />
              <Route path="categories" element={<Categories />} />
              <Route path="inquiries" element={<Inquiries />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="reviews" element={<Reviews />} />
              <Route path="settings" element={<Settings />} />
              <Route path="store-content" element={<StoreContent />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
