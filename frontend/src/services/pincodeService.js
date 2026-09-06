import api from "./apiClient";

export const pincodeService = {
  lookup: (pin) => api.get(`/pincode/${pin}`).then((r) => r.data),
};
