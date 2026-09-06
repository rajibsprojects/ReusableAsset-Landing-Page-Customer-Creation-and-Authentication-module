/**
 * Emergent-managed Google Auth provider. The only place that knows about Emergent.
 * Replace this module (same interface: start / extractSessionId) to switch providers.
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
 */
const AUTH_HOST = "https://auth.emergentagent.com/";

export const googleAuthProvider = {
  start() {
    const redirectUrl = window.location.origin + "/account";
    window.location.href = `${AUTH_HOST}?redirect=${encodeURIComponent(redirectUrl)}`;
  },
  extractSessionId(hash) {
    const match = (hash || "").match(/session_id=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  },
};
