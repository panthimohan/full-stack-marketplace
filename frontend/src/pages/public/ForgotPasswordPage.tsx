import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api/auth";
import { extractErrorMessage } from "../../api/client";
import { Spinner } from "../../components/ui/Spinner";
import { MailCheck } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="container-page py-16 max-w-md mx-auto text-center">
        <MailCheck className="w-12 h-12 text-brand-500 mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Check your email</h1>
        <p className="text-ink-700/70">If an account exists for {email}, we've sent a link to reset your password.</p>
        <Link to="/login" className="btn-secondary mt-6 inline-flex">Back to login</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-16 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1 text-center">Reset your password</h1>
      <p className="text-ink-700/60 text-center mb-8">We'll email you a link to reset it.</p>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full !py-2.5" disabled={loading}>
          {loading && <Spinner className="w-4 h-4" />} Send reset link
        </button>
      </form>
    </div>
  );
}
