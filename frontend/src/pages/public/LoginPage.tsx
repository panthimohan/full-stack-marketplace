import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { extractErrorMessage } from "../../api/client";
import { Spinner } from "../../components/ui/Spinner";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema) });
  const setAuth = useAuthStore((s) => s.setAuth);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.login(data.email, data.password);
      setAuth(res.data.user, res.data.access, res.data.refresh);
      push(`Welcome back, ${res.data.user.first_name || res.data.user.email}!`, "success");
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname;
      const dashboardPath = res.data.user.role === "ADMIN" ? "/admin" : res.data.user.role === "VENDOR" ? "/vendor" : "/";
      navigate(from || dashboardPath);
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  };

  return (
    <div className="container-page py-16 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1 text-center">Welcome back</h1>
      <p className="text-ink-700/60 text-center mb-8">Log in to your Marketto account.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        <div>
          <div className="flex justify-between items-center mb-1.5">
            <label className="label !mb-0">Password</label>
            <Link to="/forgot-password" className="text-xs text-brand-500 font-medium">Forgot password?</Link>
          </div>
          <input className="input" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
        </div>
        <button className="btn-primary w-full !py-2.5" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="w-4 h-4" />} Log in
        </button>
      </form>
      <p className="text-center text-sm text-ink-700/70 mt-5">
        Don't have an account? <Link to="/register" className="text-brand-500 font-semibold">Sign up</Link>
      </p>
    </div>
  );
}
