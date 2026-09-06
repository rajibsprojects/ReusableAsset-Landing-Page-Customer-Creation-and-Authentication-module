import api from "./apiClient";

export const contentService = {
  getBusinessContent: () => api.get("/content/business").then((r) => r.data),
};
