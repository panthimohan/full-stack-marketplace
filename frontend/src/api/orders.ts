import { api } from "./client";
import type { Order, PaginatedResponse, VendorOrder, PaymentMethod } from "../types";

export interface CheckoutPayload {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  payment_method: PaymentMethod;
}

export interface EsewaPaymentForm {
  action_url: string;
  fields: Record<string, string>;
}

export const ordersApi = {
  checkout: (payload: CheckoutPayload) =>
    api.post<{ order: Order; esewa_payment_form?: EsewaPaymentForm }>("/checkout/", payload),

  myOrders: (params: Record<string, unknown> = {}) => api.get<PaginatedResponse<Order>>("/orders/", { params }),
  myOrderDetail: (id: string) => api.get<Order>(`/orders/${id}/`),

  vendorOrders: (params: Record<string, unknown> = {}) =>
    api.get<PaginatedResponse<VendorOrder>>("/vendor/orders/", { params }),
  vendorOrderDetail: (id: string) => api.get<VendorOrder>(`/vendor/orders/${id}/`),
  vendorUpdateStatus: (id: string, status: string) =>
    api.post<VendorOrder>(`/vendor/orders/${id}/status/`, { status }),

  adminOrders: (params: Record<string, unknown> = {}) => api.get<PaginatedResponse<Order>>("/admin/orders/", { params }),

  paymentStatus: (transactionUuid: string) => api.get(`/payments/${transactionUuid}/status/`),
};
