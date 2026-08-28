import { useQuery } from "@tanstack/react-query";
import { dashboardsApi } from "../../api/dashboards";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatMoney, formatDate } from "../../utils/format";

interface AdminDashboardData {
  total_customers: number;
  total_vendors: number;
  pending_vendors: number;
  total_products: number;
  total_orders: number;
  pending_orders: number;
  total_sales: number;
  recent_orders: { order_number: string; customer: string; total: string; status: string; created_at: string }[];
  recent_vendors: { shop_name: string; status: string; created_at: string }[];
}

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: async () => (await dashboardsApi.admin()).data as AdminDashboardData,
  });

  if (isLoading) return <FullPageSpinner />;

  const stats = [
    { label: "Customers", value: data?.total_customers },
    { label: "Vendors", value: data?.total_vendors },
    { label: "Pending vendors", value: data?.pending_vendors },
    { label: "Products", value: data?.total_products },
    { label: "Orders", value: data?.total_orders },
    { label: "Pending orders", value: data?.pending_orders },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Platform overview</h1>

      <div className="grid sm:grid-cols-3 gap-4 mb-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <div className="text-2xl font-display font-bold">{s.value ?? 0}</div>
            <div className="text-sm text-ink-700/60 mt-1">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="card p-5 mb-8">
        <div className="text-2xl font-display font-bold">{formatMoney(data?.total_sales ?? 0)}</div>
        <div className="text-sm text-ink-700/60 mt-1">Total sales (paid orders)</div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-3">Recent orders</h2>
          <div className="space-y-2">
            {data?.recent_orders.map((o) => (
              <div key={o.order_number} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{o.order_number}</div>
                  <div className="text-xs text-ink-700/50">{o.customer} · {formatDate(o.created_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(o.status)}>{o.status}</Badge>
                  <span className="font-semibold text-sm">{formatMoney(o.total)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-semibold mb-3">Recent vendors</h2>
          <div className="space-y-2">
            {data?.recent_vendors.map((v) => (
              <div key={v.shop_name} className="card p-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{v.shop_name}</div>
                  <div className="text-xs text-ink-700/50">{formatDate(v.created_at)}</div>
                </div>
                <Badge tone={statusTone(v.status)}>{v.status}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
