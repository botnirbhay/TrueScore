import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(20,25,33,0.88)_0%,rgba(12,16,22,0.96)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_16px_44px_rgba(0,0,0,0.28)] backdrop-blur-xl transition duration-200 ease-out",
        className
      )}
      {...props}
    />
  );
}
