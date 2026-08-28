import { api } from "./client";
import type { Category, PaginatedResponse } from "../types";

export const categoriesApi = {
  list: (params: Record<string, unknown> = {}) => api.get<PaginatedResponse<Category>>("/categories/", { params }),
  create: (payload: Record<string, unknown>) => api.post<Category>("/categories/", payload),
  update: (slug: string, payload: Record<string, unknown>) => api.patch<Category>(`/categories/${slug}/`, payload),
  remove: (slug: string) => api.delete(`/categories/${slug}/`),
};
