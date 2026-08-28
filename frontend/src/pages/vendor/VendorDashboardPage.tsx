import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { dashboardsApi } from "../../api/dashboards";
import { useMyVendorProfile } from "../../features/vendors/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatMoney, formatDate } from "../../utils/format";

interface VendorDashboardData {
  total_products: number;
  active_products: number;
  low_stock_products: number;
  out_of_stock_products: number;
  total_orders: number;
  pending_orders: number;
  total_sales: number;
  recent_orders: { order_number: string; status: string; subtotal: string; created_at: string }[];
}

export default function VendorDashboardPage() {
  const { data: vendor } = useMyVendorProfile();
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-dashboard"],
    queryFn: async () => (await dashboardsApi.vendor()).data as VendorDashboardData,
  });

  if (isLoading) return <FullPageSpinner />;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">{vendor?.shop_name}</h1>
        {vendor && <Badge tone={statusTone(vendor.status)}>{vendor.status}</Badge>}
      </div>
      {vendor?.status === "PENDING" && (
        <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 mb-4">
          Your shop is awaiting admin approval. You'll be able to add products once approved.
        </p>
      )}
      <p className="text-ink-700/60 mb-6">Here's how your shop is performing.</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total products", value: data?.total_products ?? 0 },
          { label: "Active products", value: data?.active_products ?? 0 },
          { label: "Low stock", value: data?.low_stock_products ?? 0 },
          { label: "Out of stock", value: data?.out_of_stock_products ?? 0 },
        ].map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-2xl font-display font-bold">{s.value}</div>
            <div className="text-sm text-ink-700/60 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-2xl font-display font-bold">{data?.total_orders ?? 0}</div>
          <div className="text-sm text-ink-700/60 mt-1">Total orders ({data?.pending_orders ?? 0} pending)</div>
        </div>
        <div className="card p-5">
          <div className="text-2xl font-display font-bold">{formatMoney(data?.total_sales ?? 0)}</div>
          <div className="text-sm text-ink-700/60 mt-1">Total sales (paid orders)</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Recent orders</h2>
        <Link to="/vendor/orders" className="text-sm text-brand-500 font-medium">View all</Link>
      </div>
      <div className="space-y-2">
        {data?.recent_orders.map((o) => (
          <div key={o.order_number} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{o.order_number}</div>
              <div className="text-xs text-ink-700/50">{formatDate(o.created_at)}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={statusTone(o.status)}>{o.status}</Badge>
              <span className="font-semibold text-sm">{formatMoney(o.subtotal)}</span>
            </div>
          </div>
        ))}
        {(!data || data.recent_orders.length === 0) && <p className="text-sm text-ink-700/60">No orders yet.</p>}
      </div>
    </div>
  );
}
