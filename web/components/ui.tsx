import type { ReactNode } from "react";

export { Zec, ZecPill } from "./Zec";

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 border-b border-border pb-4">
      <h1 className="flex flex-wrap items-baseline gap-2 text-xl font-medium">
        {title}
        {eyebrow && <span className="text-sm font-normal text-muted">{eyebrow}</span>}
      </h1>
      {children && <div className="mt-1.5 max-w-4xl text-sm text-muted">{children}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  footer,
  className = "",
  pad = true,
}: {
  title?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={`card overflow-hidden ${className}`}>
      {title && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-border px-4 py-3.5">
          <h2 className="text-[0.95rem] font-medium">{title}</h2>
          {action}
        </div>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
      {footer && <div className="border-t border-border bg-surface-2 px-4 py-2.5 text-center">{footer}</div>}
    </section>
  );
}

export function Stat({ label, value, sub, accent }: { label: string; value: ReactNode; sub?: ReactNode; accent?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="num mt-1 text-lg font-medium" style={accent ? { color: accent } : undefined}>
        {value}
      </p>
      {sub && <p className="num mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function Help({ text }: { text: string }) {
  return (
    <span title={text} className="inline-grid size-3.5 shrink-0 cursor-help place-items-center rounded-full border border-faint text-[9px] font-semibold text-faint">
      ?
    </span>
  );
}

/** Etherscan-style label / value rows. A third element adds a help tooltip. */
export function Rows({ rows }: { rows: ([ReactNode, ReactNode] | [ReactNode, ReactNode, string] | null)[] }) {
  return (
    <dl className="divide-y divide-border">
      {rows.filter(Boolean).map((r, i) => {
        const [k, v, help] = r!;
        return (
          <div key={i} className="grid grid-cols-1 gap-1 px-4 py-3.5 text-sm md:grid-cols-[280px_1fr] md:gap-4">
            <dt className="flex items-center gap-2 text-muted">
              {help && <Help text={help} />}
              {k}:
            </dt>
            <dd className="num min-w-0 break-words">{v}</dd>
          </div>
        );
      })}
    </dl>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const cls = {
    neutral: "border-border-strong bg-surface-2 text-text",
    good: "border-good/30 bg-good-bg text-good",
    warn: "border-warn/30 bg-warn/10 text-warn",
    bad: "border-bad/30 bg-bad/10 text-bad",
    info: "border-link/30 bg-link/10 text-link",
  }[tone];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${cls}`}>{children}</span>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-4 py-10 text-center text-sm text-muted">{children}</p>;
}

export const th = "whitespace-nowrap px-4 py-3 text-left text-xs font-semibold text-text";
export const td = "whitespace-nowrap px-4 py-3.5 text-sm";
export const tableHead = "border-b border-border bg-surface-2";
