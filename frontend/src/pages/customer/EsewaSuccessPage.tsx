import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { api } from "../../api/client";

/**
 * eSewa redirects here with a base64 `data` query param after payment.
 * We forward it to our backend, which independently verifies the signature
 * AND calls eSewa's status-check API before trusting it — see
 * apps/payments/services/esewa.py on the backend.
 */
export default function EsewaSuccessPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  useEffect(() => {
    const data = params.get("data");
    if (!data) {
      setStatus("failed");
      return;
    }
    api
      .post("/payments/esewa/callback/", { data })
      .then((res) => {
        setStatus(res.data.status === "PAID" ? "success" : "failed");
      })
      .catch(() => setStatus("failed"));
  }, [params]);

  return (
    <div className="container-page py-20 max-w-md mx-auto text-center">
      {status === "loading" && (
        <>
          <Loader2 className="w-12 h-12 text-brand-500 mx-auto mb-4 animate-spin" />
          <h1 className="text-xl font-bold">Verifying your payment...</h1>
          <p className="text-ink-700/60 mt-2">Please don't close this window.</p>
        </>
      )}
      {status === "success" && (
        <>
          <CheckCircle2 className="w-12 h-12 text-brand-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold">Payment successful!</h1>
          <p className="text-ink-700/60 mt-2">Your order has been confirmed.</p>
          <Link to="/account/orders" className="btn-primary mt-6 inline-flex">View my orders</Link>
        </>
      )}
      {status === "failed" && (
        <>
          <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold">Payment verification failed</h1>
          <p className="text-ink-700/60 mt-2">Your order was not confirmed. Any reserved stock has been released.</p>
          <button className="btn-secondary mt-6" onClick={() => navigate("/cart")}>Back to cart</button>
        </>
      )}
    </div>
  );
}
