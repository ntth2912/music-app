import {
  toast as sonnerToast,
  type ExternalToast,
} from "sonner";

type Title = Parameters<typeof sonnerToast>[0];

export type ToastVariant = "success" | "error" | "info" | "warning" | "neutral";

export type NotifyOptions = {
  title: string;
  description: string;
  variant?: ToastVariant;
} & Omit<ExternalToast, "description">;

/**
 * Toast có đủ tiêu đề + mô tả (khuyến nghị dùng cho thông báo quan trọng).
 */
export function notify({
  title,
  description,
  variant = "neutral",
  ...rest
}: NotifyOptions) {
  const payload = { ...rest, description };
  switch (variant) {
    case "success":
      return sonnerToast.success(title, payload);
    case "error":
      return sonnerToast.error(title, payload);
    case "info":
      return sonnerToast.info(title, payload);
    case "warning":
      return sonnerToast.warning(title, payload);
    default:
      return sonnerToast(title, payload);
  }
}

/**
 * Thông báo nổi — sau khi đã có `<Toaster />` trong App.
 * Có thể gọi `toast.success('Tiêu đề', { description: '...' })` hoặc dùng `notify()`.
 */
export const toast = Object.assign(
  (message: Title, data?: ExternalToast) => sonnerToast(message, data),
  {
    success: (message: Title, data?: ExternalToast) =>
      sonnerToast.success(message, data),
    error: (message: Title, data?: ExternalToast) =>
      sonnerToast.error(message, data),
    info: (message: Title, data?: ExternalToast) =>
      sonnerToast.info(message, data),
    warning: (message: Title, data?: ExternalToast) =>
      sonnerToast.warning(message, data),
    message: (message: Title, data?: ExternalToast) =>
      sonnerToast.message(message, data),
    promise: sonnerToast.promise,
    dismiss: sonnerToast.dismiss,
    loading: sonnerToast.loading,
    custom: sonnerToast.custom,
    notify,
  },
);
