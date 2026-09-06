import { useCallback, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, Pencil } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/auth/useAuth";
import { usePincodeLookup } from "@/hooks/usePincodeLookup";
import { getErrorMessage } from "@/utils/formatError";

const ROWS = [
  ["Customer No.", "customer_no"], ["Email", "email"], ["Mobile", "contact_mobile"], ["Landline", "contact_other"],
  ["Address", (u) => [u.address1, u.address2].filter(Boolean).join(", ")], ["City / State", (u) => [u.city, u.state].filter(Boolean).join(", ")],
  ["PIN Code", "pin"], ["You are a", (u) => (u.category === "B2B" ? "Business" : u.category === "B2C" ? "Individual" : "")],
  ["Sign-in method", (u) => (u.auth_provider === "google" ? "Google" : "Email & Password")],
];

export function UserProfile() {
  const { user, updateProfile } = useAuth();
  const [editing, setEditing] = useState(!user.profile_complete);
  const [f, setF] = useState({ name: user.name || "", contact_mobile: user.contact_mobile || "", contact_other: user.contact_other || "", address1: user.address1 || "", address2: user.address2 || "", city: user.city || "", state: user.state || "", pin: user.pin || "", category: user.category || "" });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const onPin = useCallback((d) => setF((s) => ({ ...s, city: d.city || s.city, state: d.state || s.state })), []);
  const pinStatus = usePincodeLookup(f.pin, onPin);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v === "" ? null : v])));
      toast.success("Profile updated");
      setEditing(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
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
            <p className="text-xs text-steel inline-flex items-center gap-1"><BadgeCheck className="h-3.5 w-3.5 text-navy" /> Verified customer · {user.customer_no}</p>
          </div>
        </div>
        {!editing && <button onClick={() => setEditing(true)} className="btn-outline !py-2 !px-4 text-sm" data-testid="profile-edit-button"><Pencil className="h-3.5 w-3.5" /> Edit</button>}
      </div>
      {!user.profile_complete && <p className="mt-5 text-sm rounded-sm bg-powder/30 border border-powder px-3 py-2 text-navy" data-testid="profile-incomplete-notice">Please complete your contact and address details so we can serve your future orders.</p>}

      {editing ? (
        <form onSubmit={save} className="mt-6 grid sm:grid-cols-2 gap-4" data-testid="profile-form">
          <div className="sm:col-span-2"><label className="field-label">Full Name</label><input value={f.name} onChange={set("name")} className="field-input" data-testid="profile-name-input" /></div>
          <div><label className="field-label">Mobile</label><input value={f.contact_mobile} onChange={set("contact_mobile")} className="field-input" data-testid="profile-mobile-input" /></div>
          <div><label className="field-label">Landline</label><input value={f.contact_other} onChange={set("contact_other")} className="field-input" data-testid="profile-landline-input" /></div>
          <div className="sm:col-span-2"><label className="field-label">Address Line 1</label><input value={f.address1} onChange={set("address1")} className="field-input" data-testid="profile-address1-input" /></div>
          <div className="sm:col-span-2"><label className="field-label">Address Line 2</label><input value={f.address2} onChange={set("address2")} className="field-input" data-testid="profile-address2-input" /></div>
          <div><label className="field-label">PIN Code</label><input value={f.pin} onChange={(e) => setF((s) => ({ ...s, pin: e.target.value.replace(/\D/g, "").slice(0, 6) }))} className="field-input" data-testid="profile-pin-input" />{pinStatus.state !== "idle" && <p className="text-xs text-steel mt-1">{pinStatus.message}</p>}</div>
          <div><label className="field-label">City</label><input value={f.city} onChange={set("city")} className="field-input" data-testid="profile-city-input" /></div>
          <div><label className="field-label">State</label><input value={f.state} onChange={set("state")} className="field-input" data-testid="profile-state-input" /></div>
          <div>
            <p className="field-label">You are a</p>
            <RadioGroup value={f.category} onValueChange={(v) => setF((s) => ({ ...s, category: v }))} className="flex gap-6 pt-2">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="B2B" data-testid="profile-category-business" /> Business</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="B2C" data-testid="profile-category-individual" /> Individual</label>
            </RadioGroup>
          </div>
          <div className="sm:col-span-2 flex gap-3 pt-2">
            <button type="submit" disabled={busy} className="btn-navy text-sm disabled:opacity-60" data-testid="profile-save-button">{busy ? "Saving..." : "Save Changes"}</button>
            {user.profile_complete && <button type="button" onClick={() => setEditing(false)} className="btn-outline text-sm" data-testid="profile-cancel-button">Cancel</button>}
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
