import type { Metadata } from "next";
import Link from "next/link";
import { Card, Empty, PageTitle, Pill, Stat, tableHead, td, th } from "@/components/ui";
import { int } from "@/lib/format";
import { getZips, LIVE, STATUS_ORDER, statusTone, type Zip } from "@/lib/zips";

export const metadata: Metadata = {
  title: "Zcash Improvement Proposals (ZIPs)",
  description: "Every Zcash Improvement Proposal with its status, and where to watch it live on chain.",
};

export default async function ZipsPage(props: PageProps<"/zips">) {
  const sp = await props.searchParams;
  const pick = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);
  const status = pick(sp.status);
  const q = pick(sp.q)?.trim().toLowerCase();

  let zips: Zip[] = [];
  let failed = false;
  try {
    zips = await getZips();
  } catch {
    failed = true;
  }

  const count = (s: string) => zips.filter((z) => z.status === s).length;
  const shown = zips.filter(
    (z) =>
      (!status || z.status === status) &&
      (!q || `${z.number ?? ""} ${z.title} ${z.owners.join(" ")}`.toLowerCase().includes(q)),
  );
  const href = (patch: Record<string, string | undefined>) => {
    const next = { status, q: pick(sp.q), ...patch };
    const qs = new URLSearchParams(Object.entries(next).filter((e): e is [string, string] => !!e[1]));
    return qs.size ? `/zips?${qs}` : "/zips";
  };
  const chip = (active: boolean) =>
    `rounded-md border px-3 py-1 text-sm transition-colors ${
      active ? "border-link bg-link text-white" : "border-border bg-surface text-text hover:text-link"
    }`;

  return (
    <div className="space-y-4">
      <PageTitle title="Zcash Improvement Proposals">
        Every ZIP from{" "}
        <a href="https://github.com/zcash/zips" className="text-link hover:text-link-hover">
          github.com/zcash/zips
        </a>
        , refreshed daily. <Pill tone="info">Live on ZScan</Pill> marks the ones you can watch at work on chain.
      </PageTitle>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Proposals" value={int(zips.length)} />
        <Stat label="Final / Active" value={int(count("Final") + count("Active"))} />
        <Stat label="Draft / Proposed" value={int(count("Draft") + count("Proposed"))} />
        <Stat label="Live on ZScan" value={int(zips.filter((z) => z.number != null && LIVE[z.number]).length)} />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Link href={href({ status: undefined })} className={chip(!status)}>
          All
        </Link>
        {STATUS_ORDER.filter(count).map((s) => (
          <Link key={s} href={href({ status: s })} className={chip(status === s)}>
            {s} <span className="opacity-70">{count(s)}</span>
          </Link>
        ))}
      </div>

      <Card
        pad={false}
        title={<span className="text-sm font-normal text-muted">{shown.length} proposals</span>}
        action={
          <form action="/zips" className="flex gap-2">
            {status && <input type="hidden" name="status" value={status} />}
            <input
              name="q"
              defaultValue={pick(sp.q)}
              placeholder="Number, title or author"
              className="w-48 rounded-md border border-border bg-surface px-3 py-1 text-sm sm:w-64"
            />
          </form>
        }
      >
        {shown.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className={tableHead}>
                <tr>
                  <th className={th}>ZIP</th>
                  <th className={th}>Title</th>
                  <th className={th}>Status</th>
                  <th className={th}>Category</th>
                  <th className={th}>Owners</th>
                  <th className={th}>Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shown.map((z) => {
                  const live = z.number != null ? LIVE[z.number] : undefined;
                  return (
                    <tr key={z.slug} className="hover:bg-surface-2">
                      <td className={`${td} num`}>
                        <a href={z.url} className="text-link hover:text-link-hover">
                          {z.number != null ? z.number : "Draft"}
                        </a>
                      </td>
                      <td className={`${td} whitespace-normal`}>
                        <a href={z.url} className="text-text hover:text-link">
                          {z.title}
                        </a>
                        {live && (
                          <Link href={live.href} className="ml-2 inline-block align-middle">
                            <Pill tone="info">Live · {live.label}</Pill>
                          </Link>
                        )}
                      </td>
                      <td className={td}>
                        <span title={z.statusDetail ?? undefined}>
                          <Pill tone={statusTone(z.status)}>
                            {z.status}
                            {z.statusDetail && " *"}
                          </Pill>
                        </span>
                      </td>
                      <td className={`${td} text-xs text-muted`}>{z.categories.join(" · ") || "—"}</td>
                      <td className={`${td} max-w-[240px] truncate text-xs text-muted`} title={z.owners.join(", ")}>
                        {z.owners.join(", ") || "—"}
                      </td>
                      <td className={`${td} num text-xs text-muted`}>{z.created ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty>{failed ? "Could not reach github.com/zcash/zips. Try again in a minute." : "No proposal matches these filters."}</Empty>
        )}
      </Card>
    </div>
  );
}
