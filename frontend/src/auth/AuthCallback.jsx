import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "./useAuth";
import { authService } from "@/services/authService";
import { consumePostLoginRedirect } from "@/utils/redirect";
import { getErrorMessage } from "@/utils/formatError";
import { PageLoader } from "@/components/common/PageLoader";

export function AuthCallback() {
  const location = useLocation();
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const sessionId = authService.extractGoogleSessionId(location.hash);
    const run = async () => {
      try {
        const user = await authService.exchangeGoogleSession(sessionId);
        setUser(user);
        window.history.replaceState(null, "", location.pathname);
        if (!user.registration_complete) {
          toast.info("Welcome! Please complete your profile to finish registration.");
          navigate("/account", { replace: true });
          return;
        }
        navigate(consumePostLoginRedirect("/account"), { replace: true, state: { user } });
      } catch (error) {
        toast.error(getErrorMessage(error, "Google sign-in failed. Please try again."));
        window.history.replaceState(null, "", "/login");
        navigate("/login", { replace: true });
      }
    };
    run();
  }, [location, navigate, setUser]);

  return <PageLoader label="Completing your sign-in..." />;
}
