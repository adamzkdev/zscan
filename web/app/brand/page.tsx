import type { Metadata } from "next";
import Image from "next/image";
import { Card, PageTitle } from "@/components/ui";

export const metadata: Metadata = {
  title: "Media Kit",
  description: "ZScan logos and icons, all square, in SVG and PNG up to 2048 px.",
};

const B = "/brand";
const SIZES = [512, 1024, 2048];

type Asset = {
  file: string;
  name: string;
  use: string;
  /// Background of the preview tile, for the transparent files.
  tile: "light" | "dark" | "none";
};

const ASSETS: Asset[] = [
  { file: "zscan-icon", name: "Icon", use: "Profile pictures, app icons", tile: "none" },
  { file: "zscan-logo-navy", name: "Logo on navy", use: "Thumbnails, cover images", tile: "none" },
  { file: "zscan-icon-light", name: "Icon, light", use: "Light profile pictures", tile: "none" },
  { file: "zscan-logo-light", name: "Logo on white", use: "Documents, light pages", tile: "none" },
  { file: "zscan-logo", name: "Logo, transparent", use: "On light backgrounds", tile: "light" },
  { file: "zscan-logo-white", name: "Logo, transparent white", use: "On dark backgrounds", tile: "dark" },
  { file: "zscan-mark", name: "Mark, transparent", use: "On light backgrounds", tile: "light" },
  { file: "zscan-mark-white", name: "Mark, transparent white", use: "On dark backgrounds", tile: "dark" },
];

function Download({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      className="inline-flex items-center rounded-md border border-border px-2 py-0.5 text-xs text-text hover:border-link hover:text-link"
    >
      {label}
    </a>
  );
}

export default function BrandPage() {
  return (
    <div className="space-y-4">
      <PageTitle title="Media Kit">Square ZScan logos and icons for articles, videos, profiles and integrations.</PageTitle>

      <div className="flex flex-wrap items-center gap-3">
        <a
          href={`${B}/zscan-media-kit.zip`}
          download
          className="inline-flex items-center gap-2 rounded-lg bg-link px-4 py-2 text-sm font-medium text-white hover:bg-link-hover"
        >
          ⤓ Download everything (ZIP)
        </a>
        <span className="text-sm text-muted">8 files, each as SVG and PNG at 512, 1024 and 2048 px.</span>
      </div>

      <Card title="Logos">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {ASSETS.map((a) => (
            <div key={a.file} className="space-y-2.5">
              <div
                className={`aspect-square overflow-hidden rounded-lg border border-border ${
                  a.tile === "dark" ? "hero-band" : a.tile === "light" ? "bg-white" : ""
                }`}
              >
                <Image src={`${B}/${a.file}.svg`} alt={`ZScan ${a.name.toLowerCase()}`} width={512} height={512} unoptimized className="size-full" />
              </div>
              <div>
                <p className="text-sm font-medium">{a.name}</p>
                <p className="text-xs text-muted">{a.use}</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Download href={`${B}/${a.file}.svg`} label="SVG" />
                {SIZES.map((s) => (
                  <Download key={s} href={`${B}/png/${a.file}-${s}.png`} label={`PNG ${s}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
