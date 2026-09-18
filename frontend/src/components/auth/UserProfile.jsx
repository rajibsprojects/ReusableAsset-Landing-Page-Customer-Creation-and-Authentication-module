import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BadgeCheck, Pencil } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/auth/useAuth";
import { usePincodeLookup } from "@/hooks/usePincodeLookup";
import { getErrorMessage } from "@/utils/formatError";
import { isValidPin, mobileIssue, landlineIssue } from "@/utils/validators";
import { DEFAULT_COUNTRY_CODE } from "@/data/countryCodes";
import { consumePostLoginRedirect } from "@/utils/redirect";
import { PhoneInput } from "./PhoneInput";

const phone = (cc, num) => (num ? `${cc || ""} ${num}`.trim() : "");
const ROWS = [
  ["Customer No.", (u) => u.customer_no || "Pending profile completion"], ["Email", "email"],
  ["Mobile", (u) => phone(u.contact_mobile_cntry, u.contact_mobile)], ["Landline / Other", (u) => phone(u.contact_other_cntry, u.contact_other)],
  ["Address", (u) => [u.address1, u.address2].filter(Boolean).join(", ")], ["City / State", (u) => [u.city, u.state].filter(Boolean).join(", ")],
  ["PIN Code", "pin"], ["You are a", (u) => (u.category === "B2B" ? "Business" : u.category === "B2C" ? "Individual" : "")],
  ["Sign-in method", (u) => (u.auth_provider === "google" ? "Google" : "Email & Password")],
  ["Registered on", "created_at"], ["Last updated", "updated_at"],
];

