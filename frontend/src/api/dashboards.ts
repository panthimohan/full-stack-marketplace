import { api } from "./client";

export const dashboardsApi = {
  admin: () => api.get("/dashboard/admin/"),
  vendor: () => api.get("/dashboard/vendor/"),
  customer: () => api.get("/dashboard/customer/"),
};
