import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";
import { useMyOrders } from "../../features/orders/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatMoney, formatDate } from "../../utils/format";

export default function OrderHistoryPage() {
  const { data, isLoading } = useMyOrders();

  if (isLoading) return <FullPageSpinner />;

  if (!data || data.results.length === 0) {
    return (
      <EmptyState
        icon={<PackageOpen className="w-12 h-12" />}
        title="No orders yet"
        description="Your order history will show up here once you've made a purchase."
        action={<Link to="/products" className="btn-primary">Start shopping</Link>}
      />
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Order history</h1>
      <div className="space-y-3">
        {data.results.map((order) => (
          <Link key={order.id} to={`/account/orders/${order.id}`} className="card p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">{order.order_number}</div>
              <div className="text-xs text-ink-700/50 mt-0.5">{formatDate(order.created_at)} · {order.vendor_orders.length} vendor(s)</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge>
              <Badge tone={statusTone(order.overall_status)}>{order.overall_status}</Badge>
              <div className="font-semibold text-sm w-24 text-right">{formatMoney(order.total)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
