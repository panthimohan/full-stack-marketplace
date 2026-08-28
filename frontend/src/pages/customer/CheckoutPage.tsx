import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import { Truck, Wallet } from "lucide-react";
import { useCart } from "../../features/cart/hooks";
import { useCheckout } from "../../features/orders/hooks";
import { FullPageSpinner } from "../../components/ui/Spinner";
import { Spinner } from "../../components/ui/Spinner";
import { formatMoney } from "../../utils/format";
import type { PaymentMethod } from "../../types";
import clsx from "clsx";

const schema = z.object({
  full_name: z.string().min(2, "Full name is required"),
  phone: z.string().min(7, "Enter a valid phone number"),
  address: z.string().min(5, "Address is required"),
  city: z.string().min(2, "City is required"),
  payment_method: z.enum(["COD", "ESEWA"]),
});
type FormData = z.infer<typeof schema>;

export default function CheckoutPage() {
  const { data: cart, isLoading } = useCart();
  const checkout = useCheckout();
  const navigate = useNavigate();
  const esewaFormRef = useRef<HTMLFormElement>(null);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { payment_method: "COD" },
  });
  const paymentMethod = watch("payment_method");

  useEffect(() => {
    if (!isLoading && (!cart || cart.items.length === 0)) {
      navigate("/cart");
    }
  }, [cart, isLoading, navigate]);

  const onSubmit = async (data: FormData) => {
    const res = await checkout.mutateAsync(data);
    if (data.payment_method === "COD") {
      navigate(`/account/orders/${res.data.order.id}`);
    } else if (res.data.esewa_payment_form) {
      // Auto-submit the signed form to eSewa's hosted checkout.
      sessionStorage.setItem("pending_order_id", res.data.order.id);
      const form = esewaFormRef.current!;
      form.action = res.data.esewa_payment_form.action_url;
      form.innerHTML = "";
      Object.entries(res.data.esewa_payment_form.fields).forEach(([key, value]) => {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = key;
        input.value = value;
        form.appendChild(input);
      });
      form.submit();
    }
  };

  if (isLoading) return <FullPageSpinner />;
  if (!cart) return null;

  return (
    <div className="container-page py-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>
      <form ref={esewaFormRef} method="POST" style={{ display: "none" }} />

      <div className="grid md:grid-cols-[1fr_320px] gap-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold mb-4">Shipping details</h2>
            <div className="space-y-3">
              <div>
                <label className="label">Full name</label>
                <input className="input" {...register("full_name")} />
                {errors.full_name && <p className="text-xs text-red-600 mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="label">Phone number</label>
                <input className="input" {...register("phone")} />
                {errors.phone && <p className="text-xs text-red-600 mt-1">{errors.phone.message}</p>}
              </div>
              <div>
                <label className="label">Address</label>
                <textarea className="input" rows={2} {...register("address")} />
                {errors.address && <p className="text-xs text-red-600 mt-1">{errors.address.message}</p>}
              </div>
              <div>
                <label className="label">City</label>
                <input className="input" {...register("city")} />
                {errors.city && <p className="text-xs text-red-600 mt-1">{errors.city.message}</p>}
              </div>
            </div>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-4">Payment method</h2>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { value: "COD", label: "Cash on Delivery", icon: <Truck className="w-5 h-5" /> },
                  { value: "ESEWA", label: "eSewa", icon: <Wallet className="w-5 h-5" /> },
                ] as { value: PaymentMethod; label: string; icon: React.ReactNode }[]
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setValue("payment_method", opt.value)}
                  className={clsx(
                    "flex flex-col items-center gap-2 p-4 rounded-lg border-2 text-sm font-medium transition-colors",
                    paymentMethod === opt.value ? "border-brand-500 bg-brand-50 text-brand-600" : "border-line text-ink-700"
                  )}
                >
                  {opt.icon} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button className="btn-primary w-full !py-3" disabled={checkout.isPending}>
            {checkout.isPending && <Spinner className="w-4 h-4" />}
            {paymentMethod === "COD" ? "Place order" : "Continue to eSewa"}
          </button>
        </form>

        <div className="card p-5 h-fit">
          <h2 className="font-semibold mb-4">Order summary</h2>
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {cart.items.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-ink-700/70 line-clamp-1 pr-2">{item.product_name} × {item.quantity}</span>
                <span className="font-medium shrink-0">{formatMoney(item.line_total)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm mb-2 pt-3 border-t border-line">
            <span className="text-ink-700/70">Subtotal</span>
            <span className="font-medium">{formatMoney(cart.subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm mb-4">
            <span className="text-ink-700/70">Shipping</span>
            <span className="font-medium text-brand-500">Free</span>
          </div>
          <div className="flex justify-between font-bold pt-3 border-t border-line">
            <span>Total</span>
            <span>{formatMoney(cart.subtotal)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
