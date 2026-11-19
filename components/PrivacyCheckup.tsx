"use client";

import { useMemo } from "react";
import { zec, short } from "@/lib/format";
import { checkup, type CheckupInput, type Finding, type Level, type Segment } from "@/lib/privacy-checkup";
import { useAddressesHidden } from "./PrivacyScreen";
import { Card, Pill } from "./ui";

const LEVEL: Record<Level, { label: string; tone: "good" | "warn" | "bad"; summary: string }> = {
  private: { label: "Private", tone: "good", summary: "Fully shielded: only the fee and the pools used are visible." },
  partial: { label: "Partly public", tone: "warn", summary: "Some of this transaction is shielded, some of it is visible to anyone." },
  public: { label: "Public", tone: "bad", summary: "Nothing here is shielded: amounts and addresses are visible to anyone." },
};

const DOT: Record<Finding["tone"], string> = { public: "bg-bad", warn: "bg-warn", ok: "bg-good" };

/** What this transaction reveals on-chain, worked out in the browser from the page's own data. */
export function PrivacyCheckup({ input }: { input: CheckupInput }) {
  const c = useMemo(() => checkup(input), [input]);
  const level = LEVEL[c.level];
  return (
    <Card
      title={
        <span className="flex flex-wrap items-center gap-2">
          Privacy Checkup <Pill tone={level.tone}>{level.label}</Pill>
        </span>
      }
      action={<span className="text-xs text-muted">Self-audit, computed in your browser from this page&apos;s data</span>}
    >
      <p className="mb-3 text-sm text-text">{level.summary}</p>
      <div className="grid gap-x-8 gap-y-4 text-sm md:grid-cols-[3fr_2fr]">
        <div>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">What it reveals</h3>
          <ul className="space-y-1.5">
            {c.findings.map((f, i) => (
              <li key={i} className="flex gap-2.5">
                <span className={`mt-[0.45rem] size-1.5 shrink-0 rounded-full ${DOT[f.tone]}`} aria-hidden />
                <span className="min-w-0 break-words text-muted">
                  <Text segments={f.text} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted">Advice</h3>
          <ul className="list-disc space-y-1.5 pl-4 text-muted marker:text-faint">
            {c.advice.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function Text({ segments }: { segments: Segment[] }) {
  const addressesHidden = useAddressesHidden();
  return segments.map((s, i) =>
    typeof s === "string" ? (
      s
    ) : "zat" in s ? (
      <span key={i} className="amt num text-text">
        {zec(s.zat)}
      </span>
    ) : (
      <span key={i} className="addr font-mono text-text" title={addressesHidden ? undefined : s.addr}>
        {short(s.addr, 6, 4)}
      </span>
    ),
  );
}
