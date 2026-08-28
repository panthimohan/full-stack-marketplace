import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  LayoutDashboard, Package, ShoppingBag, Store, Users, FolderTree, ClipboardList, User as UserIcon,
} from "lucide-react";

import { PublicLayout } from "./components/layout/PublicLayout";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";

import HomePage from "./pages/public/HomePage";
import ProductListPage from "./pages/public/ProductListPage";
import ProductDetailPage from "./pages/public/ProductDetailPage";
import VendorListPage from "./pages/public/VendorListPage";
import VendorDetailPage from "./pages/public/VendorDetailPage";
import LoginPage from "./pages/public/LoginPage";
import RegisterPage from "./pages/public/RegisterPage";
import ForgotPasswordPage from "./pages/public/ForgotPasswordPage";
import ResetPasswordPage from "./pages/public/ResetPasswordPage";

import CartPage from "./pages/customer/CartPage";
import CheckoutPage from "./pages/customer/CheckoutPage";
import EsewaSuccessPage from "./pages/customer/EsewaSuccessPage";
import EsewaFailurePage from "./pages/customer/EsewaFailurePage";
import AccountDashboardPage from "./pages/customer/AccountDashboardPage";
import OrderHistoryPage from "./pages/customer/OrderHistoryPage";
import OrderDetailPage from "./pages/customer/OrderDetailPage";
import ProfilePage from "./pages/customer/ProfilePage";

import VendorDashboardPage from "./pages/vendor/VendorDashboardPage";
import VendorShopProfilePage from "./pages/vendor/VendorShopProfilePage";
import VendorProductListPage from "./pages/vendor/VendorProductListPage";
import VendorProductFormPage from "./pages/vendor/VendorProductFormPage";
import VendorOrderListPage from "./pages/vendor/VendorOrderListPage";
import VendorOrderDetailPage from "./pages/vendor/VendorOrderDetailPage";

import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminVendorListPage from "./pages/admin/AdminVendorListPage";
import AdminProductListPage from "./pages/admin/AdminProductListPage";
import AdminCategoryListPage from "./pages/admin/AdminCategoryListPage";
import AdminOrderListPage from "./pages/admin/AdminOrderListPage";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const customerNav = [
  { to: "/account", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, end: true },
  { to: "/account/orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" /> },
  { to: "/account/profile", label: "Profile", icon: <UserIcon className="w-4 h-4" /> },
  { to: "/cart", label: "Cart", icon: <ShoppingBag className="w-4 h-4" /> },
];

const vendorNav = [
  { to: "/vendor", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, end: true },
  { to: "/vendor/shop", label: "Shop profile", icon: <Store className="w-4 h-4" /> },
  { to: "/vendor/products", label: "Products", icon: <Package className="w-4 h-4" /> },
  { to: "/vendor/orders", label: "Orders", icon: <ClipboardList className="w-4 h-4" /> },
];

const adminNav = [
  { to: "/admin", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" />, end: true },
  { to: "/admin/vendors", label: "Vendors", icon: <Users className="w-4 h-4" /> },
  { to: "/admin/products", label: "Products", icon: <Package className="w-4 h-4" /> },
  { to: "/admin/categories", label: "Categories", icon: <FolderTree className="w-4 h-4" /> },
  { to: "/admin/orders", label: "Orders", icon: <ClipboardList className="w-4 h-4" /> },
];

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public marketplace */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductListPage />} />
            <Route path="/products/:slug" element={<ProductDetailPage />} />
            <Route path="/vendors" element={<VendorListPage />} />
            <Route path="/vendors/:slug" element={<VendorDetailPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/checkout/esewa/success" element={<EsewaSuccessPage />} />
            <Route path="/checkout/esewa/failure" element={<EsewaFailurePage />} />

            {/* Customer-only pages that still use the public shell */}
            <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
            </Route>
          </Route>

          {/* Customer dashboard */}
          <Route element={<ProtectedRoute allowedRoles={["CUSTOMER"]} />}>
            <Route element={<DashboardLayout title="My account" navItems={customerNav} />}>
              <Route path="/account" element={<AccountDashboardPage />} />
              <Route path="/account/orders" element={<OrderHistoryPage />} />
              <Route path="/account/orders/:id" element={<OrderDetailPage />} />
              <Route path="/account/profile" element={<ProfilePage />} />
            </Route>
          </Route>

          {/* Vendor dashboard */}
          <Route element={<ProtectedRoute allowedRoles={["VENDOR"]} />}>
            <Route element={<DashboardLayout title="Vendor panel" navItems={vendorNav} />}>
              <Route path="/vendor" element={<VendorDashboardPage />} />
              <Route path="/vendor/shop" element={<VendorShopProfilePage />} />
              <Route path="/vendor/products" element={<VendorProductListPage />} />
              <Route path="/vendor/products/new" element={<VendorProductFormPage />} />
              <Route path="/vendor/products/:id/edit" element={<VendorProductFormPage />} />
              <Route path="/vendor/orders" element={<VendorOrderListPage />} />
              <Route path="/vendor/orders/:id" element={<VendorOrderDetailPage />} />
            </Route>
          </Route>

          {/* Admin dashboard */}
          <Route element={<ProtectedRoute allowedRoles={["ADMIN"]} />}>
            <Route element={<DashboardLayout title="Admin panel" navItems={adminNav} />}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/vendors" element={<AdminVendorListPage />} />
              <Route path="/admin/products" element={<AdminProductListPage />} />
              <Route path="/admin/categories" element={<AdminCategoryListPage />} />
              <Route path="/admin/orders" element={<AdminOrderListPage />} />
            </Route>
          </Route>

          <Route path="*" element={<div className="container-page py-24 text-center text-ink-700">Page not found.</div>} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
