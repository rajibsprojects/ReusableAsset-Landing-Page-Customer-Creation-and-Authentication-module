import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/auth/useAuth";
import { ROUTES } from "@/config/site";
import { getErrorMessage } from "@/utils/formatError";
import { isValidEmail } from "@/utils/validators";
import { GoogleButton } from "./GoogleButton";
import { PasswordField } from "./PasswordField";
import { OrnamentDivider } from "@/components/common/Motifs";

export function LoginForm({ redirectTo }) {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!isValidEmail(email)) return setError("Please enter a valid email address");
    if (!password) return setError("Please enter your password");
    setBusy(true);
    try {
      const user = await login(email.trim(), password);
      toast.success(`Welcome back, ${user.name.split(" ")[0]}`);
      navigate(redirectTo || ROUTES.account, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Login failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <GoogleButton label="Google Sign In" onClick={() => loginWithGoogle(redirectTo)} testId="login-google-button" />
      <OrnamentDivider className="text-xs my-2"><span className="text-xs tracking-wide text-steel">or sign in with email</span></OrnamentDivider>
      <form onSubmit={submit} className="space-y-4" noValidate data-testid="login-form">
        <div>
          <label htmlFor="login-email" className="field-label">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-mist" />
            <input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" autoComplete="email" className="field-input pl-10" data-testid="login-email-input" required />
          </div>
        </div>
        <PasswordField id="login-password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)} testId="login-password-input" />
        <div className="flex justify-end -mt-1">
          <Link to={ROUTES.forgot} className="text-sm text-navy hover:underline underline-offset-4" data-testid="login-forgot-link">Forgot Password?</Link>
        </div>
        {error && <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-sm px-3 py-2" role="alert" data-testid="login-error">{error}</p>}
        <button type="submit" disabled={busy} className="btn-navy w-full disabled:opacity-60" data-testid="login-submit-button">
          {busy ? "Signing in..." : "Login"}
        </button>
      </form>
      <p className="text-center text-sm text-steel pt-2">
        New Customer? <Link to={ROUTES.signup} state={{ from: redirectTo }} className="text-navy font-medium hover:underline underline-offset-4" data-testid="login-signup-link">Sign Up</Link>
      </p>
    </div>
  );
}
