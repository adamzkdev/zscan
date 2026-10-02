import Link from "next/link";
import { hashrate, usd } from "@/lib/format";
import { NAV } from "@/lib/nav";
import { HeaderSearch } from "./HeaderSearch";
import { GaugeIcon } from "./icons";
import { LiveRefresh } from "./LiveRefresh";
import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { ThemeToggle } from "./ThemeToggle";
import { ZecIcon } from "./ZecIcon";

export function Header({
  price,
  change,
  solps,
  height,
  network,
}: {
  price: number | null;
  change: number | null;
  solps: number | null;
  height: number | null;
  network: "mainnet" | "testnet";
}) {
  const other =
    network === "testnet"
      ? {
          label: "Mainnet",
          url: process.env.MAINNET_URL ?? "https://zscan.cash",
        }
      : {
          label: "Testnet",
          url: process.env.TESTNET_URL ?? "https://testnet.zscan.cash",
        };
  return (
    <header className="sticky top-0 z-40">
      {/* Top bar: market data, live status, search on inner pages, theme. */}
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-4 py-2 text-[0.8125rem] text-muted">
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <ZecIcon size={15} />
            {network === "testnet" ? (
              <span>Testnet coins (TAZ) have no value</span>
            ) : (
              <>
                ZEC Price:{" "}
                {price != null ? (
                  <>
                    <span className="text-link">{usd(price)}</span>
                    {change != null && (
                      <span className={change >= 0 ? "text-good" : "text-bad"}>
                        ({change >= 0 ? "+" : ""}
                        {change.toFixed(2)}%)
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </>
            )}
          </span>
          <span className="hidden items-center gap-1.5 whitespace-nowrap md:inline-flex">
            <GaugeIcon size={14} /> Hashrate:{" "}
            <span className="text-link">{hashrate(solps)}</span>
          </span>
          <LiveRefresh initialHeight={height} />
          <div className="ml-auto flex items-center gap-2">
            <HeaderSearch />
            {/* Set TESTNET_URL (or MAINNET_URL) to an empty value to hide the switch. */}
            {other.url && (
              <a
                href={other.url}
                className="hidden whitespace-nowrap rounded-lg border border-border bg-surface px-2.5 py-1 text-xs text-muted hover:text-link sm:inline-block"
                title={`Switch to ${other.label}`}
              >
                {network === "testnet" ? "Testnet" : "Mainnet"} ⇄ {other.label}
              </a>
            )}
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Main nav. */}
      <div className="border-b border-border bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center gap-6 px-4 py-2.5">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold tracking-tight"
          >
            <Logo size={30} />
            <span className="text-xl">
              Z<span className="text-accent">Scan</span>
            </span>
            {network === "testnet" && (
              <span className="rounded-md border border-warn/40 bg-warn/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-warn">
                Testnet
              </span>
            )}
          </Link>
          <nav className="ml-auto hidden items-center gap-1 text-sm lg:flex">
            {NAV.map((m) =>
              m.href ? (
                <Link
                  key={m.label}
                  href={m.href}
                  className="whitespace-nowrap rounded-md px-3 py-2 text-text hover:text-link"
                >
                  {m.label}
                </Link>
              ) : (
                <div key={m.label} className="group relative">
                  <button
                    type="button"
                    aria-haspopup="menu"
                    className="flex items-center gap-1 whitespace-nowrap rounded-md px-3 py-2 text-text group-hover:text-link group-has-[:focus-visible]:text-link"
                  >
                    {m.label}
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      className="opacity-60 transition-transform group-hover:rotate-180"
                      aria-hidden
                    >
                      <path
                        d="m6 9 6 6 6-6"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                      />
                    </svg>
                  </button>
                  <div
                    className={`invisible absolute right-0 top-full z-50 pt-1 group-hover:visible group-has-[:focus-visible]:visible ${m.groups ? "w-[860px]" : "w-56"}`}
                  >
                    <div
                      role="menu"
                      className={`overflow-hidden rounded-b-md border border-border bg-surface py-1.5 shadow-xl ${m.groups ? "grid grid-cols-4 gap-1 p-3" : ""}`}
                      style={{ borderTop: "3px solid var(--link)" }}
                    >
                      {(m.groups ?? [{ title: "", items: m.items ?? [] }]).map((g) => (
                        <ul key={g.title} role="none">
                          {g.title && (
                            <li role="none" className="px-4 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
                              {g.title}
                            </li>
                          )}
                          {g.items.map((i) => {
                            const inner = (
                              <span className="block text-sm text-text group-hover/item:text-link">
                                {i.label}
                              </span>
                            );
                            const cls =
                              "group/item block px-4 py-2 hover:bg-surface-2";
                            return (
                              <li key={i.href} role="none">
                                {i.external ? (
                                  <a role="menuitem" href={i.href} className={cls}>
                                    {inner}
                                  </a>
                                ) : (
                                  <Link role="menuitem" href={i.href} className={cls}>
                                    {inner}
                                  </Link>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            )}
          </nav>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
}
