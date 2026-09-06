import { useEffect, useRef, useState } from "react";
import { pincodeService } from "@/services/pincodeService";
import { getErrorMessage } from "@/utils/formatError";
import { isValidPin } from "@/utils/validators";

/** Looks up city/state whenever a valid 6-digit PIN is entered. Degrades gracefully if the service is down. */
export function usePincodeLookup(pin, onResult) {
  const [status, setStatus] = useState({ state: "idle", message: "" });
  const lastPin = useRef(null);

  useEffect(() => {
    if (!isValidPin(pin) || lastPin.current === pin) return;
    lastPin.current = pin;
    let active = true;
    setStatus({ state: "loading", message: "Looking up city & state..." });
    pincodeService
      .lookup(pin)
      .then((data) => {
        if (!active) return;
        onResult(data);
        setStatus({ state: "success", message: `Auto-filled from PIN ${pin}` });
      })
      .catch((error) => {
        if (!active) return;
        setStatus({ state: "error", message: getErrorMessage(error, "Could not auto-fill. Please enter city and state manually.") });
      });
    return () => {
      active = false;
    };
  }, [pin, onResult]);

  return status;
}
