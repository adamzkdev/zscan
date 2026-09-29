"use client";

import { useMemo, useState } from "react";
import { fromBase64Url, fromHex, MEMO_BYTES, readMemo, toBase64Url, toHex, utf8 } from "@/lib/tools/memo";
import { Field, Panel, Rows } from "./ui";

function Encode() {
  const [text, setText] = useState("");
  const bytes = useMemo(() => utf8(text), [text]);
  const field = useMemo(() => {
    const f = new Uint8Array(MEMO_BYTES);
    f.set(bytes.slice(0, MEMO_BYTES));
    return f;
  }, [bytes]);
  const over = bytes.length > MEMO_BYTES;
  return (
    <div className="space-y-4">
      <Field label="Text" hint={<span className={over ? "text-bad" : ""}>{bytes.length}/{MEMO_BYTES} bytes (UTF-8)</span>}>
        <textarea className="input h-28 !font-sans !text-sm" value={text} onChange={(e) => setText(e.target.value)} placeholder="Thanks for the coffee ☕" />
      </Field>
      {over && <p className="text-bad">Too long: a memo holds 512 bytes. Emoji and accented letters take 2–4 bytes each.</p>}
      {text && !over && (
        <Panel>
          <Rows
            rows={[
              ["Hex", <span key="h" className="font-mono text-xs">{toHex(bytes)}</span>, toHex(bytes)],
              ["base64url (ZIP-321 memo=)", <span key="b" className="font-mono text-xs">{toBase64Url(bytes)}</span>, toBase64Url(bytes)],
              ["Full memo field (512 bytes, zero-padded)", <span key="f" className="font-mono text-xs text-muted">{toHex(field).replace(/(00)+$/, "…00")}</span>, toHex(field)],
            ]}
          />
        </Panel>
      )}
    </div>
  );
}

function Decode() {
  const [input, setInput] = useState("");
  const decoded = useMemo((): { error: string } | { bytes: Uint8Array; memo: ReturnType<typeof readMemo> } | null => {
    const s = input.trim();
    if (!s) return null;
    const bytes = /^(0x)?[0-9a-f\s]+$/i.test(s) ? fromHex(s) : fromBase64Url(s);
    if (!bytes) return { error: "Not hex or base64url" };
    if (bytes.length > MEMO_BYTES) return { error: `${bytes.length} bytes: a memo holds at most 512` };
    return { bytes, memo: readMemo(bytes) };
  }, [input]);
  return (
    <div className="space-y-4">
      <Field label="Memo bytes" hint="hex or base64url">
        <textarea className="input h-28" value={input} onChange={(e) => setInput(e.target.value)} placeholder="5468616e6b73… or VGhhbmtz…" spellCheck={false} />
      </Field>
      {decoded && "error" in decoded && <p className="text-bad">{decoded.error}</p>}
      {decoded && "memo" in decoded && (
        <Panel>
          <Rows
            rows={[
              ["Type", decoded.memo.kind === "text" ? "Text (UTF-8)" : decoded.memo.kind === "empty" ? "No memo (0xF6)" : "Arbitrary data (first byte > 0xF4)"],
              decoded.memo.kind === "text" && ["Text", <span key="t" className="whitespace-pre-wrap font-sans">{decoded.memo.text}</span>, decoded.memo.text ?? ""],
              ["Length", `${decoded.bytes.length} bytes`],
            ]}
          />
        </Panel>
      )}
    </div>
  );
}

export function MemoTool() {
  const [tab, setTab] = useState<"encode" | "decode">("encode");
  return (
    <div className="space-y-4">
      <div className="seg" role="tablist">
        <button role="tab" aria-selected={tab === "encode"} onClick={() => setTab("encode")}>
          Text → bytes
        </button>
        <button role="tab" aria-selected={tab === "decode"} onClick={() => setTab("decode")}>
          Bytes → text
        </button>
      </div>
      <div className="panel p-4">{tab === "encode" ? <Encode /> : <Decode />}</div>
    </div>
  );
}
