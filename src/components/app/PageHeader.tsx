import { useRouter } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  back,
  action,
}: {
  eyebrow?: string;
  title: string;
  back?: boolean;
  action?: ReactNode;
}) {
  const router = useRouter();
  return (
    <div className="flex items-end gap-3 px-4 pb-3 pt-5">
      {back && (
        <button
          onClick={() => router.history.back()}
          aria-label="Back"
          className="mb-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border bg-card hover:bg-muted"
        >
          <ArrowLeft className="size-[18px]" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="truncate text-[26px] font-extrabold leading-tight tracking-tight">{title}</h1>
      </div>
      {action}
    </div>
  );
}

export function Section({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="px-4 pt-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="eyebrow">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border bg-card text-card-foreground shadow-card ${className}`}>{children}</div>;
}
