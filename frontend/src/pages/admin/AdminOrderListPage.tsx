import { useState } from "react";
import { useAdminOrders } from "../../features/orders/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatMoney, formatDate } from "../../utils/format";

export default function AdminOrderListPage() {
  const [paymentStatus, setPaymentStatus] = useState("");
  const { data, isLoading } = useAdminOrders(paymentStatus ? { payment_status: paymentStatus } : {});

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">All orders</h1>
        <select className="input !w-auto" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}>
          <option value="">All payment statuses</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="FAILED">Failed</option>
          <option value="REFUNDED">Refunded</option>
        </select>
      </div>

      {isLoading ? <FullPageSpinner /> : (
        <div className="space-y-3">
          {data?.results.map((order) => (
            <div key={order.id} className="card p-4 flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold text-sm">{order.order_number}</div>
                <div className="text-xs text-ink-700/50">{formatDate(order.created_at)} · {order.vendor_orders.length} vendor(s)</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge>
                <Badge tone={statusTone(order.overall_status)}>{order.overall_status}</Badge>
                <span className="font-semibold text-sm w-24 text-right">{formatMoney(order.total)}</span>
              </div>
            </div>
          ))}
          {data?.results.length === 0 && <p className="text-sm text-ink-700/60">No orders found.</p>}
        </div>
      )}
    </div>
  );
}
