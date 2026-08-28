import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartApi } from "../../api/cart";
import { extractErrorMessage } from "../../api/client";
import { useToastStore } from "../../store/toastStore";
import type { Cart } from "../../types";

const CART_KEY = ["cart"];

export function useCart(enabled = true) {
  return useQuery<Cart>({
    queryKey: CART_KEY,
    queryFn: async () => (await cartApi.get()).data,
    enabled,
    staleTime: 10_000,
  });
}

export function useAddToCart() {
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ productId, quantity }: { productId: string; quantity: number }) =>
      cartApi.addItem(productId, quantity),
    onSuccess: (res) => {
      qc.setQueryData(CART_KEY, res.data);
      push("Added to cart", "success");
    },
    onError: (err) => push(extractErrorMessage(err), "error"),
  });
}

export function useUpdateCartItem() {
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ itemId, quantity }: { itemId: string; quantity: number }) => cartApi.updateItem(itemId, quantity),
    onSuccess: (res) => qc.setQueryData(CART_KEY, res.data),
    onError: (err) => push(extractErrorMessage(err), "error"),
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: (itemId: string) => cartApi.removeItem(itemId),
    onSuccess: (res) => {
      qc.setQueryData(CART_KEY, res.data);
      push("Removed from cart", "info");
    },
    onError: (err) => push(extractErrorMessage(err), "error"),
  });
}

export function useClearCart() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => cartApi.clear(),
    onSuccess: (res) => qc.setQueryData(CART_KEY, res.data),
  });
}
