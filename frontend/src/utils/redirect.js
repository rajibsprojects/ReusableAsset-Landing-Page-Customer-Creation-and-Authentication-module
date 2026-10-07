const KEY = "madam.postLoginRedirect";

export const setPostLoginRedirect = (path) => {
  if (path && path.startsWith("/") && !path.startsWith("/login") && !path.startsWith("/signup")) {
    sessionStorage.setItem(KEY, path);
  }
};

export const peekPostLoginRedirect = () => sessionStorage.getItem(KEY);

const INTENT_KEY = "madam.googleIntent";
export const setGoogleIntent = (intent) => sessionStorage.setItem(INTENT_KEY, intent || "login");
export const consumeGoogleIntent = () => {
  const value = sessionStorage.getItem(INTENT_KEY);
  sessionStorage.removeItem(INTENT_KEY);
  return value || "login";
};

export const consumePostLoginRedirect = (fallback = "/account") => {
  const value = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return value || fallback;
};
