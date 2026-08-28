import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { dashboardsApi } from "../../api/dashboards";
import { useAuthStore } from "../../store/authStore";
import { formatMoney, formatDate } from "../../utils/format";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Badge, statusTone } from "../../components/ui/Badge";

interface CustomerDashboardData {
  total_orders: number;
  pending_orders: number;
  recent_orders: { order_number: string; total: string; payment_status: string; created_at: string }[];
}

export default function AccountDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ["customer-dashboard"],
    queryFn: async () => (await dashboardsApi.customer()).data as CustomerDashboardData,
  });

  if (isLoading) return <FullPageSpinner />;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Welcome back, {user?.first_name || user?.username}</h1>
      <p className="text-ink-700/60 mb-6">Here's a summary of your account.</p>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        <div className="card p-5">
          <div className="text-3xl font-display font-bold">{data?.total_orders ?? 0}</div>
          <div className="text-sm text-ink-700/60 mt-1">Total orders</div>
        </div>
        <div className="card p-5">
          <div className="text-3xl font-display font-bold">{data?.pending_orders ?? 0}</div>
          <div className="text-sm text-ink-700/60 mt-1">Pending orders</div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Recent orders</h2>
        <Link to="/account/orders" className="text-sm text-brand-500 font-medium">View all</Link>
      </div>
      <div className="space-y-2">
        {data?.recent_orders.map((o) => (
          <div key={o.order_number} className="card p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">{o.order_number}</div>
              <div className="text-xs text-ink-700/50">{formatDate(o.created_at)}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={statusTone(o.payment_status)}>{o.payment_status}</Badge>
              <span className="font-semibold text-sm">{formatMoney(o.total)}</span>
            </div>
          </div>
        ))}
        {(!data || data.recent_orders.length === 0) && <p className="text-sm text-ink-700/60">No orders yet.</p>}
      </div>
    </div>
  );
}
