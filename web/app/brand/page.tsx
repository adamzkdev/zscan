import type { Metadata } from "next";
import Image from "next/image";
import { CopyButton } from "@/components/Hash";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Media Kit",
  description: "ZScan logos, mark, profile picture and X header, in SVG and PNG.",
};

const B = "/brand";

type Asset = {
  name: string;
  preview: string;
  dark: boolean;
  width: number;
  height: number;
  files: { label: string; href: string }[];
};

const LOGOS: Asset[] = [
  {
    name: "Logo",
    preview: `${B}/zscan-logo.svg`,
    dark: false,
    width: 408,
    height: 120,
    files: [
      { label: "SVG", href: `${B}/zscan-logo.svg` },
      { label: "PNG", href: `${B}/png/zscan-logo@2x.png` },
    ],
  },
  {
    name: "Logo, white",
    preview: `${B}/zscan-logo-white.svg`,
    dark: true,
    width: 408,
    height: 120,
    files: [
      { label: "SVG", href: `${B}/zscan-logo-white.svg` },
      { label: "PNG", href: `${B}/png/zscan-logo-white@2x.png` },
    ],
  },
  {
    name: "Mark",
    preview: `${B}/zscan-mark.svg`,
    dark: false,
    width: 120,
    height: 120,
    files: [
      { label: "SVG", href: `${B}/zscan-mark.svg` },
      { label: "PNG 512", href: `${B}/png/zscan-mark-512.png` },
      { label: "PNG 1024", href: `${B}/png/zscan-mark-1024.png` },
    ],
  },
  {
    name: "Mark, white",
    preview: `${B}/zscan-mark-white.svg`,
    dark: true,
    width: 120,
    height: 120,
    files: [
      { label: "SVG", href: `${B}/zscan-mark-white.svg` },
      { label: "PNG 512", href: `${B}/png/zscan-mark-white-512.png` },
      { label: "PNG 1024", href: `${B}/png/zscan-mark-white-1024.png` },
    ],
  },
];

const COLORS = [
  { name: "Zcash gold", hex: "#f4b728", role: "Shield, “Scan”, accents" },
  { name: "Ink", hex: "#212529", role: "“Z” on light backgrounds" },
  { name: "Navy", hex: "#21325b", role: "Backgrounds" },
  { name: "Navy light", hex: "#2d4476", role: "Background gradient" },
  { name: "Ironwood", hex: "#1baf7a", role: "Scan line, privacy accent" },
  { name: "Sapling", hex: "#2a78d6", role: "Pool color" },
  { name: "Orchard", hex: "#eb6834", role: "Pool color" },
];

function Downloads({ files }: { files: Asset["files"] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {files.map((f) => (
        <a
          key={f.href}
          href={f.href}
          download
          className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-text hover:border-link hover:text-link"
        >
          ⤓ {f.label}
        </a>
      ))}
    </div>
  );
}

function Tile({ dark, children, tall = false }: { dark: boolean; children: React.ReactNode; tall?: boolean }) {
  return (
    <div
      className={`grid place-items-center rounded-lg border border-border p-6 ${tall ? "min-h-56" : "min-h-40"} ${
        dark ? "hero-band" : "bg-white"
      }`}
    >
      {children}
    </div>
  );
}

export default function BrandPage() {
  return (
    <div className="space-y-4">
      <PageTitle title="Media Kit">
        Logos and social assets for articles, videos and integrations. Please don&apos;t alter the colors or proportions.
      </PageTitle>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`${B}/zscan-media-kit.zip`}
          download
          className="inline-flex items-center gap-2 rounded-lg bg-link px-4 py-2 text-sm font-medium text-white hover:bg-link-hover"
        >
          ⤓ Download everything (ZIP)
        </a>
        <span className="text-sm text-muted">SVG and PNG, with a README on usage.</span>
      </div>

      <Card title="Logos">
        <div className="grid gap-4 md:grid-cols-2">
          {LOGOS.map((a) => (
            <div key={a.name} className="space-y-3">
              <Tile dark={a.dark}>
                <Image src={a.preview} alt={`ZScan ${a.name.toLowerCase()}`} width={a.width} height={a.height} unoptimized className={a.width === a.height ? "size-24" : "h-auto w-full max-w-sm"} />
              </Tile>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium">{a.name}</span>
                <Downloads files={a.files} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Social">
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <div className="space-y-3">
            <Image src={`${B}/png/zscan-avatar-400.png`} alt="ZScan profile picture" width={400} height={400} unoptimized className="aspect-square w-full rounded-full border border-border" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">Profile picture</span>
              <Downloads
                files={[
                  { label: "SVG", href: `${B}/zscan-avatar.svg` },
                  { label: "400", href: `${B}/png/zscan-avatar-400.png` },
                  { label: "1024", href: `${B}/png/zscan-avatar-1024.png` },
                ]}
              />
            </div>
          </div>
          <div className="space-y-3">
            <Image src={`${B}/png/twitter-banner-1500.png`} alt="ZScan X header" width={1500} height={500} unoptimized className="h-auto w-full rounded-lg border border-border" />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">
                X / Twitter header <span className="text-muted">1500×500</span>
              </span>
              <Downloads
                files={[
                  { label: "SVG", href: `${B}/twitter-banner.svg` },
                  { label: "PNG", href: `${B}/png/twitter-banner-1500.png` },
                  { label: "PNG @2x", href: `${B}/png/twitter-banner-3000.png` },
                ]}
              />
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card title="Colors">
          <ul className="grid gap-3 sm:grid-cols-2">
            {COLORS.map((c) => (
              <li key={c.hex} className="flex items-center gap-3">
                <span className="size-10 shrink-0 rounded-lg border border-border" style={{ background: c.hex }} />
                <span className="min-w-0 text-sm">
                  <span className="flex items-center gap-1.5 font-medium">
                    {c.name} <span className="font-mono text-xs text-muted">{c.hex}</span>
                    <CopyButton value={c.hex} />
                  </span>
                  <span className="block text-xs text-muted">{c.role}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-muted">
            Typeface: <span className="text-text">Roboto</span> (Bold for the wordmark). Tagline:{" "}
            <span className="text-text">See what&apos;s public. Respect what&apos;s private.</span>
          </p>
        </Card>
        <Card title="Usage">
          <ul className="space-y-2 text-sm">
            <li>✓ Use the white versions on dark or photographic backgrounds.</li>
            <li>✓ Keep clear space around the logo of at least the height of the “Z”.</li>
            <li>✓ Write the name as “ZScan”: capital Z, capital S.</li>
            <li className="text-muted">✗ Don&apos;t recolor, stretch, rotate or outline the logo.</li>
            <li className="text-muted">✗ Don&apos;t imply ZScan endorses a product or project.</li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
