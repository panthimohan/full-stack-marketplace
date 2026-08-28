import { api } from "./client";
import type { PaginatedResponse, ProductListItem, ProductDetail, Category } from "../types";

export interface ProductQueryParams {
  search?: string;
  category?: string;
  vendor?: string;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  ordering?: string;
  page?: number;
  page_size?: number;
}

export const productsApi = {
  list: (params: ProductQueryParams) =>
    api.get<PaginatedResponse<ProductListItem>>("/products/", { params }),
  detail: (slug: string) => api.get<ProductDetail>(`/products/${slug}/`),
  categories: () => api.get<PaginatedResponse<Category>>("/categories/", { params: { page_size: 50 } }),

  // Vendor-scoped product management
  vendorList: (params: Record<string, unknown> = {}) =>
    api.get<PaginatedResponse<ProductDetail>>("/vendor/products/", { params }),
  vendorCreate: (payload: Record<string, unknown>) => api.post<ProductDetail>("/vendor/products/", payload),
  vendorUpdate: (id: string, payload: Record<string, unknown>) =>
    api.patch<ProductDetail>(`/vendor/products/${id}/`, payload),
  vendorDelete: (id: string) => api.delete(`/vendor/products/${id}/`),
  vendorUploadImage: (id: string, file: File) => {
    const form = new FormData();
    form.append("image", file);
    return api.post(`/vendor/products/${id}/images/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  vendorDeleteImage: (productId: string, imageId: string) =>
    api.delete(`/vendor/products/${productId}/images/${imageId}/`),

  // Admin
  adminList: (params: Record<string, unknown> = {}) =>
    api.get<PaginatedResponse<ProductDetail>>("/admin/products/", { params }),
  adminUpdate: (id: string, payload: Record<string, unknown>) =>
    api.patch<ProductDetail>(`/admin/products/${id}/`, payload),
};
