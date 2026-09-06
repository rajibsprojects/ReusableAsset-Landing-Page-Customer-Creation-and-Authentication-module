import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { PASSWORD_RULES } from "@/utils/validators";

export function PasswordField({ id, label, value, onChange, placeholder = "Enter your password", showRules = false, autoComplete = "current-password", testId }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <div className="relative">
        <input id={id} type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} className="field-input pr-11" data-testid={testId} required />
        <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-navy transition-colors" aria-label={show ? "Hide password" : "Show password"} data-testid={`${testId}-toggle`}>
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {showRules && value && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1" data-testid={`${testId}-rules`}>
          {PASSWORD_RULES.map((r) => (
            <li key={r.id} className={`text-[11px] ${r.test(value) ? "text-emerald-700" : "text-steel"}`}>
              {r.test(value) ? "✓" : "○"} {r.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
