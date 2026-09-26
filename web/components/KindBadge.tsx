import { KIND_HELP, KIND_LABEL } from "@/lib/kinds";
import type { TxKind } from "@/lib/types";

const STYLE: Record<TxKind, string> = {
  coinbase: "text-warn border-warn/30 bg-warn/10",
  transparent: "text-transparent-pool border-transparent-pool/30 bg-transparent-pool/10",
  shielding: "text-sapling border-sapling/30 bg-sapling/10",
  deshielding: "text-orchard border-orchard/30 bg-orchard/10",
  shielded: "text-ironwood border-ironwood/30 bg-ironwood/10",
  migration: "text-ironwood border-ironwood/40 bg-gradient-to-r from-orchard/15 to-ironwood/15",
  mixed: "text-muted border-border-strong bg-surface-2",
};

export function KindBadge({ kind }: { kind: TxKind }) {
  return (
    <span
      title={KIND_HELP[kind]}
      className={`inline-flex items-center whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium ${STYLE[kind]}`}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}
