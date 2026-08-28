import { useParams } from "react-router-dom";
import { useOrderDetail } from "../../features/orders/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Badge, statusTone } from "../../components/ui/Badge";
import { formatMoney, formatDate } from "../../utils/format";

export default function OrderDetailPage() {
  const { id } = useParams();
  const { data: order, isLoading } = useOrderDetail(id);

  if (isLoading) return <FullPageSpinner />;
  if (!order) return <p>Order not found.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h1 className="text-xl font-bold">{order.order_number}</h1>
        <Badge tone={statusTone(order.payment_status)}>{order.payment_status}</Badge>
      </div>
      <p className="text-sm text-ink-700/60 mb-6">Placed on {formatDate(order.created_at)}</p>

      <div className="grid md:grid-cols-[1fr_280px] gap-6">
        <div className="space-y-4">
          {order.vendor_orders.map((vo) => (
            <div key={vo.id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="font-semibold text-sm">{vo.vendor_name}</div>
                <Badge tone={statusTone(vo.status)}>{vo.status}</Badge>
              </div>
              <div className="space-y-2">
                {vo.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span className="text-ink-700">{item.product_name} × {item.quantity}</span>
                    <span className="font-medium">{formatMoney(item.line_subtotal)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-sm font-semibold mt-3 pt-3 border-t border-line">
                <span>Vendor subtotal</span>
                <span>{formatMoney(vo.subtotal)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="card p-4">
            <h2 className="font-semibold text-sm mb-3">Shipping to</h2>
            <p className="text-sm text-ink-700">{order.shipping_full_name}</p>
            <p className="text-sm text-ink-700">{order.shipping_phone}</p>
            <p className="text-sm text-ink-700">{order.shipping_address}, {order.shipping_city}</p>
          </div>
          <div className="card p-4">
            <h2 className="font-semibold text-sm mb-3">Payment</h2>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-ink-700/70">Method</span>
              <span className="font-medium">{order.payment_method}</span>
            </div>
            <div className="flex justify-between text-sm mb-3">
              <span className="text-ink-700/70">Subtotal</span>
              <span className="font-medium">{formatMoney(order.subtotal)}</span>
            </div>
            <div className="flex justify-between font-bold pt-3 border-t border-line">
              <span>Total</span>
              <span>{formatMoney(order.total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
