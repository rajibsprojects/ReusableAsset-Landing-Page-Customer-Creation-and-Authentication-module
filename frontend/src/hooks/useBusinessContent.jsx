import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { contentService } from "@/services/contentService";
import { DEFAULT_BUSINESS_CONTENT } from "@/data/defaultBusinessContent";

const BusinessContentContext = createContext(null);

export function BusinessContentProvider({ children }) {
  const [state, setState] = useState({ content: DEFAULT_BUSINESS_CONTENT, loading: true, error: null });

  useEffect(() => {
    let active = true;
    contentService
      .getBusinessContent()
      .then((data) => active && setState({ content: { ...DEFAULT_BUSINESS_CONTENT, ...data }, loading: false, error: null }))
      .catch((error) => active && setState({ content: DEFAULT_BUSINESS_CONTENT, loading: false, error }));
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(() => state, [state]);
  return <BusinessContentContext.Provider value={value}>{children}</BusinessContentContext.Provider>;
}

export const useBusinessContent = () => {
  const ctx = useContext(BusinessContentContext);
  if (!ctx) throw new Error("useBusinessContent must be used within BusinessContentProvider");
  return ctx;
};
