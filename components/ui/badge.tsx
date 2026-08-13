import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    variant?: "default" | "secondary" | "outline" | "success" | "warning" | "muted";
  }
>(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
      variant === "default" && "border-transparent bg-primary text-primary-foreground",
      variant === "secondary" && "border-transparent bg-accent text-accent-foreground",
      variant === "outline" && "border-border bg-card text-muted-foreground",
      variant === "success" && "border-transparent bg-emerald-50 text-emerald-700",
      variant === "warning" && "border-transparent bg-amber-50 text-amber-700",
      variant === "muted" && "border-transparent bg-muted text-muted-foreground",
      className,
    )}
    {...props}
  />
));
Badge.displayName = "Badge";

export { Badge };
