export function formatApiErrorDetail(detail) {
  if (detail == null) return "";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((e) => (e && typeof e.msg === "string" ? `${(e.loc || []).slice(-1)[0] || ""}: ${e.msg}`.replace(/^: /, "") : JSON.stringify(e)))
      .filter(Boolean)
      .join(" ");
  }
  if (detail && typeof detail.msg === "string") return detail.msg;
  return String(detail);
}

export function getErrorMessage(error, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.code === "ECONNABORTED") return "The request timed out. Please check your connection and try again.";
  if (error.message === "Network Error" || !error.response) return "Unable to reach the server. Please check your internet connection.";
  return formatApiErrorDetail(error.response?.data?.detail) || fallback;
}
