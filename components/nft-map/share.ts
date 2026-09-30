import { STAGE } from "./draw";

export interface Poster {
  title: string;
  subtitle: string;
  legend: { color: string; label: string; ring?: boolean; box?: boolean }[];
  /** Draws the map into a width × height area. */
  render: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
}

/** 1600 × 900: the size X shows in full in a timeline. */
export const POSTER = { width: 1600, height: 900, header: 92, footer: 58 };

export function poster(p: Poster): Promise<Blob | null> {
  const c = document.createElement("canvas");
  c.width = POSTER.width;
  c.height = POSTER.height;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = STAGE.bg;
  ctx.fillRect(0, 0, c.width, c.height);

  const mapH = POSTER.height - POSTER.header - POSTER.footer;
  ctx.save();
  ctx.translate(0, POSTER.header);
  ctx.beginPath();
  ctx.rect(0, 0, POSTER.width, mapH);
  ctx.clip();
  p.render(ctx, POSTER.width, mapH);
  ctx.restore();

  // Header: collection and view, brand on the right.
  const pad = 40;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = STAGE.text;
  ctx.font = "700 34px Inter, system-ui, sans-serif";
  ctx.fillText(p.title, pad, 50);
  ctx.fillStyle = STAGE.muted;
  ctx.font = "18px Inter, system-ui, sans-serif";
  ctx.fillText(p.subtitle, pad, 78);
  ctx.textAlign = "right";
  ctx.fillStyle = STAGE.accent;
  ctx.font = "800 30px Inter, system-ui, sans-serif";
  ctx.fillText("ZScan", POSTER.width - pad, 50);
  ctx.fillStyle = STAGE.muted;
  ctx.font = "16px Inter, system-ui, sans-serif";
  ctx.fillText("zscan.cash · Zcash NFT map", POSTER.width - pad, 76);

  // Footer: legend, then source and date.
  const fy = POSTER.height - POSTER.footer / 2;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.font = "15px Inter, system-ui, sans-serif";
  let x = pad;
  for (const l of p.legend) {
    if (l.ring && l.box) {
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 2.5;
      ctx.strokeRect(x + 1, fy - 6, 12, 12);
    } else if (l.ring) {
      ctx.strokeStyle = l.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x + 7, fy, 7, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = l.color;
      ctx.beginPath();
      ctx.roundRect(x, fy - 7, 14, 14, 3);
      ctx.fill();
    }
    ctx.fillStyle = STAGE.text;
    ctx.fillText(l.label, x + 22, fy);
    x += 22 + ctx.measureText(l.label).width + 26;
  }
  ctx.textAlign = "right";
  ctx.fillStyle = STAGE.muted;
  ctx.fillText(`Data: marketplace via ZScan · ${new Date().toISOString().slice(0, 10)}`, POSTER.width - pad, fy);

  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Opens a post on X with the text and link; X can't take a picture through a link. */
export function tweet(text: string, url: string) {
  const u = new URL("https://x.com/intent/tweet");
  u.searchParams.set("text", text);
  u.searchParams.set("url", url);
  window.open(u, "_blank", "noopener,noreferrer");
}

/** Shares the picture itself through the system share sheet when the device supports it. */
export async function shareFile(blob: Blob, name: string, text: string, url: string): Promise<boolean> {
  const file = new File([blob], name, { type: "image/png" });
  const data = { files: [file], text, url };
  if (typeof navigator.canShare !== "function" || !navigator.canShare(data)) return false;
  try {
    await navigator.share(data);
  } catch {
    // Dismissed.
  }
  return true;
}
