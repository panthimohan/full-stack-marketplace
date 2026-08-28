import clsx from "clsx";
import type { ReactNode } from "react";

const styles: Record<string, string> = {
  neutral: "bg-ink-900/6 text-ink-800",
  success: "bg-brand-50 text-brand-600",
  warning: "bg-amber-50 text-amber-700",
  danger: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-700",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof styles }) {
  return <span className={clsx("badge", styles[tone])}>{children}</span>;
}

export function statusTone(status: string): keyof typeof styles {
  const map: Record<string, keyof typeof styles> = {
    ACTIVE: "success", APPROVED: "success", PAID: "success", DELIVERED: "success", CONFIRMED: "success",
    PENDING: "warning", PROCESSING: "warning", OUT_OF_STOCK: "warning",
    REJECTED: "danger", SUSPENDED: "danger", FAILED: "danger", CANCELLED: "danger", INACTIVE: "danger",
    SHIPPED: "info", DRAFT: "neutral", REFUNDED: "info",
  };
  return map[status] || "neutral";
}
