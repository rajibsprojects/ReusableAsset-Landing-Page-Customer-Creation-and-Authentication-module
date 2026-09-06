const digits = (value) => (value || "").replace(/[^\d+]/g, "");

export const telLink = (phone) => (phone ? `tel:${digits(phone)}` : undefined);
export const mailtoLink = (email) => (email ? `mailto:${email.trim()}` : undefined);
export const whatsappLink = (number) => {
  const d = digits(number).replace(/^\+/, "");
  return d ? `https://wa.me/${d}` : undefined;
};
export const ensureHttp = (url) => {
  if (!url) return undefined;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
};
export const instagramHandle = (url) => {
  const m = (url || "").match(/instagram\.com\/([^/?#]+)/i);
  return m ? `@${m[1]}` : "";
};
