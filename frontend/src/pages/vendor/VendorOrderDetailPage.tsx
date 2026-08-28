import { useParams } from "react-router-dom";
import { useVendorOrderDetail, useUpdateVendorOrderStatus } from "../../features/orders/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatMoney, formatDate } from "../../utils/format";
import type { VendorOrderStatus } from "../../types";

const NEXT_STATUSES: Record<string, VendorOrderStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function VendorOrderDetailPage() {
  const { id } = useParams();
  const { data: order, isLoading } = useVendorOrderDetail(id);
  const updateStatus = useUpdateVendorOrderStatus();

  if (isLoading) return <FullPageSpinner />;
  if (!order) return <p>Order not found.</p>;

  const nextOptions = NEXT_STATUSES[order.status] || [];

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">{order.order_number}</h1>
        <Badge tone={statusTone(order.status)}>{order.status}</Badge>
      </div>
      <p className="text-sm text-ink-700/60 mb-6">Placed on {formatDate(order.created_at)} by {order.customer_name}</p>

      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-3">Items</h2>
        <div className="space-y-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span className="text-ink-700">{item.product_name} × {item.quantity}</span>
              <span className="font-medium">{formatMoney(item.line_subtotal)}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-between font-semibold text-sm mt-3 pt-3 border-t border-line">
          <span>Subtotal</span>
          <span>{formatMoney(order.subtotal)}</span>
        </div>
      </div>

      <div className="card p-4 mb-4">
        <h2 className="font-semibold text-sm mb-2">Payment</h2>
        <div className="flex justify-between text-sm">
          <span className="text-ink-700/70">Method</span>
          <span className="font-medium">{order.payment_method}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-ink-700/70">Status</span>
          <Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge>
        </div>
      </div>

      {nextOptions.length > 0 && (
        <div className="card p-4">
          <h2 className="font-semibold text-sm mb-3">Update status</h2>
          <div className="flex flex-wrap gap-2">
            {nextOptions.map((s) => (
              <button
                key={s}
                className="btn-secondary"
                disabled={updateStatus.isPending}
                onClick={() => updateStatus.mutate({ id: order.id, status: s })}
              >
                Mark as {s.toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
