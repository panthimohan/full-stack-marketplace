import { Loader2 } from "lucide-react";
import clsx from "clsx";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx("animate-spin", className || "w-5 h-5")} />;
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Spinner className="w-8 h-8 text-brand-500" />
    </div>
  );
}
