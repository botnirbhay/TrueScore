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
    "border-white/10 bg-[linear-gradient(180deg,#f5f5f5_0%,#d4d4d8_100%)] text-[#09090b] shadow-[inset_0_1px_0_rgba(255,255,255,0.88),0_10px_24px_rgba(0,0,0,0.34)] hover:brightness-[1.03] active:translate-y-px active:shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_4px_12px_rgba(0,0,0,0.28)]",
  secondary:
    "border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.03)_100%)] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_10px_24px_rgba(0,0,0,0.24)] hover:border-white/15 hover:bg-white/[0.08] active:translate-y-px active:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_4px_10px_rgba(0,0,0,0.22)]",
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
        "inline-flex select-none items-center justify-center gap-2 border font-semibold tracking-[-0.01em] transition duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#08090c] disabled:pointer-events-none disabled:translate-y-0 disabled:opacity-55",
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
