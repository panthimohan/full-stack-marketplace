import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";

export default function EsewaFailurePage() {
  return (
    <div className="container-page py-20 max-w-md mx-auto text-center">
      <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h1 className="text-xl font-bold">Payment was not completed</h1>
      <p className="text-ink-700/60 mt-2">You cancelled or the eSewa payment did not go through. No charge was made.</p>
      <Link to="/cart" className="btn-primary mt-6 inline-flex">Back to cart</Link>
    </div>
  );
}
