import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { authService } from "@/services/authService";
import { getErrorMessage } from "@/utils/formatError";
import { ROUTES } from "@/config/site";
import { EmailVerificationStep } from "./EmailVerificationStep";
import { SignupDetailsForm } from "./SignupDetailsForm";
import { PageLoader } from "@/components/common/PageLoader";

export function SignupForm({ redirectTo }) {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [verification, setVerification] = useState({ state: token ? "checking" : "none", email: "", error: "" });

  useEffect(() => {
    if (!token) return;
    let active = true;
    authService
      .confirmEmailVerification(token)
      .then((data) => active && setVerification({ state: "verified", email: data.email, error: "" }))
      .catch((err) => active && setVerification({ state: "invalid", email: "", error: getErrorMessage(err, "This verification link is invalid or has expired.") }));
    return () => { active = false; };
  }, [token]);

  if (verification.state === "checking") return <PageLoader label="Verifying your email..." />;
  if (verification.state === "invalid") {
    return (
      <div className="text-center space-y-4" data-testid="signup-verification-invalid">
        <AlertTriangle className="h-10 w-10 text-amber-600 mx-auto" strokeWidth={1.5} />
        <p className="text-sm text-steel">{verification.error}</p>
        <Link to={ROUTES.signup} className="btn-outline text-sm" data-testid="signup-request-new-link">Request a new link</Link>
      </div>
    );
  }
  if (verification.state === "verified") return <SignupDetailsForm token={token} email={verification.email} redirectTo={redirectTo} />;
  return <EmailVerificationStep redirectTo={redirectTo} />;
}
