import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ordersApi, type CheckoutPayload } from "../../api/orders";
import { extractErrorMessage } from "../../api/client";
import { useToastStore } from "../../store/toastStore";

export function useMyOrders(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["my-orders", params],
    queryFn: async () => (await ordersApi.myOrders(params)).data,
  });
}

export function useOrderDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: async () => (await ordersApi.myOrderDetail(id!)).data,
    enabled: !!id,
  });
}

export function useCheckout() {
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: (payload: CheckoutPayload) => ordersApi.checkout(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["cart"] });
      push("Order placed successfully!", "success");
    },
    onError: (err) => push(extractErrorMessage(err), "error"),
  });
}

export function useVendorOrders(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["vendor-orders", params],
    queryFn: async () => (await ordersApi.vendorOrders(params)).data,
  });
}

export function useVendorOrderDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["vendor-order", id],
    queryFn: async () => (await ordersApi.vendorOrderDetail(id!)).data,
    enabled: !!id,
  });
}

export function useUpdateVendorOrderStatus() {
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => ordersApi.vendorUpdateStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vendor-orders"] });
      qc.invalidateQueries({ queryKey: ["vendor-order"] });
      push("Order status updated", "success");
    },
    onError: (err) => push(extractErrorMessage(err), "error"),
  });
}

export function useAdminOrders(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: async () => (await ordersApi.adminOrders(params)).data,
  });
}
