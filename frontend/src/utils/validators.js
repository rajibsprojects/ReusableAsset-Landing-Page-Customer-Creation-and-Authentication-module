export const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test((v || "").trim());
export const isValidPin = (v) => /^[1-9]\d{5}$/.test((v || "").trim());
export const isValidMobile = (v) => /^\+?\d{10,15}$/.test((v || "").replace(/[\s-]/g, ""));

export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p) => p.length >= 8 },
  { id: "letter", label: "Contains a letter", test: (p) => /[A-Za-z]/.test(p) },
  { id: "number", label: "Contains a number", test: (p) => /\d/.test(p) },
];

export const passwordIssues = (p) => PASSWORD_RULES.filter((r) => !r.test(p || ""));
