import { Link, Navigate, useLocation, useSearchParams } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { ROUTES } from "@/config/site";
import { peekPostLoginRedirect } from "@/utils/redirect";
import { AuthLayout, AuthCard } from "@/components/auth/AuthLayout";
import { SignupForm } from "@/components/auth/SignupForm";
import { GoogleButton } from "@/components/auth/GoogleButton";
import { OrnamentDivider } from "@/components/common/Motifs";
import { PageLoader } from "@/components/common/PageLoader";

export default function SignupPage() {
  const { loading, isAuthenticated, loginWithGoogle } = useAuth();
  const location = useLocation();
  const [params] = useSearchParams();
  const redirectTo = location.state?.from || peekPostLoginRedirect() || ROUTES.account;
  const verifying = !!params.get("token");

  if (loading) return <PageLoader />;
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;

  return (
    <AuthLayout>
      <AuthCard icon={UserPlus} label="Sign Up" title={verifying ? "Complete Your Details" : "Create Your Account"} subtitle={verifying ? "Your email is verified. Tell us a little more about you." : "Join Madam Boutique & Madam Fashions"} testId="signup-card">
        <SignupForm redirectTo={redirectTo} />
      </AuthCard>
      <AuthCard icon={LogIn} label="Login" title="Welcome Back" subtitle="Already have an account? Sign in to continue." testId="signup-login-teaser-card" muted>
        <div className="space-y-4">
          <GoogleButton label="Google Sign In" onClick={() => loginWithGoogle(redirectTo)} testId="teaser-login-google-button" />
          <OrnamentDivider><span className="text-xs tracking-wide text-steel">or</span></OrnamentDivider>
          <Link to={ROUTES.login} state={{ from: redirectTo }} className="btn-navy w-full" data-testid="teaser-login-email-button">Login with Email</Link>
        </div>
      </AuthCard>
    </AuthLayout>
  );
}
