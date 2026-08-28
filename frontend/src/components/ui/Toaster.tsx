import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useToastStore } from "../../store/toastStore";

const iconMap = {
  success: <CheckCircle2 className="w-5 h-5 text-brand-500" />,
  error: <XCircle className="w-5 h-5 text-red-500" />,
  info: <Info className="w-5 h-5 text-ink-700" />,
};

export function Toaster() {
  const { toasts, dismiss } = useToastStore();
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 w-full max-w-sm">
      {toasts.map((toast) => (
        <div key={toast.id} className="card flex items-start gap-3 p-3.5">
          {iconMap[toast.variant]}
          <p className="text-sm text-ink-900 flex-1">{toast.message}</p>
          <button onClick={() => dismiss(toast.id)} className="text-ink-700/50 hover:text-ink-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
