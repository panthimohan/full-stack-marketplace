import { Link } from "react-router-dom";
import { PackageOpen } from "lucide-react";
import { useVendorOrders } from "../../features/orders/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatMoney, formatDate } from "../../utils/format";

export default function VendorOrderListPage() {
  const { data, isLoading } = useVendorOrders();

  if (isLoading) return <FullPageSpinner />;

  if (!data || data.results.length === 0) {
    return <EmptyState icon={<PackageOpen className="w-12 h-12" />} title="No orders yet" description="Orders containing your products will show up here." />;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Orders</h1>
      <div className="space-y-3">
        {data.results.map((vo) => (
          <Link key={vo.id} to={`/vendor/orders/${vo.id}`} className="card p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm">{vo.order_number}</div>
              <div className="text-xs text-ink-700/50 mt-0.5">{formatDate(vo.created_at)} · {vo.customer_name}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone={statusTone(vo.status)}>{vo.status}</Badge>
              <div className="font-semibold text-sm w-24 text-right">{formatMoney(vo.subtotal)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
