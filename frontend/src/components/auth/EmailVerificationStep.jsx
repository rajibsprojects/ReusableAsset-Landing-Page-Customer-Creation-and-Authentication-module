import { useState } from "react";
import { Mail, CheckCircle2, Link2 } from "lucide-react";
import { authService } from "@/services/authService";
import { useAuth } from "@/auth/useAuth";
import { getErrorMessage } from "@/utils/formatError";
import { isValidEmail } from "@/utils/validators";
import { GoogleButton } from "./GoogleButton";
import { OrnamentDivider } from "@/components/common/Motifs";

/** Step 1 of email sign-up: choose Google or request a verification link. */
export function EmailVerificationStep({ redirectTo }) {
  const { loginWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) return setError("Please enter a valid email address");
    setBusy(true);
    try {
      setSent(await authService.requestEmailVerification(email.trim()));
    } catch (err) {
      setError(getErrorMessage(err, "Could not send the verification email. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="text-center space-y-4" data-testid="signup-verification-sent">
        <CheckCircle2 className="h-12 w-12 text-navy mx-auto" strokeWidth={1.4} />
        <h2 className="heading-serif text-xl">Check your inbox</h2>
        <p className="text-sm text-steel">{sent.message}</p>
        {!sent.email_sent && <p className="text-xs text-destructive">We could not deliver the email right now. Please try again in a few minutes.</p>}
        {sent.dev_link && (
          <a href={sent.dev_link} className="inline-flex items-center gap-2 text-xs text-navy underline underline-offset-4 break-all" data-testid="signup-dev-verification-link">
            <Link2 className="h-3.5 w-3.5 shrink-0" /> Open verification link (development mode)
          </a>
        )}
        <button type="button" onClick={() => setSent(null)} className="text-sm text-navy hover:underline underline-offset-4" data-testid="signup-change-email-button">Use a different email</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GoogleButton label="Sign Up with Google" onClick={() => loginWithGoogle(redirectTo, "signup")} testId="signup-google-button" />
      <p className="text-xs text-steel -mt-2" data-testid="signup-google-hint">Google will use the account you are currently signed into in this browser. To register with a different Google account, switch accounts at google.com first.</p>
      <OrnamentDivider><span className="text-xs tracking-wide text-steel">Or Sign Up with Email</span></OrnamentDivider>
      <form onSubmit={submit} className="space-y-4" noValidate data-testid="signup-email-form">
        <div>
          <label htmlFor="signup-email" className="field-label">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mist" />
            <input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email (Yahoo, Hotmail, any provider)" autoComplete="email" className="field-input pl-10" data-testid="signup-email-input" required />
          </div>
          <p className="text-xs text-steel mt-1.5">We'll send a verification link. Click it to continue with your details.</p>
        </div>
        {error && <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-sm px-3 py-2" role="alert" data-testid="signup-email-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn-navy w-full disabled:opacity-60" data-testid="signup-send-verification-button">
          {busy ? "Sending..." : "Send Verification Link"}
        </button>
      </form>
    </div>
  );
}
