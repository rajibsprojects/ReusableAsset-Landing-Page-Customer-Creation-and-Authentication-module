const KEY = "madam.postLoginRedirect";

export const setPostLoginRedirect = (path) => {
  if (path && path.startsWith("/") && !path.startsWith("/login") && !path.startsWith("/signup")) {
    sessionStorage.setItem(KEY, path);
  }
};

export const peekPostLoginRedirect = () => sessionStorage.getItem(KEY);

export const consumePostLoginRedirect = (fallback = "/account") => {
  const value = sessionStorage.getItem(KEY);
  sessionStorage.removeItem(KEY);
  return value || fallback;
};
