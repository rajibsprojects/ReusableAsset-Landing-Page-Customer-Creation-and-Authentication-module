import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { ROUTES } from "@/config/site";
import { getErrorMessage } from "@/utils/formatError";
import { passwordIssues } from "@/utils/validators";
import { PasswordField } from "./PasswordField";

export function ResetPasswordForm() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!token) {
    return (
      <div className="text-center space-y-3" data-testid="reset-missing-token">
        <p className="text-sm text-steel">This reset link is incomplete.</p>
        <Link to={ROUTES.forgot} className="btn-outline text-sm" data-testid="reset-request-new-link">Request a new link</Link>
      </div>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    const issues = passwordIssues(password);
    if (issues.length) return setError(`Password: ${issues.map((i) => i.label.toLowerCase()).join(", ")}`);
    if (password !== confirm) return setError("Passwords do not match");
    setError("");
    setBusy(true);
    try {
      const res = await authService.resetPassword(token, password);
      toast.success(res.message);
      navigate(ROUTES.login, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate data-testid="reset-password-form">
      <PasswordField id="rp-password" label="New Password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a new password" showRules autoComplete="new-password" testId="reset-password-input" />
      <PasswordField id="rp-confirm" label="Confirm New Password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter new password" autoComplete="new-password" testId="reset-confirm-password-input" />
      {error && <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-sm px-3 py-2" role="alert" data-testid="reset-error">{error}</p>}
      <button type="submit" disabled={busy} className="btn-navy w-full disabled:opacity-60" data-testid="reset-submit-button">{busy ? "Updating..." : "Reset Password"}</button>
    </form>
  );
}
