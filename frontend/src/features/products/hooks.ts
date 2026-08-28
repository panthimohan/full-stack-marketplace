import { useQuery } from "@tanstack/react-query";
import { productsApi, type ProductQueryParams } from "../../api/products";
import { categoriesApi } from "../../api/categories";

export function useProducts(params: ProductQueryParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: async () => (await productsApi.list(params)).data,
    placeholderData: (prev) => prev,
  });
}

export function useProduct(slug: string | undefined) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: async () => (await productsApi.detail(slug!)).data,
    enabled: !!slug,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: async () => (await categoriesApi.list({ page_size: 50 })).data.results,
    staleTime: 5 * 60_000,
  });
}

export function useVendorProducts(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["vendor-products", params],
    queryFn: async () => (await productsApi.vendorList(params)).data,
    placeholderData: (prev) => prev,
  });
}
