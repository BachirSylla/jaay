import { MessageCircle } from "lucide-react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { whatsappDigits } from "@/lib/phone";

type WhatsAppLinkProps = {
  phone: string;
  label: string;
  message?: string;
  size?: "default" | "sm" | "icon";
  className?: string;
};

/** Opens a WhatsApp conversation (wa.me), optionally with a pre-filled message. */
export function WhatsAppLink({
  phone,
  label,
  message,
  size = "default",
  className,
}: WhatsAppLinkProps) {
  const query = message ? `?text=${encodeURIComponent(message)}` : "";
  return (
    <a
      href={`https://wa.me/${whatsappDigits(phone)}${query}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={size === "icon" ? label : undefined}
      className={cn(buttonVariants({ variant: "whatsapp", size }), className)}
    >
      <MessageCircle aria-hidden="true" />
      {size === "icon" ? null : label}
    </a>
  );
}
