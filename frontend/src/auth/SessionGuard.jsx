import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import api from "@/services/apiClient";
import { authService } from "@/services/authService";
import { useAuth } from "./useAuth";

const IDLE_MINUTES = Number(process.env.REACT_APP_SESSION_IDLE_MINUTES) || 4;
const HEARTBEAT_MS = 60 * 1000;
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];
export const SESSION_EXPIRED_MESSAGE = "Your session has expired due to inactivity. Please log in again.";

/** Enforces the inactivity timeout on the client and reacts to server-side session expiry (401). */
export function SessionGuard() {
  const { isAuthenticated, setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const timer = useRef(null);
  const lastHeartbeat = useRef(Date.now());
  const authedRef = useRef(isAuthenticated);
  authedRef.current = isAuthenticated;

  useEffect(() => {
    if (!isAuthenticated) return undefined;

    const expire = async () => {
      try {
        await authService.logout();
      } catch {
        /* session may already be gone server-side */
      }
      setUser(null);
      toast.warning(SESSION_EXPIRED_MESSAGE, { duration: 8000 });
      navigate("/login", { replace: true, state: { from: `${location.pathname}${location.search}`, reason: "timeout" } });
    };

    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(expire, IDLE_MINUTES * 60 * 1000);
      if (Date.now() - lastHeartbeat.current > HEARTBEAT_MS) {
        lastHeartbeat.current = Date.now();
        authService.me().catch(() => {});
      }
    };

    reset();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, reset, { passive: true }));
    return () => {
      clearTimeout(timer.current);
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, reset));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, location.pathname]);

  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (error) => {
        const url = error.config?.url || "";
        const authEndpoint = url.includes("/auth/login") || url.includes("/auth/google/session") || url.includes("/auth/logout");
        if (error.response?.status === 401 && authedRef.current && !authEndpoint) {
          setUser(null);
          toast.warning(SESSION_EXPIRED_MESSAGE, { duration: 8000 });
          navigate("/login", { replace: true, state: { reason: "timeout" } });
        }
        return Promise.reject(error);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, [navigate, setUser]);

  return null;
}
