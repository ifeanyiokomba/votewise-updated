import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("vw-eyebrow", className)}>{children}</span>;
}

export function Dot() {
  return <span className="text-accent">.</span>;
}

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3", align === "center" && "items-center text-center", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 className="vw-display text-3xl md:text-4xl tracking-tight">
        {title}
        <Dot />
      </h2>
      {subtitle && (
        <p className="text-muted-foreground text-base md:text-lg max-w-2xl leading-relaxed">
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function Stat({ value, label, sub }: { value: ReactNode; label: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="vw-stat text-3xl md:text-4xl">{value}</div>
      <div className="text-sm font-medium text-foreground">{label}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function PageLoader({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
      <Spinner className="size-6 text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon,
  action,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      {icon && <div className="text-muted-foreground">{icon}</div>}
      <h3 className="vw-display text-xl">{title}</h3>
      {description && <p className="max-w-md text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, action }: { message: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="size-10 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
        !
      </div>
      <h3 className="vw-display text-xl">Something went wrong</h3>
      <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      {action}
    </div>
  );
}
