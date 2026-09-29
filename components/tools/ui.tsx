import type { ReactNode } from "react";
import { CopyButton } from "./CopyButton";

export function PageHead({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="text-xs font-medium uppercase tracking-wide text-accent">{eyebrow}</p>}
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-muted">{children}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`panel ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <h2 className="font-medium">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between gap-2 text-xs font-medium text-muted">
        {label}
        {hint && <span className="font-normal text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/** Label / value rows. A value given as a string gets a copy button. */
type Row = [ReactNode, ReactNode] | [ReactNode, ReactNode, string];

export function Rows({ rows }: { rows: (Row | null | false | undefined | "")[] }) {
  return (
    <dl className="divide-y divide-border">
      {rows.filter((r): r is Row => !!r).map(([k, v, copy], i) => (
        <div key={i} className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[200px_1fr] sm:gap-4">
          <dt className="text-muted">{k}</dt>
          <dd className="num flex min-w-0 items-start gap-2 break-all">
            <span className="min-w-0">{v}</span>
            {copy && <CopyButton text={copy} />}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-bad/30 bg-bad/10 px-3 py-2 text-bad">{children}</p>;
}

export function Tag({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" }) {
  const cls = {
    neutral: "border-border-strong bg-surface-2 text-text",
    good: "border-good/30 bg-good-bg text-good",
    warn: "border-accent/40 bg-accent/10 text-accent",
  }[tone];
  return <span className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Code({ children }: { children: string }) {
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg border border-border bg-bg p-3 pr-12 font-mono text-[0.8rem] leading-relaxed text-muted">{children}</pre>
      <span className="absolute right-2 top-2">
        <CopyButton text={children} />
      </span>
    </div>
  );
}
