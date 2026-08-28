import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart, useUpdateCartItem, useRemoveCartItem } from "../../features/cart/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { EmptyState } from "../../components/ui/EmptyState";
import { formatMoney } from "../../utils/format";

export default function CartPage() {
  const { data: cart, isLoading } = useCart();
  const updateItem = useUpdateCartItem();
  const removeItem = useRemoveCartItem();

  if (isLoading) return <FullPageSpinner />;

  if (!cart || cart.items.length === 0) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<ShoppingBag className="w-12 h-12" />}
          title="Your cart is empty"
          description="Browse the marketplace and add something you like."
          action={<Link to="/products" className="btn-primary">Start shopping</Link>}
        />
      </div>
    );
  }

  return (
    <div className="container-page py-8">
      <h1 className="text-2xl font-bold mb-6">Your cart</h1>
      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <div className="space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="card p-4 flex gap-4">
              <div className="w-20 h-20 rounded-lg bg-canvas shrink-0 overflow-hidden">
                {item.image && <img src={item.image} alt={item.product_name} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                <Link to={`/products/${item.product_slug}`} className="font-medium text-sm hover:text-brand-500 line-clamp-1">
                  {item.product_name}
                </Link>
                <div className="text-xs text-ink-700/50 mt-0.5">Sold by {item.vendor_name}</div>
                <div className="text-sm font-semibold mt-1">{formatMoney(item.unit_price)}</div>

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center border border-line rounded-lg">
                    <button
                      className="p-1.5"
                      onClick={() => updateItem.mutate({ itemId: item.id, quantity: Math.max(1, item.quantity - 1) })}
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm">{item.quantity}</span>
                    <button
                      className="p-1.5"
                      disabled={item.quantity >= item.stock_available}
                      onClick={() => updateItem.mutate({ itemId: item.id, quantity: item.quantity + 1 })}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <button onClick={() => removeItem.mutate(item.id)} className="text-red-500 hover:text-red-600 p-1.5">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="text-right font-semibold text-sm shrink-0">{formatMoney(item.line_total)}</div>
            </div>
          ))}
        </div>

        <div className="card p-5 h-fit sticky top-20">
          <h2 className="font-semibold mb-4">Order summary</h2>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-ink-700/70">Subtotal ({cart.item_count} items)</span>
            <span className="font-medium">{formatMoney(cart.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm mb-4 pb-4 border-b border-line">
            <span className="text-ink-700/70">Shipping</span>
            <span className="font-medium text-brand-500">Free</span>
          </div>
          <div className="flex justify-between font-bold mb-5">
            <span>Total</span>
            <span>{formatMoney(cart.subtotal)}</span>
          </div>
          <Link to="/checkout" className="btn-primary w-full !py-3">
            Proceed to checkout <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
