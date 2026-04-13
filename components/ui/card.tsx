import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(16,18,24,0.96)_0%,rgba(11,13,18,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_18px_40px_rgba(0,0,0,0.24)]",
        className
      )}
      {...props}
    />
  );
}
