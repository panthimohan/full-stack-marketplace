import { useState } from "react";
import { useAdminVendors, useUpdateVendorStatus } from "../../features/vendors/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatDate } from "../../utils/format";
import type { VendorStatus } from "../../types";

const FILTERS: { label: string; value: VendorStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Pending", value: "PENDING" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Suspended", value: "SUSPENDED" },
];

export default function AdminVendorListPage() {
  const [filter, setFilter] = useState<VendorStatus | "">("");
  const { data, isLoading } = useAdminVendors(filter ? { status: filter } : {});
  const updateStatus = useUpdateVendorStatus();

  const handleAction = (id: string, status: VendorStatus) => {
    let reason = "";
    if (status === "REJECTED" || status === "SUSPENDED") {
      reason = prompt(`Reason for ${status.toLowerCase()}ing this vendor (optional):`) || "";
    }
    updateStatus.mutate({ id, status, reason });
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Vendors</h1>

      <div className="flex gap-2 mb-5">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium ${filter === f.value ? "bg-brand-500 text-white" : "bg-white border border-line text-ink-700"}`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <FullPageSpinner />
      ) : (
        <div className="space-y-3">
          {data?.results.map((vendor) => (
            <div key={vendor.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold text-sm">{vendor.shop_name}</div>
                <div className="text-xs text-ink-700/50">{vendor.email} · {formatDate(vendor.created_at)}</div>
                {vendor.status_reason && <div className="text-xs text-ink-700/60 mt-1">Reason: {vendor.status_reason}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={statusTone(vendor.status)}>{vendor.status}</Badge>
                {vendor.status === "PENDING" && (
                  <>
                    <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => handleAction(vendor.id, "APPROVED")}>Approve</button>
                    <button className="btn-danger !py-1.5 !px-3 text-xs" onClick={() => handleAction(vendor.id, "REJECTED")}>Reject</button>
                  </>
                )}
                {vendor.status === "APPROVED" && (
                  <button className="btn-danger !py-1.5 !px-3 text-xs" onClick={() => handleAction(vendor.id, "SUSPENDED")}>Suspend</button>
                )}
                {(vendor.status === "SUSPENDED" || vendor.status === "REJECTED") && (
                  <button className="btn-primary !py-1.5 !px-3 text-xs" onClick={() => handleAction(vendor.id, "APPROVED")}>Reactivate</button>
                )}
              </div>
            </div>
          ))}
          {data?.results.length === 0 && <p className="text-sm text-ink-700/60">No vendors match this filter.</p>}
        </div>
      )}
    </div>
  );
}
