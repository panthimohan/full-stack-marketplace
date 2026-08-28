import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vendorsApi } from "../../api/vendors";
import { extractErrorMessage } from "../../api/client";
import { useToastStore } from "../../store/toastStore";

export function usePublicVendors(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["public-vendors", params],
    queryFn: async () => (await vendorsApi.publicList(params)).data,
  });
}

export function usePublicVendor(slug: string | undefined) {
  return useQuery({
    queryKey: ["public-vendor", slug],
    queryFn: async () => (await vendorsApi.publicDetail(slug!)).data,
    enabled: !!slug,
  });
}

export function useMyVendorProfile() {
  return useQuery({
    queryKey: ["my-vendor-profile"],
    queryFn: async () => (await vendorsApi.me()).data,
  });
}

export function useUpdateMyVendorProfile() {
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => vendorsApi.updateMe(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-vendor-profile"] });
      push("Shop profile updated", "success");
    },
    onError: (err) => push(extractErrorMessage(err), "error"),
  });
}

export function useAdminVendors(params: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: ["admin-vendors", params],
    queryFn: async () => (await vendorsApi.adminList(params)).data,
  });
}

export function useUpdateVendorStatus() {
  const qc = useQueryClient();
  const push = useToastStore((s) => s.push);
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      vendorsApi.adminUpdateStatus(id, status, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-vendors"] });
      push("Vendor status updated", "success");
    },
    onError: (err) => push(extractErrorMessage(err), "error"),
  });
}
