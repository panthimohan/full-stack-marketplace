import { api } from "./client";
import type { Cart } from "../types";

export const cartApi = {
  get: () => api.get<Cart>("/cart/"),
  addItem: (product_id: string, quantity: number) => api.post<Cart>("/cart/items/", { product_id, quantity }),
  updateItem: (itemId: string, quantity: number) => api.patch<Cart>(`/cart/items/${itemId}/`, { quantity }),
  removeItem: (itemId: string) => api.delete<Cart>(`/cart/items/${itemId}/`),
  clear: () => api.delete<Cart>("/cart/"),
};
