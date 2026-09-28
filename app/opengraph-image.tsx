import { ImageResponse } from "next/og";

export const alt = "ZScan: Zcash explorer and data API";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "linear-gradient(135deg, #0a0c0b 0%, #0d1f18 60%, #1d1a0c 100%)",
          color: "#e7ece8",
          fontFamily: "sans-serif",
        }}
      >
        <span style={{ fontSize: 96, fontWeight: 700 }}>
          Z<span style={{ color: "#f4b728" }}>Scan</span>
        </span>
        <span style={{ fontSize: 48, marginTop: 16 }}>
          See what&apos;s public. <span style={{ color: "#3ddc97", marginLeft: 14 }}>Respect what&apos;s private.</span>
        </span>
        <span style={{ fontSize: 30, marginTop: 28, color: "#8b978f" }}>
          Zcash explorer · shielded pools · Ironwood tracker · free API
        </span>
      </div>
    ),
    size,
  );
}
