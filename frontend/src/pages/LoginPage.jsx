import { useEffect } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { ROUTES } from "@/config/site";
import { setPostLoginRedirect, peekPostLoginRedirect } from "@/utils/redirect";
import { AuthLayout, AuthCard } from "@/components/auth/AuthLayout";
import { LoginForm } from "@/components/auth/LoginForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { OrnamentDivider } from "@/components/common/Motifs";
import { PageLoader } from "@/components/common/PageLoader";

export default function LoginPage() {
  const { loading, isAuthenticated, loginWithGoogle } = useAuth();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const redirectTo = location.state?.from || params.get("redirect") || peekPostLoginRedirect() || ROUTES.account;

  useEffect(() => { setPostLoginRedirect(redirectTo); }, [redirectTo]);

  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  return (
    <AuthLayout>
      <AuthCard icon={LogIn} label="Login" title="Welcome Back" subtitle="Sign in to continue your journey with us." testId="login-card">
        <LoginForm redirectTo={redirectTo} />
      </AuthCard>
      <AuthCard icon={UserPlus} label="Sign Up" title="Create Your Account" subtitle="Join Madam Boutique & Madam Fashions" testId="login-signup-teaser-card" muted>
        <div className="space-y-4">
          <GoogleButton label="Sign Up with Google" onClick={() => loginWithGoogle(redirectTo, "signup")} testId="teaser-signup-google-button" />
          <OrnamentDivider><span className="text-xs tracking-wide text-steel">Or Sign Up with Email</span></OrnamentDivider>
          <Link to={ROUTES.signup} state={{ from: redirectTo }} className="btn-navy w-full" data-testid="teaser-signup-email-button">Sign Up with Email</Link>
          <p className="text-xs text-center text-steel">We'll verify your email, then you complete your details.</p>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
