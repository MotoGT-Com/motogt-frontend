import { useEffect, useState } from "react";
import { useSonner, type ToastT } from "sonner";
import { cn } from "~/lib/utils";

export function HeaderToast() {
  const sonnerData = useSonner();
  const toast = sonnerData.toasts[0];
  const [delayedToast, setDelayedToast] = useState<ToastT | null>(null);
  const toastAction = (
    delayedToast as (ToastT & {
      action?: { label?: React.ReactNode; onClick?: () => void };
    }) | null
  )?.action;
  const toastContent =
    delayedToast?.title ??
    delayedToast?.description ??
    delayedToast?.jsx ??
    (delayedToast as { message?: React.ReactNode } | null)?.message ??
    null;
  useEffect(() => {
    if (toast) {
      setDelayedToast(toast);
    }
    if (!toast) {
      setTimeout(() => {
        setDelayedToast(null);
      }, 700);
    }
  }, [toast]);

  const toastTypeClass =
    delayedToast?.type === "success"
      ? "bg-green-600"
      : delayedToast?.type === "error"
        ? "bg-primary"
        : delayedToast?.type === "warning"
          ? "bg-amber-600"
          : delayedToast?.type === "info"
            ? "bg-blue-600"
            : delayedToast?.type === "loading"
              ? "bg-black"
              : "bg-primary";

  return (
    <div
      className={cn(
        "fixed w-full top-0 z-60 text-white flex items-center justify-center text-center p-5 text-sm -translate-y-full transition-transform duration-700 font-medium",
        toast ? "translate-y-0" : "-translate-y-full",
        toastTypeClass
      )}
    >
      <div className="flex items-center justify-center gap-3">
        {toastContent instanceof Function ? toastContent() : toastContent}
        {toastAction?.label ? (
          <button
            type="button"
            onClick={toastAction.onClick}
            className="rounded-sm border border-white/70 px-2 py-1 text-xs font-semibold hover:bg-white/10 transition-colors"
          >
            {toastAction.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
