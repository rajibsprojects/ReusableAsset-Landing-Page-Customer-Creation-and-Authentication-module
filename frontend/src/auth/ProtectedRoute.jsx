import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./useAuth";
import { PageLoader } from "@/components/common/PageLoader";

/** Wrap any route that requires a signed-in customer. Sends guests to /login and back afterwards. */
export function ProtectedRoute({ children }) {
  const { loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) return <PageLoader />;
  if (!isAuthenticated) {
    const from = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to="/login" replace state={{ from }} />;
  }
  return children;
}