export function UserProfile() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(!user.registration_complete || !user.profile_complete);
  const [f, setF] = useState({ name: user.name || "", contact_mobile_cntry: user.contact_mobile_cntry || DEFAULT_COUNTRY_CODE, contact_mobile: user.contact_mobile || "", contact_other_cntry: user.contact_other_cntry || DEFAULT_COUNTRY_CODE, contact_other: user.contact_other || "", address1: user.address1 || "", address2: user.address2 || "", city: user.city || "", state: user.state || "", pin: user.pin || "", category: user.category || "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setVal = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const onPin = useCallback((d) => setF((s) => ({ ...s, city: d.city || s.city, state: d.state || s.state })), []);
  const pinStatus = usePincodeLookup(f.pin, onPin);

  const validate = () => {
    if (f.name.trim().length < 2) return "Please enter your full name";
    const m = mobileIssue(f.contact_mobile_cntry, f.contact_mobile);
    if (m) return m;
    const l = landlineIssue(f.contact_other_cntry, f.contact_other);
    if (l) return l;
    if (f.address1.trim().length < 3) return "Please enter your address";
    if (!isValidPin(f.pin)) return "Please enter a valid 6-digit PIN code";
    if (!f.city.trim() || !f.state.trim()) return "Please enter your city and state";
    if (!f.category) return "Please tell us whether you are a Business or an Individual";
    return "";
  };

  const save = async (e) => {
    e.preventDefault();
    const v = validate();
    setError(v);
    if (v) return;
    setBusy(true);
    try {
      const wasIncomplete = !user.registration_complete;
      const payload = Object.fromEntries(Object.entries(f).map(([k, v2]) => [k, v2 === "" ? null : v2]));
      if (!f.contact_other) payload.contact_other_cntry = null;
      const updated = await updateProfile(payload);
      setEditing(false);
      if (wasIncomplete && updated.registration_complete) {
        toast.success(`Registration complete! Your customer number is ${updated.customer_no}.`);
        navigate(consumePostLoginRedirect("/account"), { replace: true });
      } else {
        toast.success("Profile updated");
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-cream p-6 sm:p-8" data-testid="user-profile">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.picture ? <img src={user.picture} alt="" className="h-14 w-14 rounded-full object-cover" /> : <span className="h-14 w-14 rounded-full bg-navy text-white inline-flex items-center justify-center font-heading text-xl">{user.name?.[0]}</span>}
          <div>
            <h2 className="heading-serif text-2xl" data-testid="profile-name">{user.name}</h2>
            <p className="text-xs text-steel inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-navy" /> {user.registration_complete ? `Verified customer · ${user.customer_no}` : "Registration pending"}</p>
          </div>
        </div>
        {!editing && <button onClick={() => setEditing(true)} className="btn-outline !py-2 !px-4 text-sm" data-testid="profile-edit-button"><Pencil className="h-3.5 w-3.5" /> Edit</button>}
      </div>
      {!user.registration_complete && <p className="mt-5 text-sm rounded-sm bg-powder/30 border border-powder px-3 py-2 text-navy" data-testid="profile-incomplete-notice">Complete Your Profile: please provide your contact and address details to finish registration. Your customer number will be allocated once these are saved.</p>}

      {editing ? (
        <form onSubmit={save} className="mt-6 grid sm:grid-cols-2 gap-4" data-testid="profile-form" noValidate>
          <div className="sm:col-span-2"><label className="field-label">Full Name <span className="text-destructive">*</span></label><input value={f.name} onChange={set("name")} className="field-input" data-testid="profile-name-input" /></div>
          <div><label className="field-label">Mobile Contact <span className="text-destructive">*</span></label><PhoneInput countryCode={f.contact_mobile_cntry} number={f.contact_mobile} onCountryChange={setVal("contact_mobile_cntry")} onNumberChange={setVal("contact_mobile")} placeholder="9890788742" maxLength={14} testId="profile-mobile-input" /></div>
          <div><label className="field-label">Other Contact / Landline</label><PhoneInput countryCode={f.contact_other_cntry} number={f.contact_other} onCountryChange={setVal("contact_other_cntry")} onNumberChange={setVal("contact_other")} placeholder="03312345678" maxLength={15} testId="profile-landline-input" /></div>
          <div className="sm:col-span-2"><label className="field-label">Address Line 1 <span className="text-destructive">*</span></label><input value={f.address1} onChange={set("address1")} className="field-input" data-testid="profile-address1-input" /></div>
          <div className="sm:col-span-2"><label className="field-label">Address Line 2</label><input value={f.address2} onChange={set("address2")} className="field-input" data-testid="profile-address2-input" /></div>
          <div><label className="field-label">PIN Code <span className="text-destructive">*</span></label><input value={f.pin} onChange={(e) => setF((s) => ({ ...s, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className="field-input" data-testid="profile-pin-input" />{pinStatus.state !== "idle" && <p className="text-xs text-steel mt-1">{pinStatus.message}</p>}</div>
          <div><label className="field-label">City <span className="text-destructive">*</span></label><input value={f.city} onChange={set("city")} className="field-input" data-testid="profile-city-input" /></div>
          <div><label className="field-label">State <span className="text-destructive">*</span></label><input value={f.state} onChange={set("state")} className="field-input" data-testid="profile-state-input" /></div>
          <div>
            <p className="field-label">You are a <span className="text-destructive">*</span></p>
            <RadioGroup value={f.category} onValueChange={(v) => setF((s) => ({ ...s, category: v }))} className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="B2B" data-testid="profile-category-business" /> Business</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="B2C" data-testid="profile-category-individual" /> Individual</label>
            </RadioGroup>
          </div>
          {error && <p className="sm:col-span-2 text-sm text-destructive bg-destructive/5 border border-destructive/20 rounded-sm px-3 py-2" role="alert" data-testid="profile-error">{error}</p>}
          <div className="sm:col-span-2 flex gap-3 pt-2">
            <button type="submit" disabled={busy} className="btn-navy text-sm disabled:opacity-60" data-testid="profile-save-button">{busy ? "Saving..." : user.registration_complete ? "Save Changes" : "Complete Registration"}</button>
            {user.registration_complete && <button type="button" onClick={() => setEditing(false)} className="btn-outline text-sm" data-testid="profile-cancel-button">Cancel</button>}
          </div>
        </form>
      ) : (
        <dl className="mt-6 grid sm:grid-cols-2 gap-x-8 gap-y-4 text-sm" data-testid="profile-details">
          {ROWS.map(([label, key]) => {
            const value = typeof key === "function" ? key(user) : user[key];
            return (
              <div key={label} className="border-b border-bluegrey pb-2">
                <dt className="text-xs uppercase tracking-wider text-steel">{label}</dt>
                <dd className="text-ink mt-0.5 break-words">{value || "—"}</dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
}
