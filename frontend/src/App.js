import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/auth/AuthProvider";
import { AuthCallback } from "@/auth/AuthCallback";
import { ProtectedRoute } from "@/auth/ProtectedRoute";
import { BusinessContentProvider } from "@/hooks/useBusinessContent";
import { Layout } from "@/components/layout/Layout";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignupPage from "@/pages/SignupPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import AccountPage from "@/pages/AccountPage";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFoundPage from "@/pages/NotFoundPage";

function AppRouter() {
  const location = useLocation();
  // Google OAuth return: exchange session_id before any route/guard runs.
  if (location.hash?.includes("session_id=")) return <AuthCallback />;

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
        <Route path="/boutique" element={<PlaceholderPage eyebrow="Module 2" title="Madam Boutique" description="Custom tailoring requirements, measurements and designer boutique orders." testId="boutique-page" />} />
        <Route path="/fashions" element={<PlaceholderPage eyebrow="Module 3" title="Madam Fashions" description="Premium dress materials, silks, laces and apparel fashion products." testId="fashions-page" />} />
        <Route path="/order-status" element={<PlaceholderPage eyebrow="Module 4" title="Order Enquiry / Status" description="Track your Boutique and Fashions orders in one place." testId="order-status-page" />} />
        <Route path="/admin" element={<PlaceholderPage eyebrow="Module 4" title="Admin Dashboard" description="Order management for the business owner." testId="admin-page" />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <BusinessContentProvider>
        <AuthProvider>
          <AppRouter />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </BusinessContentProvider>
    </BrowserRouter>
  );
}

export default App;
