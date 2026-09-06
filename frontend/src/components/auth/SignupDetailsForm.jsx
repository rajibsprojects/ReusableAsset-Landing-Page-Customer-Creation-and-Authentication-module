import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/auth/useAuth";
import { ROUTES } from "@/config/site";
import { usePincodeLookup } from "@/hooks/usePincodeLookup";
import { getErrorMessage } from "@/utils/formatError";
import { isValidMobile, isValidPin, passwordIssues } from "@/utils/validators";
import { PasswordField } from "./PasswordField";

const Field = ({ id, label, required, hint, children }) => (
  <div>
    <label htmlFor={id} className="field-label">{label}{required && <span className="text-destructive"> *</span>}</label>
    {children}
    {hint && <p className="text-xs mt-1 text-steel">{hint}</p>}
  </div>
);

/** Step 2 of email sign-up: verified email is locked, customer completes their details. */
export function SignupDetailsForm({ token, email, redirectTo }) {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: "", contact_mobile: "", contact_other: "", address1: "", address2: "", city: "", state: "", pin: "", category: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const onPin = useCallback((data) => setF((s) => ({ ...s, city: data.city || s.city, state: data.state || s.state })), []);
  const pinStatus = usePincodeLookup(f.pin, onPin);

  const validate = () => {
    if (f.name.trim().length < 2) return "Please enter your full name";
    if (!isValidMobile(f.contact_mobile)) return "Please enter a valid mobile number (10-15 digits)";
    if (f.address1.trim().length < 3) return "Please enter your address";
    if (!isValidPin(f.pin)) return "Please enter a valid 6-digit PIN code";
    if (!f.city.trim() || !f.state.trim()) return "Please enter your city and state";
    if (!f.category) return "Please tell us whether you are a Business or an Individual";
    const issues = passwordIssues(f.password);
    if (issues.length) return `Password: ${issues.map((i) => i.label.toLowerCase()).join(", ")}`;
    if (f.password !== f.confirm) return "Passwords do not match";
    return "";
  };

  const submit = async (e) => {
    e.preventDefault();
    const v = validate();
    setError(v);
    if (v) return;
    setBusy(true);
    try {
      const { confirm, ...rest } = f;
      const user = await register({ ...rest, contact_other: f.contact_other || null, address2: f.address2 || null, category: f.category, verification_token: token });
      toast.success(`Welcome, ${user.name.split(" ")[0]}! Your account is ready.`);
      navigate(redirectTo || ROUTES.account, { replace: true });
    } catch (err) {
      setError(getErrorMessage(err, "Registration failed. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate data-testid="signup-details-form">
      <div className="flex items-center gap-2 rounded-sm bg-emerald-50 border border-emerald-200 px-3 py-2 text-xs text-emerald-800" data-testid="signup-email-verified-badge">
        Email verified: <strong className="truncate">{email}</strong>
      </div>
      <Field id="su-name" label="Full Name" required>
        <input id="su-name" value={f.name} onChange={set("name")} className="field-input" placeholder="Enter your full name" autoComplete="name" data-testid="signup-name-input" />
      </Field>
      <Field id="su-email" label="Email Address" required>
        <input id="su-email" value={email} disabled className="field-input" data-testid="signup-email-locked-input" />
      </Field>
      <div className="grid sm:grid-cols-2 gap-4">
        <Field id="su-mobile" label="Mobile Number" required>
          <input id="su-mobile" value={f.contact_mobile} onChange={set("contact_mobile")} className="field-input" placeholder="10-digit mobile" inputMode="tel" autoComplete="tel" data-testid="signup-mobile-input" />
        </Field>
        <Field id="su-landline" label="Landline (optional)">
          <input id="su-landline" value={f.contact_other} onChange={set("contact_other")} className="field-input" placeholder="With STD code" inputMode="tel" data-testid="signup-landline-input" />
        </Field>
      </div>
      <Field id="su-addr1" label="Address Line 1" required hint="Apartment / House no., Building">
        <input id="su-addr1" value={f.address1} onChange={set("address1")} className="field-input" placeholder="Flat / House no., Building" autoComplete="address-line1" data-testid="signup-address1-input" />
      </Field>
      <Field id="su-addr2" label="Address Line 2" hint="Street name, Area / Locality">
        <input id="su-addr2" value={f.address2} onChange={set("address2")} className="field-input" placeholder="Street, Area" autoComplete="address-line2" data-testid="signup-address2-input" />
      </Field>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field id="su-pin" label="PIN Code" required>
          <input id="su-pin" value={f.pin} onChange={(e) => setF((s) => ({ ...s, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className="field-input" placeholder="6 digits" inputMode="numeric" autoComplete="postal-code" data-testid="signup-pin-input" />
        </Field>
        <Field id="su-city" label="City" required>
          <input id="su-city" value={f.city} onChange={set("city")} className="field-input" placeholder="City" autoComplete="address-level2" data-testid="signup-city-input" />
        </Field>
        <Field id="su-state" label="State" required>
          <input id="su-state" value={f.state} onChange={set("state")} className="field-input" placeholder="State" autoComplete="address-level1" data-testid="signup-state-input" />
        </Field>
      </div>
      {pinStatus.state !== "idle" && (
        <p className={`text-xs -mt-2 ${pinStatus.state === "error" ? "text-amber-700" : "text-steel"}`} data-testid="signup-pin-status">{pinStatus.message}</p>
      )}
      <div>
        <p className="field-label">You are a <span className="text-destructive">*</span></p>
        <RadioGroup value={f.category} onValueChange={(v) => setF((s) => ({ ...s, category: v }))} className="flex gap-6" data-testid="signup-category-group">
          <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="B2B" id="cat-b2b" data-testid="signup-category-business" /> Business</label>
          <label className="flex items-center gap-2 text-sm cursor-pointer"><RadioGroupItem value="B2C" id="cat-b2c" data-testid="signup-category-individual" /> Individual</label>
        </RadioGroup>
      </div>
      <PasswordField id="su-password" label="Create Password" value={f.password} onChange={set("password")} placeholder="Create a password" showRules autoComplete="new-password" testId="signup-password-input" />
      <PasswordField id="su-confirm" label="Confirm Password" value={f.confirm} onChange={set("confirm")} placeholder="Re-enter your password" autoComplete="new-password" testId="signup-confirm-password-input" />
      {error && <p className="text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-sm px-3 py-2" role="alert" data-testid="signup-error">{error}</p>}
      <button type="submit" disabled={busy} className="btn-navy w-full disabled:opacity-60" data-testid="signup-submit-button">
        {busy ? "Creating your account..." : "Create Account"}
      </button>
    </form>
  );
}
