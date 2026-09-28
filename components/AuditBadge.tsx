import Link from "next/link";
import type { AuditSummary } from "@/lib/types";

/** Public supply-audit status: green when every reconciliation matched to the zatoshi. */
export function AuditBadge({ audit, onDark = false }: { audit: AuditSummary; onDark?: boolean }) {
  const ok = audit.failed === 0 && audit.checks > 0;
  const color = ok ? (onDark ? "#3ddc97" : "var(--good)") : "var(--bad)";
  return (
    <Link
      href="/supply#audit"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${onDark ? "border-white/15 bg-white/5 text-white/80" : "border-border bg-surface text-text"}`}
      title="Every node snapshot is reconciled against block-by-block decoded pool changes"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden>
        <path d="M12 2.5 20 6v6c0 5-3.4 8.4-8 9.5C7.4 20.4 4 17 4 12V6l8-3.5Z" fill="none" stroke={color} strokeWidth="2.2" />
        {ok && <path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />}
      </svg>
      Supply audit: <span style={{ color }}>{ok ? `${audit.checks}/${audit.checks} matched` : `${audit.failed} mismatch${audit.failed === 1 ? "" : "es"}`}</span>
    </Link>
  );
}
