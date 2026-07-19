// Shared modal chrome: portalled backdrop + card + header (title/subtitle/icon/close) + footer slot.
import { MouseEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-3xl",
} as const;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  icon?: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof SIZE_CLASSES;
  children: ReactNode;
  bodyClassName?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  footer,
  size = "md",
  children,
  bodyClassName,
}: ModalProps) {
  if (!isOpen) return null;

  const stopPropagation = (e: MouseEvent) => e.stopPropagation();

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-card border border-border/50 rounded-xl shadow-2xl w-full max-h-[90vh] overflow-y-auto my-8",
          SIZE_CLASSES[size]
        )}
        onClick={stopPropagation}
      >
        <div className="sticky top-0 bg-card flex items-center justify-between px-4 py-3 border-b border-border/50 z-10">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={cn("p-4", bodyClassName)}>{children}</div>

        {footer && (
          <div className="sticky bottom-0 bg-card flex items-center justify-end gap-2 px-4 py-3 border-t border-border/50">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
