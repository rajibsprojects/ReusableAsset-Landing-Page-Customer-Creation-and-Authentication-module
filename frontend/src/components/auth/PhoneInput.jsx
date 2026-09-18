import { COUNTRY_CODES } from "@/data/countryCodes";
import { digitsOnly } from "@/utils/validators";

/** Country-code dropdown + digits-only number input. Values are kept separate (never combined). */
export function PhoneInput({ id, countryCode, number, onCountryChange, onNumberChange, placeholder, maxLength = 15, testId, required }) {
  return (
    <div className="flex gap-2">
      <select
        value={countryCode}
        onChange={(e) => onCountryChange(e.target.value)}
        className="field-input !w-[92px] shrink-0 px-2 cursor-pointer"
        aria-label="Country code"
        data-testid={`${testId}-country`}
      >
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code}>{c.code} {c.iso}</option>
        ))}
      </select>
      <input
        id={id}
        value={number}
        onChange={(e) => onNumberChange(digitsOnly(e.target.value).slice(0, maxLength))}
        className="field-input"
        placeholder={placeholder}
        inputMode="numeric"
        autoComplete="tel-national"
        required={required}
        data-testid={testId}
      />
    </div>
  );
}
