import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { authApi } from "../../api/auth";
import { useAuthStore } from "../../store/authStore";
import { useToastStore } from "../../store/toastStore";
import { extractErrorMessage } from "../../api/client";
import { Spinner } from "../../components/ui/Spinner";
import clsx from "clsx";

const schema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    username: z.string().min(3, "Username must be at least 3 characters"),
    first_name: z.string().optional(),
    password: z.string().min(8, "Password must be at least 8 characters"),
    password_confirm: z.string(),
    role: z.enum(["CUSTOMER", "VENDOR"]),
    shop_name: z.string().optional(),
  })
  .refine((data) => data.password === data.password_confirm, {
    message: "Passwords do not match",
    path: ["password_confirm"],
  })
  .refine((data) => data.role !== "VENDOR" || !!data.shop_name, {
    message: "Shop name is required for vendor accounts",
    path: ["shop_name"],
  });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get("role") === "VENDOR" ? "VENDOR" : "CUSTOMER";
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { role: initialRole as "CUSTOMER" | "VENDOR" },
  });
  const role = watch("role");
  const setAuth = useAuthStore((s) => s.setAuth);
  const push = useToastStore((s) => s.push);
  const navigate = useNavigate();

  const onSubmit = async (data: FormData) => {
    try {
      const res = await authApi.register(data);
      setAuth(res.data.user, res.data.access, res.data.refresh);
      push(
        data.role === "VENDOR"
          ? "Account created! Your shop is pending admin approval."
          : "Account created successfully!",
        "success"
      );
      navigate(data.role === "VENDOR" ? "/vendor" : "/");
    } catch (err) {
      push(extractErrorMessage(err), "error");
    }
  };

  return (
    <div className="container-page py-16 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-1 text-center">Create your account</h1>
      <p className="text-ink-700/60 text-center mb-6">Join Marketto as a shopper or a vendor.</p>

      <div className="grid grid-cols-2 gap-2 mb-6">
        {(["CUSTOMER", "VENDOR"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setValue("role", r)}
            className={clsx(
              "py-2.5 rounded-lg text-sm font-semibold border transition-colors",
              role === r ? "bg-brand-500 text-white border-brand-500" : "bg-white text-ink-800 border-line"
            )}
          >
            {r === "CUSTOMER" ? "I want to shop" : "I want to sell"}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-4">
        <div>
          <label className="label">Full name</label>
          <input className="input" {...register("first_name")} />
        </div>
        <div>
          <label className="label">Username</label>
          <input className="input" {...register("username")} />
          {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username.message}</p>}
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" {...register("email")} />
          {errors.email && <p className="text-xs text-red-600 mt-1">{errors.email.message}</p>}
        </div>
        {role === "VENDOR" && (
          <div>
            <label className="label">Shop name</label>
            <input className="input" {...register("shop_name")} placeholder="e.g. TechHub Nepal" />
            {errors.shop_name && <p className="text-xs text-red-600 mt-1">{errors.shop_name.message}</p>}
          </div>
        )}
        <div>
          <label className="label">Password</label>
          <input className="input" type="password" {...register("password")} />
          {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>}
        </div>
        <div>
          <label className="label">Confirm password</label>
          <input className="input" type="password" {...register("password_confirm")} />
          {errors.password_confirm && <p className="text-xs text-red-600 mt-1">{errors.password_confirm.message}</p>}
        </div>
        <button className="btn-primary w-full !py-2.5" disabled={isSubmitting}>
          {isSubmitting && <Spinner className="w-4 h-4" />} Create account
        </button>
      </form>
      <p className="text-center text-sm text-ink-700/70 mt-5">
        Already have an account? <Link to="/login" className="text-brand-500 font-semibold">Log in</Link>
      </p>
    </div>
  );
}
