import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "border-sky-200/30 bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_42%,#bfdbfe_100%)] text-[#06111b] shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_14px_28px_rgba(56,189,248,0.18),0_8px_18px_rgba(0,0,0,0.22)] hover:-translate-y-0.5 hover:brightness-[1.03] active:translate-y-px active:scale-[0.995] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_5px_12px_rgba(0,0,0,0.24)]",
  secondary:
    "border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.075)_0%,rgba(255,255,255,0.03)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_10px_24px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.08] active:translate-y-px active:scale-[0.995] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_10px_rgba(0,0,0,0.22)]",
  ghost:
    "border-transparent bg-transparent text-gray-300 shadow-none hover:border-white/10 hover:bg-white/[0.05] hover:text-white active:translate-y-px"
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-9 rounded-xl px-3.5 text-[12px]",
  md: "h-11 rounded-[14px] px-4 text-[13px]",
  lg: "h-12 rounded-[15px] px-5 text-[13px]"
};

export function Button({ children, className, variant = "primary", size = "md", type = "button", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center gap-2 border font-semibold tracking-[-0.01em] transition duration-200 ease-out will-change-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-55",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
