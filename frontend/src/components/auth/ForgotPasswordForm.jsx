import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, CheckCircle2, Link2 } from "lucide-react";
import { authService } from "@/services/authService";
import { ROUTES } from "@/config/site";
import { getErrorMessage } from "@/utils/formatError";
import { isValidEmail } from "@/utils/validators";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) return setError("Please enter a valid email address");
    setBusy(true);
    try {
      setResult(await authService.forgotPassword(email.trim()));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (result) {
    return (
      <div className="text-center space-y-4" data-testid="forgot-password-sent">
        <CheckCircle2 className="h-12 w-12 text-navy mx-auto" strokeWidth={1.4} />
        <p className="text-sm text-steel">{result.message}</p>
        {result.dev_link && (
          <a href={result.dev_link} className="inline-flex items-center gap-2 text-xs text-navy underline underline-offset-4 break-all" data-testid="forgot-dev-reset-link">
            <Link2 className="h-3.5 w-3.5 shrink-0" /> Open reset link (development mode)
          </a>
        )}
        <Link to={ROUTES.login} className="block text-sm text-navy hover:underline underline-offset-4" data-testid="forgot-back-to-login">Back to Login</Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate data-testid="forgot-password-form">
      <div>
        <label htmlFor="fp-email" className="field-label">Email Address</label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mist" />
          <input id="fp-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your registered email" className="field-input pl-10" autoComplete="email" data-testid="forgot-email-input" required />
        </div>
      </div>
      {error && <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-sm px-3 py-2" role="alert" data-testid="forgot-error">{error}</p>}
      <button type="submit" disabled={busy} className="btn-navy w-full disabled:opacity-60" data-testid="forgot-submit-button">{busy ? "Sending..." : "Send Reset Link"}</button>
      <p className="text-center text-sm text-steel">
        Remembered it? <Link to={ROUTES.login} className="text-navy font-medium hover:underline underline-offset-4" data-testid="forgot-login-link">Login</Link>
      </p>
    </form>
  );
}
