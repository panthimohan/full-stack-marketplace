import { api } from "./client";
import type { PaginatedResponse, Vendor, VendorPublic } from "../types";

export const vendorsApi = {
  publicList: (params: Record<string, unknown> = {}) =>
    api.get<PaginatedResponse<VendorPublic>>("/vendors/", { params }),
  publicDetail: (slug: string) => api.get<VendorPublic>(`/vendors/${slug}/`),

  me: () => api.get<Vendor>("/vendor/me/"),
  updateMe: (payload: Partial<Vendor>) => api.patch<Vendor>("/vendor/me/", payload),

  adminList: (params: Record<string, unknown> = {}) => api.get<PaginatedResponse<Vendor>>("/admin/vendors/", { params }),
  adminDetail: (id: string) => api.get<Vendor>(`/admin/vendors/${id}/`),
  adminUpdateStatus: (id: string, status: string, reason?: string) =>
    api.post<Vendor>(`/admin/vendors/${id}/status/`, { status, reason }),
};
