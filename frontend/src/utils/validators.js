export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());
export const isValidPin = (v) => /^[1-9]\d{5}$/.test((v || "").trim());
export const digitsOnly = (v) => (v || "").replace(/\D/g, "");
export const isValidCountryCode = (cc) => /^\+\d{1,3}$/.test(cc || "");

export const mobileIssue = (cc, num) => {
  if (!num) return "Mobile number is required";
  if (!/^\d+$/.test(num)) return "Mobile number must contain digits only";
  if (cc === "+91" && !/^[6-9]\d{9}$/.test(num)) return "Please enter a valid 10-digit Indian mobile number";
  if (cc !== "+91" && (num.length < 6 || num.length > 14)) return "Please enter a valid mobile number (6-14 digits)";
  return "";
};

export const landlineIssue = (cc, num) => {
  if (!num) return "";
  if (!/^\d+$/.test(num)) return "Landline / other contact must contain digits only";
  const max = cc === "+91" ? 12 : 15;
  if (num.length < 6 || num.length > max) return `Please enter a valid landline / other contact number (6-${max} digits)`;
  return "";
};

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "letter", label: "Contains a letter", test: (p) => /[A-Za-z]/.test(p) },
  { id: "number", label: "Contains a number", test: (p) => /\d/.test(p) },
];

export const passwordIssues = (p) => PASSWORD_RULES.filter((r) => !r.test(p || ""));
