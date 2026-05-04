import { Toaster as Sonner, type ToasterProps } from "sonner";

/**
 * Giao diện toast (màu, nền, viền) nằm trong `src/styles/sonner-toast.css`.
 */
export function Toaster({
  theme = "dark",
  richColors = true,
  ...props
}: ToasterProps) {
  return (
    <Sonner
      theme={theme}
      richColors={richColors}
      className="toaster group"
      toastOptions={{}}
      {...props}
    />
  );
}
