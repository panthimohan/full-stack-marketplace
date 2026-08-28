import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { authApi } from "../../api/auth";
import { extractErrorMessage } from "../../api/client";
import { Spinner } from "../../components/ui/Spinner";
import { useToastStore } from "../../store/toastStore";

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const push = useToastStore((s) => s.push);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.confirmPasswordReset(token, password);
      push("Password reset successfully. Please log in.", "success");
      navigate("/login");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="container-page py-16 max-w-md mx-auto text-center">
        <p className="text-ink-700">Missing or invalid reset link.</p>
        <Link to="/forgot-password" className="btn-secondary mt-6 inline-flex">Request a new link</Link>
      </div>
    );
  }

  return (
    <div className="container-page py-16 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-8 text-center">Set a new password</h1>
      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        <div>
          <label className="label">New password</label>
          <input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">Confirm new password</label>
          <input className="input" type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button className="btn-primary w-full !py-2.5" disabled={loading}>
          {loading && <Spinner className="w-4 h-4" />} Reset password
        </button>
      </form>
    </div>
  );
}
