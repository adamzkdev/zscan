import { ImageResponse } from "next/og";
import { api } from "@/lib/api";
import type { Migration } from "@/lib/types";

export const alt = "Zcash Ironwood migration tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Fresh numbers every time the card is fetched.
export const dynamic = "force-dynamic";

const fmt = (zat: number) => Math.round(zat / 1e8).toLocaleString("en-US");

export default async function Image() {
  const m = await api<Migration>("/v1/ironwood/migration");
  const share = m.ironwood_now / (m.ironwood_now + m.orchard_now);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 64,
          background: "linear-gradient(135deg, #0a0c0b 0%, #0d1f18 60%, #1d1a0c 100%)",
          color: "#e7ece8",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
          <span style={{ fontWeight: 700 }}>
            Z<span style={{ color: "#f4b728" }}>Scan</span>
          </span>
          <span style={{ color: "#8b978f" }}>Ironwood migration tracker</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontSize: 34, color: "#8b978f" }}>Share of Orchard + Ironwood value already in Ironwood</span>
          <span style={{ fontSize: 180, fontWeight: 700, color: "#3ddc97", lineHeight: 1.05 }}>
            {(share * 100).toFixed(1)}%
          </span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", height: 26, borderRadius: 13, overflow: "hidden", background: "#171c19" }}>
            <div style={{ width: `${share * 100}%`, background: "#199e70" }} />
            <div style={{ flex: 1, marginLeft: 4, background: "#d95926" }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 30 }}>
            <span>{fmt(m.ironwood_now)} ZEC in Ironwood</span>
            <span style={{ color: "#8b978f" }}>{fmt(m.orchard_now)} ZEC left in Orchard</span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
